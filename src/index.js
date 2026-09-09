import createNearestNeighborPlan from "./nearest-neighbor.js";
import evaluatePlan from "./metrics.js";
import validateScenario from "./validate-scenario.js";

export function solveScenario(scenario) {
  validateScenario(scenario);

  const plan = createNearestNeighborPlan(scenario);
  const metrics = evaluatePlan(scenario, plan);

  return {
    scenarioId: scenario.id,
    strategy: plan.strategy,
    routes: plan.routes,
    unassignedOrderIds: plan.unassignedOrderIds,
    metrics: metrics
  };
}

export {
  createNearestNeighborPlan,
  evaluatePlan,
  validateScenario
};

export {
  evaluateSalesDecisionScenario,
  validateSalesDecisionScenario
} from "./sales/index.js";
