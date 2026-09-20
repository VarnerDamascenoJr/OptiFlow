import validateScenario from "./validate-scenario.js";
import { assertArray, assertObject, assertString } from "./shared/validation.js";

const schemaVersion = "sales-event-optiflow-export.v1";

const defaultOptions = {
  scenarioId: undefined,
  depotId: "event-fulfillment-center",
  depotName: "Event fulfillment center",
  operationStartTimeMinutes: 540,
  completedStatuses: ["COMPLETED"],
  costs: {
    distanceUnitCost: 3,
    lateMinutePenalty: 4,
    unassignedOrderPenalty: 750
  }
};

export function importSalesEventScenario(exportDocument, options = {}) {
  const normalizedOptions = normalizeOptions(options);

  assertObject(exportDocument, "salesEventExport");
  assertEquals(
    exportDocument.schemaVersion,
    schemaVersion,
    "salesEventExport.schemaVersion"
  );
  assertObject(exportDocument.source, "salesEventExport.source");
  assertArray(exportDocument.sales, "salesEventExport.sales");

  const eligibleSales = exportDocument.sales.filter(function filterCompletedSales(sale) {
    return normalizedOptions.completedStatuses.includes(sale.status);
  });

  if (eligibleSales.length === 0) {
    throw new Error("salesEventExport.sales must contain at least one completed sale");
  }

  const locations = [
    {
      id: normalizedOptions.depotId,
      name: normalizedOptions.depotName
    }
  ];
  const orders = [];
  const coordinatesByLocationId = {};

  coordinatesByLocationId[normalizedOptions.depotId] = {
    x: 0,
    y: 0
  };

  for (let saleIndex = 0; saleIndex < eligibleSales.length; saleIndex += 1) {
    const sale = eligibleSales[saleIndex];
    validateSale(sale, saleIndex);

    const locationId = createLocationId(sale);
    const coordinates = createDeterministicCoordinates(sale.saleId, saleIndex);
    const demand = calculateDemand(sale);
    const timeWindow = createTimeWindow(sale, saleIndex, normalizedOptions.operationStartTimeMinutes);

    locations.push({
      id: locationId,
      name: sale.customerName
    });
    coordinatesByLocationId[locationId] = coordinates;
    orders.push({
      id: "sale-" + sanitizeIdentifier(sale.saleId),
      locationId: locationId,
      demand: demand,
      serviceTimeMinutes: 5 + demand * 2,
      timeWindow: timeWindow,
      source: {
        saleId: sale.saleId,
        customerId: sale.customerId,
        correlationId: sale.correlationId || "",
        transactionId: sale.transactionId || sale.saleId,
        totalAmount: sale.totalAmount,
        issuedTicketCount: readInteger(sale.issuedTicketCount),
        checkedInTicketCount: readInteger(sale.checkedInTicketCount)
      }
    });
  }

  const maxDemand = orders.reduce(function reduceMaxDemand(currentMax, order) {
    return Math.max(currentMax, order.demand);
  }, 1);

  const scenario = {
    id: normalizedOptions.scenarioId || createScenarioId(exportDocument),
    name: "Sales event fulfillment - " + readOptionalString(exportDocument.source.eventName, "sales event"),
    operation: {
      startTimeMinutes: normalizedOptions.operationStartTimeMinutes
    },
    costs: normalizedOptions.costs,
    locations: locations,
    vehicles: createVehicles(normalizedOptions.depotId, maxDemand),
    orders: orders,
    distanceMatrix: createDistanceMatrix(locations, coordinatesByLocationId),
    source: {
      schemaVersion: exportDocument.schemaVersion,
      service: exportDocument.source.service || "sales-event-project",
      salesEventId: exportDocument.source.salesEventId || "",
      generatedAt: exportDocument.generatedAt || "",
      saleCount: exportDocument.summary ? exportDocument.summary.saleCount : exportDocument.sales.length,
      completedSaleCount: eligibleSales.length
    }
  };

  validateScenario(scenario);
  return scenario;
}

