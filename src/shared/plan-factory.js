import createExactSolverPlan from "../exact-solver.js";
import createOrToolsPlan from "../or-tools-solver.js";
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

  if (strategy === "or-tools") {
    return createOrToolsPlan(scenario, solverOptions);
  }

  throw new Error("Unknown optimization strategy: " + strategy);
}
