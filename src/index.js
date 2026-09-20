import createExecutionMetadata from "./execution-metadata.js";
import createExactSolverPlan from "./exact-solver.js";
import createNearestNeighborPlan, { createCostAwareGreedyPlan } from "./nearest-neighbor.js";
import evaluatePlan from "./metrics.js";
import validateScenario from "./validate-scenario.js";

export function solveScenario(scenario, options = {}) {
  validateScenario(scenario);

  const metadata = createExecutionMetadata(readMetadataOptions(options));
  const plan = createPlan(scenario, options);
  const metrics = evaluatePlan(scenario, plan);

  return {
    scenarioId: scenario.id,
    metadata: metadata,
    strategy: plan.strategy,
    routes: plan.routes,
    unassignedOrderDetails: plan.unassignedOrderDetails || [],
    unassignedOrderIds: plan.unassignedOrderIds,
    metrics: metrics
  };
}

function createPlan(scenario, options) {
  const strategy = readStrategy(options);

  if (strategy === "nearest-neighbor-capacity") {
    return createNearestNeighborPlan(scenario);
  }

  if (strategy === "cost-aware-greedy") {
    return createCostAwareGreedyPlan(scenario);
  }

  if (strategy === "exact-enumeration") {
    return createExactSolverPlan(scenario, readSolverOptions(options));
  }

  throw new Error("Unknown optimization strategy: " + strategy);
}

function readStrategy(options) {
  if (!options || typeof options !== "object" || !options.strategy) {
    return "nearest-neighbor-capacity";
  }

  return options.strategy;
}

function readSolverOptions(options) {
  if (!options || typeof options !== "object") {
    return {};
  }

  return options.solver || {};
}

function readMetadataOptions(options) {
  if (!options || typeof options !== "object") {
    return {};
  }

  return options.metadata;
}

export {
  createExecutionMetadata,
  createExactSolverPlan,
  createCostAwareGreedyPlan,
  createNearestNeighborPlan,
  evaluatePlan,
  validateScenario
};

export { createOptimizationHistoryRepository } from "./optimization-history.js";
export { default as renderOptimizationMetrics } from "./observability-metrics.js";
export { calculateVarCvar, compareRiskAdjustedStrategies } from "./risk-analysis.js";
export { importSalesEventScenario } from "./sales-event-scenario-importer.js";
export { simulateFixedPlan, summarizeSamples } from "./simulation.js";
export { compareStrategies, renderComparisonReport } from "./strategy-comparison.js";