function normalizeOptions(options) {
  const merged = {
    ...defaultOptions,
    ...options,
    costs: {
      ...defaultOptions.costs,
      ...options.costs
    }
  };

  if (!Array.isArray(merged.completedStatuses) || merged.completedStatuses.length === 0) {
    throw new Error("options.completedStatuses must contain at least one status");
  }

  return merged;
}

function validateSale(sale, saleIndex) {
  const label = "salesEventExport.sales[" + saleIndex + "]";

  assertObject(sale, label);
  assertString(sale.saleId, label + ".saleId");
  assertString(sale.customerId, label + ".customerId");
  assertString(sale.customerName, label + ".customerName");
  assertString(sale.status, label + ".status");
  assertPositiveInteger(sale.totalAmount, label + ".totalAmount");
  assertArray(sale.items, label + ".items");

  if (sale.items.length === 0) {
    throw new Error(label + ".items must contain at least one item");
  }

  for (let itemIndex = 0; itemIndex < sale.items.length; itemIndex += 1) {
    const item = sale.items[itemIndex];
    const itemLabel = label + ".items[" + itemIndex + "]";

    assertObject(item, itemLabel);
    assertString(item.ticketId, itemLabel + ".ticketId");
    assertString(item.ticketName, itemLabel + ".ticketName");
    assertPositiveInteger(item.quantity, itemLabel + ".quantity");
    assertPositiveInteger(item.unitPrice, itemLabel + ".unitPrice");
  }
}

function calculateDemand(sale) {
  return sale.items.reduce(function sumQuantity(total, item) {
    return total + item.quantity;
  }, 0);
}

function createTimeWindow(sale, saleIndex, operationStartTimeMinutes) {
  const createdAt = Date.parse(sale.createdAt || "");
  const scheduledOffset = Number.isNaN(createdAt) ? saleIndex * 20 : Math.abs(Math.floor(createdAt / 60000)) % 180;
  const startMinutes = operationStartTimeMinutes + scheduledOffset;

  return {
    startMinutes: startMinutes,
    endMinutes: startMinutes + 180
  };
}

function createVehicles(depotId, maxDemand) {
  return [
    {
      id: "ticket-delivery-van-1",
      capacity: Math.max(8, maxDemand),
      startLocationId: depotId
    },
    {
      id: "ticket-delivery-van-2",
      capacity: Math.max(6, Math.ceil(maxDemand / 2)),
      startLocationId: depotId
    }
  ];
}

function createDistanceMatrix(locations, coordinatesByLocationId) {
  const matrix = {};

  for (const from of locations) {
    matrix[from.id] = {};

    for (const to of locations) {
      matrix[from.id][to.id] = calculateDistance(
        coordinatesByLocationId[from.id],
        coordinatesByLocationId[to.id]
      );
    }
  }

  return matrix;
}

function calculateDistance(from, to) {
  if (from.x === to.x && from.y === to.y) {
    return 0;
  }

  return Math.max(1, Math.round(Math.hypot(from.x - to.x, from.y - to.y)));
}

function createLocationId(sale) {
  return "customer-" + sanitizeIdentifier(sale.customerId || "unknown") + "-sale-" + sanitizeIdentifier(sale.saleId);
}

function createScenarioId(exportDocument) {
  const salesEventId = exportDocument.source.salesEventId || exportDocument.source.eventName || "sales-event";
  return "sales-event-" + sanitizeIdentifier(salesEventId) + "-fulfillment";
}

function createDeterministicCoordinates(seed, index) {
  const firstHash = hashString(seed + ":x");
  const secondHash = hashString(seed + ":y");

  return {
    x: 6 + index * 3 + (firstHash % 17),
    y: 4 + (secondHash % 19)
  };
}

function hashString(value) {
  let hash = 2166136261;

  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function sanitizeIdentifier(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-/, "")
    .replace(/-$/, "");
}

function assertEquals(value, expected, label) {
  if (value !== expected) {
    throw new Error(label + " must be " + expected);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(label + " must be a positive integer");
  }
}

function readInteger(value) {
  if (Number.isInteger(value)) {
    return value;
  }
  return 0;
}

function readOptionalString(value, fallback) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return fallback;
}
