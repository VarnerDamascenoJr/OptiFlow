import { mean, round } from "./shared/numbers.js";
import { assertArray, assertObject } from "./shared/validation.js";

const salesEventExportSchemaVersion = "sales-event-optiflow-export.v1";
const salesEventPriorsSchemaVersion = "optiflow-sales-priors.v1";
const completedStatuses = new Set(["COMPLETED"]);

export function deriveSalesEventPriors(exportDocument) {
  assertObject(exportDocument, "salesEventExport");

  if (exportDocument.schemaVersion !== salesEventExportSchemaVersion) {
    throw new Error("salesEventExport.schemaVersion must be " + salesEventExportSchemaVersion);
  }

  assertObject(exportDocument.source, "salesEventExport.source");
  assertArray(exportDocument.sales, "salesEventExport.sales");

  if (exportDocument.sales.length === 0) {
    throw new Error("salesEventExport.sales must contain at least one sale");
  }

  const completedSales = exportDocument.sales.filter(function filterCompletedSales(sale) {
    return completedStatuses.has(sale.status);
  });
  const completedDemand = completedSales.map(sumSaleQuantity);
  const period = summarizePeriod(exportDocument.sales);
  const saleCount = exportDocument.sales.length;
  const completedSaleCount = completedSales.length;
  const cancelledSaleCount = saleCount - completedSaleCount;
  const demandMean = mean(completedDemand);
  const demandStdDev = standardDeviation(completedDemand);
  const demandCoefficientOfVariation = demandMean > 0 ? demandStdDev / demandMean : 0;
  const modalDemand = mode(completedDemand);
  const demandDeviationProbability = completedDemand.length === 0
    ? 0
    : completedDemand.filter(function countDeviation(value) {
        return value !== modalDemand;
      }).length / completedDemand.length;

  return {
    schemaVersion: salesEventPriorsSchemaVersion,
    generatedAt: exportDocument.generatedAt || "",
    source: {
      service: exportDocument.source.service || "sales-event-project",
      schemaVersion: exportDocument.schemaVersion,
      salesEventId: exportDocument.source.salesEventId || "",
      eventName: exportDocument.source.eventName || "",
      eventStartsAt: exportDocument.source.eventStartsAt || "",
      filter: exportDocument.source.filter || ""
    },
    period: period,
    sampleSize: {
      saleCount: saleCount,
      completedSaleCount: completedSaleCount,
      cancelledSaleCount: cancelledSaleCount,
      completedDemandCount: completedDemand.length,
      totalItemQuantity: sumQuantities(exportDocument.sales),
      completedItemQuantity: sumQuantities(completedSales)
    },
    estimates: {
      conversionProbability: round(completedSaleCount / saleCount, 4),
      cancellationProbability: round(cancelledSaleCount / saleCount, 4),
      demandMean: round(demandMean, 4),
      demandStdDev: round(demandStdDev, 4),
      demandCoefficientOfVariation: round(demandCoefficientOfVariation, 4),
      modalDemand: modalDemand,
      demandDeviationProbability: round(demandDeviationProbability, 4)
    },
    uncertainty: {
      cancellationProbability: round(cancelledSaleCount / saleCount, 4),
      demandVariationProbability: round(demandDeviationProbability, 4),
      demandVariationRate: round(demandCoefficientOfVariation, 4)
    }
  };
}

export function normalizeSalesEventPriors(document) {
  assertObject(document, "salesEventPriors");

  if (document.schemaVersion === salesEventExportSchemaVersion) {
    return deriveSalesEventPriors(document);
  }

  if (document.schemaVersion !== salesEventPriorsSchemaVersion) {
    throw new Error(
      "salesEventPriors.schemaVersion must be " +
        salesEventPriorsSchemaVersion +
        " or " +
        salesEventExportSchemaVersion
    );
  }

  assertObject(document.source, "salesEventPriors.source");
  assertObject(document.period, "salesEventPriors.period");
  assertObject(document.sampleSize, "salesEventPriors.sampleSize");
  assertObject(document.estimates, "salesEventPriors.estimates");
  assertObject(document.uncertainty, "salesEventPriors.uncertainty");

  return {
    ...document,
    uncertainty: normalizePriorUncertainty(document.uncertainty)
  };
}

export function createSalesEventCalibration(priorsDocument) {
  if (!priorsDocument) {
    return {
      mode: "synthetic",
      source: {
        service: "OptiFlow",
        schemaVersion: "default-simulation-options"
      }
    };
  }

  const priors = normalizeSalesEventPriors(priorsDocument);

  return {
    mode: "sales-event-priors",
    source: priors.source,
    period: priors.period,
    sampleSize: priors.sampleSize,
    estimates: priors.estimates,
    appliedUncertainty: priors.uncertainty
  };
}

function normalizePriorUncertainty(uncertainty) {
  return {
    cancellationProbability: readProbability(
      uncertainty.cancellationProbability,
      "salesEventPriors.uncertainty.cancellationProbability"
    ),
    demandVariationProbability: readProbability(
      uncertainty.demandVariationProbability,
      "salesEventPriors.uncertainty.demandVariationProbability"
    ),
    demandVariationRate: readNonNegativeNumber(
      uncertainty.demandVariationRate,
      "salesEventPriors.uncertainty.demandVariationRate"
    )
  };
}

function summarizePeriod(sales) {
  const timestamps = sales
    .map(function mapCreatedAt(sale) {
      return sale.createdAt;
    })
    .filter(function keepTimestamp(value) {
      return typeof value === "string" && !Number.isNaN(Date.parse(value));
    })
    .sort();

  return {
    startedAt: timestamps[0] || "",
    endedAt: timestamps[timestamps.length - 1] || ""
  };
}

function sumQuantities(sales) {
  return sales.reduce(function sumSales(total, sale) {
    return total + sumSaleQuantity(sale);
  }, 0);
}

function sumSaleQuantity(sale) {
  assertObject(sale, "salesEventExport.sale");
  assertArray(sale.items, "salesEventExport.sale.items");

  return sale.items.reduce(function sumItems(total, item) {
    return total + readPositiveQuantity(item.quantity);
  }, 0);
}

function standardDeviation(values) {
  if (values.length === 0) {
    return 0;
  }

  const center = mean(values);
  const variance = mean(
    values.map(function mapSquaredDistance(value) {
      return Math.pow(value - center, 2);
    })
  );

  return Math.sqrt(variance);
}

function mode(values) {
  if (values.length === 0) {
    return 0;
  }

  const counts = new Map();

  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return Array.from(counts.entries()).sort(function sortModes(left, right) {
    const countDifference = right[1] - left[1];

    if (countDifference !== 0) {
      return countDifference;
    }

    return left[0] - right[0];
  })[0][0];
}

function readProbability(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(label + " must be a number between 0 and 1");
  }

  return value;
}

function readNonNegativeNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new TypeError(label + " must be a non-negative number");
  }

  return value;
}

function readPositiveQuantity(value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError("salesEventExport.sale.items.quantity must be a positive number");
  }

  return value;
}
