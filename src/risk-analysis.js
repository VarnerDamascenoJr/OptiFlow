import { simulateFixedPlan } from "./simulation.js";
import { mean, round } from "./shared/numbers.js";

const DEFAULT_RISK_OPTIONS = {
  confidenceLevel: 0.95,
  baselineStrategy: "nearest-neighbor-capacity",
  candidateStrategy: "exact-enumeration"
};

export function calculateVarCvar(values, confidenceLevel = DEFAULT_RISK_OPTIONS.confidenceLevel) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("risk analysis requires at least one numeric value");
  }

  const sortedValues = values.slice().sort(function sortNumbers(left, right) {
    return left - right;
  });
  const boundedConfidenceLevel = clamp(confidenceLevel, 0, 1);
  const varIndex = Math.ceil(sortedValues.length * boundedConfidenceLevel) - 1;
  const valueAtRisk = sortedValues[Math.max(0, Math.min(sortedValues.length - 1, varIndex))];
  const tailValues = sortedValues.filter(function keepTailValue(value) {
    return value >= valueAtRisk;
  });

  return {
    confidenceLevel: boundedConfidenceLevel,
    valueAtRisk: round(valueAtRisk, 4),
    conditionalValueAtRisk: round(mean(tailValues), 4),
    tailSampleCount: tailValues.length
  };
}

export function compareRiskAdjustedStrategies(scenario, options = {}) {
  const riskOptions = normalizeRiskOptions(options);
  const baseline = simulateStrategy(scenario, riskOptions.baselineStrategy, riskOptions);
  const candidate = simulateStrategy(scenario, riskOptions.candidateStrategy, riskOptions);
  const expectedCostRecommendation = chooseLowerMetric(
    baseline,
    candidate,
    "expectedCost",
    function readExpectedCost(entry) {
      return entry.simulation.summary.totalCost.mean;
    }
  );
  const tailRiskRecommendation = chooseLowerMetric(
    baseline,
    candidate,
    "tailRisk",
    function readTailRisk(entry) {
      return entry.risk.totalCost.conditionalValueAtRisk;
    }
  );

  return {
    scenarioId: scenario.id,
    confidenceLevel: riskOptions.confidenceLevel,
    baseline: baseline,
    candidate: candidate,
    recommendations: {
      expectedCost: expectedCostRecommendation,
      tailRisk: tailRiskRecommendation,
      tradeOff:
        expectedCostRecommendation.strategy === tailRiskRecommendation.strategy
          ? "aligned"
          : "cost_risk_divergence"
    }
  };
}

function simulateStrategy(scenario, strategy, options) {
  const simulation = simulateFixedPlan(scenario, {
    iterations: options.iterations,
    seed: options.seed,
    solver: options.solver,
    strategy: strategy,
    uncertainty: options.uncertainty
  });

  return {
    strategy: strategy,
    simulation: simulation,
    risk: {
      totalCost: calculateVarCvar(
        simulation.samples.map(function mapCost(sample) {
          return sample.metrics.totalCost;
        }),
        options.confidenceLevel
      ),
      totalLateMinutes: calculateVarCvar(
        simulation.samples.map(function mapLate(sample) {
          return sample.metrics.totalLateMinutes;
        }),
        options.confidenceLevel
      )
    }
  };
}

function chooseLowerMetric(left, right, metric, readValue) {
  const leftValue = readValue(left);
  const rightValue = readValue(right);

  if (leftValue <= rightValue) {
    return {
      metric: metric,
      strategy: left.strategy,
      value: round(leftValue, 4),
      deltaToAlternative: round(rightValue - leftValue, 4)
    };
  }

  return {
    metric: metric,
    strategy: right.strategy,
    value: round(rightValue, 4),
    deltaToAlternative: round(leftValue - rightValue, 4)
  };
}

function normalizeRiskOptions(options) {
  return {
    baselineStrategy: options.baselineStrategy || DEFAULT_RISK_OPTIONS.baselineStrategy,
    candidateStrategy: options.candidateStrategy || DEFAULT_RISK_OPTIONS.candidateStrategy,
    confidenceLevel:
      typeof options.confidenceLevel === "number"
        ? options.confidenceLevel
        : DEFAULT_RISK_OPTIONS.confidenceLevel,
    iterations: options.iterations,
    seed: options.seed,
    solver: options.solver || {},
    uncertainty: options.uncertainty || {}
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
