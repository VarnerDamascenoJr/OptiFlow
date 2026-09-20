import createExactSolverPlan from "../exact-solver.js";
import createNearestNeighborPlan, { createCostAwareGreedyPlan } from "../nearest-neighbor.js";

export function createPlanForStrategy(scenario, strategy, solverOptions = {}) {
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
