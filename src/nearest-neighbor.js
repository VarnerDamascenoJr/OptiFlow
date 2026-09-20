import {
  buildUnassignedOrderDetails,
  canServeOrderAtThisPoint,
  readScenarioConstraints
} from "./constraints.js";

export default function createNearestNeighborPlan(scenario) {
  return buildGreedyPlan(scenario, "nearest-neighbor-capacity");
}

export function createCostAwareGreedyPlan(scenario) {
  return buildGreedyPlan(scenario, "cost-aware-greedy");
}

function buildGreedyPlan(scenario, strategy) {
  const constraints = readScenarioConstraints(scenario);
  let remainingOrders = scenario.orders.slice();
  const routes = [];

  for (let vehicleIndex = 0; vehicleIndex < scenario.vehicles.length; vehicleIndex += 1) {
    const vehicle = scenario.vehicles[vehicleIndex];
    const route = buildVehicleRoute(scenario, vehicle, remainingOrders, constraints, strategy);
    routes.push(route);
    remainingOrders = route.remainingOrders;
    delete route.remainingOrders;
  }

  const unassignedOrderIds = remainingOrders.map(function mapOrderId(order) {
    return order.id;
  });

  return {
    strategy: strategy,
    routes: routes,
    unassignedOrderDetails: buildUnassignedOrderDetails(scenario, unassignedOrderIds, constraints),
    unassignedOrderIds: unassignedOrderIds
  };
}

function buildVehicleRoute(scenario, vehicle, availableOrders, constraints, strategy) {
  let currentLocationId = vehicle.startLocationId;
  let currentTime = scenario.operation.startTimeMinutes;
  let usedCapacity = 0;
  let totalDistance = 0;
  const remainingOrders = availableOrders.slice();
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

  while (true) {
    const candidate = findNearestFeasibleOrder(
      scenario,
      vehicle,
      {
        currentLocationId: currentLocationId,
        currentTime: currentTime,
        totalDistance: totalDistance
      },
      vehicle.capacity - usedCapacity,
      remainingOrders,
      constraints,
      strategy
    );

    if (!candidate) {
      break;
    }

    const order = candidate.order;
    const arrivalTime = currentTime + candidate.distance;
    const serviceStart = Math.max(arrivalTime, order.timeWindow.startMinutes);
    const lateMinutes = Math.max(0, serviceStart - order.timeWindow.endMinutes);
    const departureTime = serviceStart + order.serviceTimeMinutes;

    usedCapacity += order.demand;
    totalDistance += candidate.distance;
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
      distanceFromPrevious: candidate.distance,
      lateMinutes: lateMinutes
    });

    remainingOrders.splice(candidate.index, 1);
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
    vehicleId: vehicle.id,
    stops: stops,
    totalDistance: totalDistance,
    usedCapacity: usedCapacity,
    capacity: vehicle.capacity,
    remainingOrders: remainingOrders
  };
}

function findNearestFeasibleOrder(scenario, vehicle, routeState, remainingCapacity, orders, constraints, strategy) {
  let best = null;

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];

    if (order.demand > remainingCapacity) {
      continue;
    }

    if (!canServeOrderAtThisPoint(scenario, vehicle, routeState, order, constraints)) {
      continue;
    }

    const distance = scenario.distanceMatrix[routeState.currentLocationId][order.locationId];
    const score = strategy === "cost-aware-greedy"
      ? estimateIncrementalCost(scenario, vehicle, routeState, order, orders, remainingCapacity, constraints)
      : distance;

    if (
      !best ||
      score < best.score ||
      (score === best.score && (distance < best.distance || (distance === best.distance && order.id < best.order.id)))
    ) {
      best = {
        index: i,
        order: order,
        distance: distance,
        score: score
      };
    }
  }

  return best;
}

function estimateIncrementalCost(scenario, vehicle, routeState, order, orders, remainingCapacity, constraints) {
  const matrix = scenario.distanceMatrix;
  const distance = matrix[routeState.currentLocationId][order.locationId];
  const returnDistance = matrix[order.locationId][vehicle.startLocationId];
  const currentReturnDistance = matrix[routeState.currentLocationId][vehicle.startLocationId];
  const serviceStart = Math.max(routeState.currentTime + distance, order.timeWindow.startMinutes);
  const departureTime = serviceStart + order.serviceTimeMinutes;
  const lateMinutes = Math.max(0, serviceStart - order.timeWindow.endMinutes);
  let score =
    (distance + returnDistance - currentReturnDistance) * scenario.costs.distanceUnitCost +
    lateMinutes * scenario.costs.lateMinutePenalty;

  for (const otherOrder of orders) {
    if (otherOrder.id === order.id || otherOrder.demand > remainingCapacity - order.demand) {
      continue;
    }

    if (!canServeOrderAtThisPoint(scenario, vehicle, routeState, otherOrder, constraints)) {
      continue;
    }

    const currentArrival = routeState.currentTime + matrix[routeState.currentLocationId][otherOrder.locationId];
    const currentServiceStart = Math.max(currentArrival, otherOrder.timeWindow.startMinutes);
    const currentLate = Math.max(0, currentServiceStart - otherOrder.timeWindow.endMinutes);
    const delayedArrival = departureTime + matrix[order.locationId][otherOrder.locationId];
    const delayedServiceStart = Math.max(delayedArrival, otherOrder.timeWindow.startMinutes);
    const delayedLate = Math.max(0, delayedServiceStart - otherOrder.timeWindow.endMinutes);

    if (constraints.hardTimeWindows && delayedLate > 0) {
      score += scenario.costs.unassignedOrderPenalty;
    } else {
      score += Math.max(0, delayedLate - currentLate) * scenario.costs.lateMinutePenalty;
    }
  }

  return score;
}
