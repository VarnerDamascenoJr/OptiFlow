import {
  buildUnassignedOrderDetails,
  readScenarioConstraints
} from "./constraints.js";
import evaluatePlan from "./metrics.js";
import buildRoute from "./shared/route-builder.js";

const defaultOptions = {
  maxOrders: 8,
  timeoutMs: 1000
};

export default function createExactSolverPlan(scenario, options = {}) {
  const solverOptions = normalizeOptions(options);
  const constraints = readScenarioConstraints(scenario);

  if (scenario.orders.length > solverOptions.maxOrders) {
    throw new Error(
      "exact-enumeration supports at most " +
        solverOptions.maxOrders +
        " orders; received " +
        scenario.orders.length
    );
  }

  const deadline = Date.now() + solverOptions.timeoutMs;
  const candidatesByVehicle = scenario.vehicles.map(function mapVehicle(vehicle) {
    return buildRouteCandidates(scenario, vehicle, deadline, constraints);
  });
  let bestPlan = null;
  let bestMetrics = null;

  searchPlans({
    candidatesByVehicle: candidatesByVehicle,
    deadline: deadline,
    onPlan: function onPlan(plan) {
      const metrics = evaluatePlan(scenario, plan);

      if (!bestMetrics || compareMetrics(metrics, bestMetrics) < 0) {
        bestPlan = plan;
        bestMetrics = metrics;
      }
    },
    constraints: constraints,
    scenario: scenario,
    selectedRoutes: [],
    usedOrderIds: new Set(),
    vehicleIndex: 0
  });

  if (!bestPlan) {
    throw new Error("exact-enumeration did not produce a feasible plan");
  }

  return bestPlan;
}

function normalizeOptions(options) {
  return {
    maxOrders: readPositiveInteger(options.maxOrders, defaultOptions.maxOrders),
    timeoutMs: readPositiveInteger(options.timeoutMs, defaultOptions.timeoutMs)
  };
}

function readPositiveInteger(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("exact-enumeration options must be positive integers");
  }

  return value;
}

function buildRouteCandidates(scenario, vehicle, deadline, constraints) {
  const candidates = [];

  collectRouteCandidates({
    candidates: candidates,
    deadline: deadline,
    remainingOrders: scenario.orders,
    scenario: scenario,
    selectedOrders: [],
    totalDistance: 0,
    currentLocationId: vehicle.startLocationId,
    currentTime: scenario.operation.startTimeMinutes,
    usedCapacity: 0,
    vehicle: vehicle,
    constraints: constraints
  });

  return candidates;
}

function collectRouteCandidates(state) {
  assertWithinDeadline(state.deadline);

  if (state.constraints.maxRouteDistance && state.totalDistance > state.vehicle.maxDistance) {
    return;
  }

  const returnDistance = state.scenario.distanceMatrix[state.currentLocationId][state.vehicle.startLocationId];

  // An invalid direct return can become valid after another stop in a nonmetric matrix.
  if (
    !state.constraints.maxRouteDistance ||
    state.totalDistance + returnDistance <= state.vehicle.maxDistance
  ) {
    state.candidates.push(buildRoute(state.scenario, state.vehicle, state.selectedOrders));
  }

  for (const order of state.remainingOrders) {
    const nextCapacity = state.usedCapacity + order.demand;

    if (nextCapacity > state.vehicle.capacity) {
      continue;
    }

    const distance = state.scenario.distanceMatrix[state.currentLocationId][order.locationId];
    const arrivalTime = state.currentTime + distance;
    const serviceStart = Math.max(arrivalTime, order.timeWindow.startMinutes);

    if (state.constraints.hardTimeWindows && serviceStart > order.timeWindow.endMinutes) {
      continue;
    }

    collectRouteCandidates({
      candidates: state.candidates,
      constraints: state.constraints,
      currentLocationId: order.locationId,
      currentTime: serviceStart + order.serviceTimeMinutes,
      deadline: state.deadline,
      remainingOrders: state.remainingOrders.filter(function filterRemaining(candidate) {
        return candidate.id !== order.id;
      }),
      scenario: state.scenario,
      selectedOrders: state.selectedOrders.concat(order),
      totalDistance: state.totalDistance + distance,
      usedCapacity: nextCapacity,
      vehicle: state.vehicle
    });
  }
}

function searchPlans(state) {
  assertWithinDeadline(state.deadline);

  if (state.vehicleIndex === state.scenario.vehicles.length) {
    const unassignedOrderIds = state.scenario.orders
      .filter(function filterUnassigned(order) {
        return !state.usedOrderIds.has(order.id);
      })
      .map(function mapOrderId(order) {
        return order.id;
      });

    state.onPlan({
      routes: state.selectedRoutes,
      strategy: "exact-enumeration",
      unassignedOrderDetails: buildUnassignedOrderDetails(state.scenario, unassignedOrderIds, state.constraints),
      unassignedOrderIds: unassignedOrderIds
    });
    return;
  }

  const candidates = state.candidatesByVehicle[state.vehicleIndex];

  for (const route of candidates) {

    if (route.orderIds.some(function hasUsedOrder(orderId) {
      return state.usedOrderIds.has(orderId);
    })) {
      continue;
    }

    const nextUsedOrderIds = new Set(state.usedOrderIds);

    for (const orderId of route.orderIds) {
      nextUsedOrderIds.add(orderId);
    }

    searchPlans({
      candidatesByVehicle: state.candidatesByVehicle,
      constraints: state.constraints,
      deadline: state.deadline,
      onPlan: state.onPlan,
      scenario: state.scenario,
      selectedRoutes: state.selectedRoutes.concat(stripInternalRouteFields(route)),
      usedOrderIds: nextUsedOrderIds,
      vehicleIndex: state.vehicleIndex + 1
    });
  }
}

function stripInternalRouteFields(route) {
  return {
    vehicleId: route.vehicleId,
    stops: route.stops,
    totalDistance: route.totalDistance,
    usedCapacity: route.usedCapacity,
    capacity: route.capacity,
  };
}

function compareMetrics(left, right) {
  const totalCost = left.totalCost - right.totalCost;

  if (totalCost !== 0) {
    return totalCost;
  }

  const unassignedOrders = left.unassignedOrders - right.unassignedOrders;

  if (unassignedOrders !== 0) {
    return unassignedOrders;
  }

  return left.totalDistance - right.totalDistance;
}

function assertWithinDeadline(deadline) {
  if (Date.now() > deadline) {
    throw new Error("exact-enumeration exceeded its solver timeout");
  }
}
