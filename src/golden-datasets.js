import { simulateFixedPlan } from "./simulation.js";
import { readFiniteNumber, round } from "./shared/numbers.js";

const Z_SCORE_95 = 1.96;

export function validateGoldenDatasets(document, options = {}) {
  const datasets = normalizeGoldenDatasets(document);
  const validations = [
    validateFunnel(datasets.funnel),
    validateSurvival(datasets.survival),
    validateSloBurnRate(datasets.sloBurnRate),
    validateSimulation(datasets.simulation, options)
  ];

  return {
    schemaVersion: document.schemaVersion,
    generatedAt: document.generatedAt,
    valid: validations.every(function everyValidation(validation) {
      return validation.valid;
    }),
    validations
  };
}

export function renderGoldenDatasetReport(result) {
  const lines = ["OptiFlow golden dataset validation", ""];

  for (const validation of result.validations) {
    lines.push(
      validation.dataset + ": " + (validation.valid ? "pass" : "fail"),
      "  checks=" +
        validation.checks.length +
        ", failed=" +
        validation.checks.filter(function failed(check) {
          return !check.pass;
        }).length
    );
  }

  lines.push("", "Overall: " + (result.valid ? "pass" : "fail"), "");
  return lines.join("\n");
}

function validateFunnel(dataset) {
  const actualProbability = round(dataset.convertedCount / dataset.acceptedCount, 4);
  const actualInterval = wilsonInterval(
    dataset.convertedCount,
    dataset.acceptedCount,
    Z_SCORE_95
  );

  return buildValidation("funnel", [
    compare("conversionProbability", actualProbability, dataset.expected.conversionProbability),
    compare(
      "confidenceInterval95.lower",
      actualInterval.lower,
      dataset.expected.confidenceInterval95.lower
    ),
    compare(
      "confidenceInterval95.upper",
      actualInterval.upper,
      dataset.expected.confidenceInterval95.upper
    )
  ]);
}

function validateSurvival(dataset) {
  const actualTable = kaplanMeierTable(dataset.observations);
  const actualMedian = actualTable.find(function findMedian(row) {
    return row.survivalProbability <= 0.5;
  })?.time ?? null;
  const tableChecks = dataset.expected.survivalTable.flatMap(function mapExpectedRow(expectedRow, index) {
    const actualRow = actualTable[index] || {};

    return [
      compare("survivalTable." + index + ".time", actualRow.time, expectedRow.time),
      compare("survivalTable." + index + ".atRisk", actualRow.atRisk, expectedRow.atRisk),
      compare("survivalTable." + index + ".events", actualRow.events, expectedRow.events),
      compare("survivalTable." + index + ".censored", actualRow.censored, expectedRow.censored),
      compare(
        "survivalTable." + index + ".survivalProbability",
        actualRow.survivalProbability,
        expectedRow.survivalProbability
      )
    ];
  });

  return buildValidation("survival", [
    ...tableChecks,
    compare("medianSurvivalTime", actualMedian, dataset.expected.medianSurvivalTime)
  ]);
}

function validateSloBurnRate(dataset) {
  const actualShortWindow = burnRateWindow(dataset.shortWindow, dataset);
  const actualLongWindow = burnRateWindow(dataset.longWindow, dataset);
  const actualSeverity = classifyMultiWindowBurnRate(
    actualShortWindow.burnRate,
    actualLongWindow.burnRate
  );

  return buildValidation("sloBurnRate", [
    ...compareObject("shortWindow", actualShortWindow, dataset.expected.shortWindow),
    ...compareObject("longWindow", actualLongWindow, dataset.expected.longWindow),
    compare("severity", actualSeverity, dataset.expected.severity)
  ]);
}

