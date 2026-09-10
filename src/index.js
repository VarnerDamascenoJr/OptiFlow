import createExecutionMetadata from "./execution-metadata.js";
import createNearestNeighborPlan from "./nearest-neighbor.js";
import evaluatePlan from "./metrics.js";
import renderOptimizationMetrics from "./observability-metrics.js";
import validateScenario from "./validate-scenario.js";

export function solveScenario(scenario, options = {}) {
  validateScenario(scenario);

  const metadata = createExecutionMetadata(readMetadataOptions(options));
  const plan = createNearestNeighborPlan(scenario);
  const metrics = evaluatePlan(scenario, plan);

  return {
    scenarioId: scenario.id,
    metadata: metadata,
    strategy: plan.strategy,
    routes: plan.routes,
    unassignedOrderIds: plan.unassignedOrderIds,
    metrics: metrics
  };
}

function readMetadataOptions(options) {
  if (!options || typeof options !== "object") {
    return {};
  }

  return options.metadata;
}

export {
  createExecutionMetadata,
  createNearestNeighborPlan,
  evaluatePlan,
  renderOptimizationMetrics,
  validateScenario
};
