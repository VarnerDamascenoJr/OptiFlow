import {
  buildUnassignedOrderDetails,
  canServeOrderAtThisPoint,
  readScenarioConstraints
} from "./constraints.js";
import evaluatePlan from "./metrics.js";

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
  state.candidates.push(buildRoute(state.scenario, state.vehicle, state.selectedOrders));

  for (let i = 0; i < state.remainingOrders.length; i += 1) {
    const order = state.remainingOrders[i];
    const nextCapacity = state.usedCapacity + order.demand;

    if (nextCapacity > state.vehicle.capacity) {
      continue;
    }

    if (
      !canServeOrderAtThisPoint(
        state.scenario,
        state.vehicle,
        {
          currentLocationId: state.currentLocationId,
          currentTime: state.currentTime,
          totalDistance: state.totalDistance
        },
        order,
        state.constraints
      )
    ) {
      continue;
    }

    const distance = state.scenario.distanceMatrix[state.currentLocationId][order.locationId];
    const arrivalTime = state.currentTime + distance;
    const serviceStart = Math.max(arrivalTime, order.timeWindow.startMinutes);

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

  for (let i = 0; i < candidates.length; i += 1) {
    const route = candidates[i];

    if (route.orderIds.some(function hasUsedOrder(orderId) {
      return state.usedOrderIds.has(orderId);
    })) {
      continue;
    }

    const nextUsedOrderIds = new Set(state.usedOrderIds);

    for (let orderIndex = 0; orderIndex < route.orderIds.length; orderIndex += 1) {
      nextUsedOrderIds.add(route.orderIds[orderIndex]);
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

function buildRoute(scenario, vehicle, orders) {
  let currentLocationId = vehicle.startLocationId;
  let currentTime = scenario.operation.startTimeMinutes;
  let totalDistance = 0;
  let usedCapacity = 0;
  const stops = [
    {
      type: "start",
      locationId: vehicle.startLocationId,
      arrivalTimeMinutes: currentTime,
      serviceStartMinutes: currentTime,
      departureTimeMinutes: currentTime,
      loadAfterStop: 0,
      distanceFromPrevious: 0,
      lateMinutes: 0
    }
  ];

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];
    const distance = scenario.distanceMatrix[currentLocationId][order.locationId];
    const arrivalTime = currentTime + distance;
    const serviceStart = Math.max(arrivalTime, order.timeWindow.startMinutes);
    const lateMinutes = Math.max(0, serviceStart - order.timeWindow.endMinutes);
    const departureTime = serviceStart + order.serviceTimeMinutes;

    usedCapacity += order.demand;
    totalDistance += distance;
    currentLocationId = order.locationId;
    currentTime = departureTime;

    stops.push({
      type: "order",
      orderId: order.id,
      locationId: order.locationId,
      demand: order.demand,
      arrivalTimeMinutes: arrivalTime,
      serviceStartMinutes: serviceStart,
      departureTimeMinutes: departureTime,
      loadAfterStop: usedCapacity,
      distanceFromPrevious: distance,
      lateMinutes: lateMinutes
    });
  }

  const returnDistance = scenario.distanceMatrix[currentLocationId][vehicle.startLocationId];
  totalDistance += returnDistance;
  currentTime += returnDistance;

  stops.push({
    type: "end",
    locationId: vehicle.startLocationId,
    arrivalTimeMinutes: currentTime,
    serviceStartMinutes: currentTime,
    departureTimeMinutes: currentTime,
    loadAfterStop: usedCapacity,
    distanceFromPrevious: returnDistance,
    lateMinutes: 0
  });

  return {
    capacity: vehicle.capacity,
    orderIds: orders.map(function mapOrderId(order) {
      return order.id;
    }),
    stops: stops,
    totalDistance: totalDistance,
    usedCapacity: usedCapacity,
    vehicleId: vehicle.id
  };
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