function validateSimulation(dataset, options) {
  const scenario = options.loadScenario(dataset.scenarioPath);
  const result = simulateFixedPlan(scenario, {
    iterations: dataset.iterations,
    seed: dataset.seed,
    strategy: dataset.strategy,
    uncertainty: dataset.uncertainty
  });

  return buildValidation("simulation", [
    compare("totalCostMean", result.summary.totalCost.mean, dataset.expected.totalCostMean),
    compare(
      "totalLateMinutesMean",
      result.summary.totalLateMinutes.mean,
      dataset.expected.totalLateMinutesMean
    ),
    compare(
      "unassignedOrdersMean",
      result.summary.unassignedOrders.mean,
      dataset.expected.unassignedOrdersMean
    ),
    compare("servedOrders", result.baseMetrics.servedOrders, dataset.expected.servedOrders),
    compare("sampleSize", result.summary.monteCarlo.sampleSize, dataset.expected.sampleSize)
  ]);
}

function wilsonInterval(successes, trials, zScore) {
  const proportion = successes / trials;
  const denominator = 1 + (zScore * zScore) / trials;
  const center = (proportion + (zScore * zScore) / (2 * trials)) / denominator;
  const margin =
    (zScore *
      Math.sqrt((proportion * (1 - proportion) + (zScore * zScore) / (4 * trials)) / trials)) /
    denominator;

  return {
    lower: round(center - margin, 4),
    upper: round(center + margin, 4)
  };
}

function kaplanMeierTable(observations) {
  const eventTimes = Array.from(
    new Set(
      observations
        .filter(function observed(row) {
          return row.eventObserved;
        })
        .map(function mapDuration(row) {
          return row.duration;
        })
    )
  ).sort(function sortNumber(left, right) {
    return left - right;
  });
  let survivalProbability = 1;

  return eventTimes.map(function mapTime(time) {
    const atRisk = observations.filter(function atRiskAtTime(row) {
      return row.duration >= time;
    }).length;
    const events = observations.filter(function eventAtTime(row) {
      return row.duration === time && row.eventObserved;
    }).length;
    const censored = observations.filter(function censoredAtTime(row) {
      return row.duration === time && !row.eventObserved;
    }).length;

    survivalProbability *= 1 - events / atRisk;

    return {
      time,
      atRisk,
      events,
      censored,
      survivalProbability: round(survivalProbability, 4)
    };
  });
}

function burnRateWindow(window, dataset) {
  const badEvents = window.totalEvents - window.goodEvents;
  const errorBudgetEvents = window.totalEvents * (1 - dataset.targetPercentage / 100);
  const errorBudgetConsumedPercentage = (badEvents / errorBudgetEvents) * 100;
  const expectedBudgetConsumedPercentage = (window.days / dataset.windowDays) * 100;

  return {
    observedPercentage: round((window.goodEvents / window.totalEvents) * 100, 5),
    errorBudgetConsumedPercentage: round(errorBudgetConsumedPercentage, 3),
    expectedBudgetConsumedPercentage: round(expectedBudgetConsumedPercentage, 3),
    burnRate: round(errorBudgetConsumedPercentage / expectedBudgetConsumedPercentage, 3)
  };
}

function classifyMultiWindowBurnRate(shortBurnRate, longBurnRate) {
  if (shortBurnRate >= 4 && longBurnRate >= 2) {
    return "page";
  }

  if (shortBurnRate >= 4 || longBurnRate >= 2) {
    return "warning";
  }

  if (shortBurnRate >= 1 || longBurnRate >= 1) {
    return "watch";
  }

  return "ok";
}

function compareObject(prefix, actual, expected) {
  return Object.entries(expected).map(function mapEntry(entry) {
    return compare(prefix + "." + entry[0], actual[entry[0]], entry[1]);
  });
}

function compare(label, actual, expected) {
  const normalizedActual = readFiniteNumber(actual, actual);
  const normalizedExpected = readFiniteNumber(expected, expected);

  return {
    label,
    actual: normalizedActual,
    expected: normalizedExpected,
    pass: normalizedActual === normalizedExpected
  };
}

function buildValidation(dataset, checks) {
  return {
    dataset,
    valid: checks.every(function everyCheck(check) {
      return check.pass;
    }),
    checks
  };
}

function normalizeGoldenDatasets(document) {
  if (!document || typeof document !== "object") {
    throw new Error("Golden datasets document must be an object");
  }

  if (document.schemaVersion !== "portfolio-golden-datasets.v1") {
    throw new Error("Golden datasets schemaVersion must be portfolio-golden-datasets.v1");
  }

  return document.datasets;
}
