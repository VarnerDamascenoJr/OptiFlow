import createExecutionMetadata from "./execution-metadata.js";
import createExactSolverPlan from "./exact-solver.js";
import createNearestNeighborPlan from "./nearest-neighbor.js";
import { createOptimizationHistoryRepository } from "./optimization-history.js";
import evaluatePlan from "./metrics.js";
import renderOptimizationMetrics from "./observability-metrics.js";
import { simulateFixedPlan, summarizeSamples } from "./simulation.js";
import { compareStrategies, renderComparisonReport } from "./strategy-comparison.js";
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
  compareStrategies,
  createExecutionMetadata,
  createExactSolverPlan,
  createNearestNeighborPlan,
  createOptimizationHistoryRepository,
  evaluatePlan,
  renderOptimizationMetrics,
  renderComparisonReport,
  simulateFixedPlan,
  summarizeSamples,
  validateScenario
};
