import createExactSolverPlan from "./exact-solver.js";
import createNearestNeighborPlan, { createCostAwareGreedyPlan } from "./nearest-neighbor.js";
import evaluatePlan from "./metrics.js";
import validateScenario from "./validate-scenario.js";

const defaultComparisonOptions = {
  baselineStrategy: "nearest-neighbor-capacity",
  candidateStrategy: "exact-enumeration"
};

export function compareStrategies(scenario, options = {}) {
  validateScenario(scenario);

  const baselineStrategy = options.baselineStrategy || defaultComparisonOptions.baselineStrategy;
  const candidateStrategy = options.candidateStrategy || defaultComparisonOptions.candidateStrategy;
  const baseline = solveForComparison(scenario, baselineStrategy, options);
  const candidate = solveForComparison(scenario, candidateStrategy, options);
  const deltas = calculateDeltas(baseline.metrics, candidate.metrics);

  return {
    scenarioId: scenario.id,
    baseline: baseline,
    candidate: candidate,
    deltas: deltas,
    outcome: classifyOutcome(deltas.totalCostDelta)
  };
}

export function renderComparisonReport(comparisons) {
  const entries = Array.isArray(comparisons) ? comparisons : [comparisons];
  const lines = ["OptiFlow strategy comparison", ""];

  for (const comparison of entries) {
    lines.push(
      "Scenario: " + comparison.scenarioId,
      "  " +
        comparison.baseline.strategy +
        " cost=" +
        comparison.baseline.metrics.totalCost +
        ", distance=" +
        comparison.baseline.metrics.totalDistance +
        ", late=" +
        comparison.baseline.metrics.totalLateMinutes +
        ", served=" +
        comparison.baseline.metrics.servedOrders,
      "  " +
        comparison.candidate.strategy +
        " cost=" +
        comparison.candidate.metrics.totalCost +
        ", distance=" +
        comparison.candidate.metrics.totalDistance +
        ", late=" +
        comparison.candidate.metrics.totalLateMinutes +
        ", served=" +
        comparison.candidate.metrics.servedOrders,
      "  outcome=" +
        comparison.outcome +
        ", cost_delta=" +
        formatSignedNumber(comparison.deltas.totalCostDelta) +
        ", cost_gain=" +
        comparison.deltas.totalCostGain +
        " (" +
        comparison.deltas.totalCostGainPercentage +
        "%)" +
        ", distance_delta=" +
        formatSignedNumber(comparison.deltas.totalDistanceDelta) +
        ", late_delta=" +
        formatSignedNumber(comparison.deltas.totalLateMinutesDelta) +
        ", served_delta=" +
        formatSignedNumber(comparison.deltas.servedOrdersDelta),
      ""
    );
  }

  return lines.join("\n").trimEnd() + "\n";
}

function solveForComparison(scenario, strategy, options) {
  const plan = createPlan(scenario, strategy, options.solver || {});

  return {
    strategy: strategy,
    routes: plan.routes,
    unassignedOrderIds: plan.unassignedOrderIds,
    metrics: evaluatePlan(scenario, plan)
  };
}

function createPlan(scenario, strategy, solverOptions) {
  if (strategy === "nearest-neighbor-capacity") {
    return createNearestNeighborPlan(scenario);
  }

  if (strategy === "cost-aware-greedy") {
    return createCostAwareGreedyPlan(scenario);
  }

  if (strategy === "exact-enumeration") {
    return createExactSolverPlan(scenario, solverOptions);
  }

  throw new Error("Unknown optimization strategy: " + strategy);
}

function calculateDeltas(baseline, candidate) {
  const totalCostDelta = round(candidate.totalCost - baseline.totalCost, 4);
  const totalCostGain = round(baseline.totalCost - candidate.totalCost, 4);

  return {
    averageUtilizationDelta: round(
      averageUtilization(candidate.vehicleUtilization) -
        averageUtilization(baseline.vehicleUtilization),
      4
    ),
    servedOrdersDelta: candidate.servedOrders - baseline.servedOrders,
    totalCostDelta: totalCostDelta,
    totalCostGain: totalCostGain,
    totalCostGainPercentage:
      baseline.totalCost === 0 ? 0 : round((totalCostGain / baseline.totalCost) * 100, 2),
    totalDistanceDelta: round(candidate.totalDistance - baseline.totalDistance, 4),
    totalLateMinutesDelta: round(candidate.totalLateMinutes - baseline.totalLateMinutes, 4),
    unassignedOrdersDelta: candidate.unassignedOrders - baseline.unassignedOrders
  };
}

function classifyOutcome(totalCostDelta) {
  if (totalCostDelta < 0) {
    return "improved";
  }

  if (totalCostDelta > 0) {
    return "regressed";
  }

  return "tied";
}

function averageUtilization(vehicleUtilization) {
  if (vehicleUtilization.length === 0) {
    return 0;
  }

  const total = vehicleUtilization.reduce(function sumUtilization(sum, entry) {
    return sum + entry.utilizationRate;
  }, 0);

  return total / vehicleUtilization.length;
}

function formatSignedNumber(value) {
  if (value > 0) {
    return "+" + value;
  }

  return String(value);
}

function round(value, decimals) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
