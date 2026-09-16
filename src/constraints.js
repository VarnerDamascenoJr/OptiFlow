export function readScenarioConstraints(scenario) {
  const constraints = scenario.constraints || {};

  return {
    hardTimeWindows: constraints.hardTimeWindows === true,
    maxRouteDistance: constraints.maxRouteDistance === true,
    requiredOrderIds: Array.isArray(constraints.requiredOrderIds)
      ? constraints.requiredOrderIds.slice()
      : []
  };
}

export function isOrderRequired(constraints, orderId) {
  return constraints.requiredOrderIds.indexOf(orderId) !== -1;
}

export function canServeOrderAtThisPoint(scenario, vehicle, routeState, order, constraints) {
  const distance = scenario.distanceMatrix[routeState.currentLocationId][order.locationId];
  const arrivalTime = routeState.currentTime + distance;
  const serviceStart = Math.max(arrivalTime, order.timeWindow.startMinutes);

  if (constraints.hardTimeWindows && serviceStart > order.timeWindow.endMinutes) {
    return false;
  }

  if (constraints.maxRouteDistance && vehicle.maxDistance !== undefined) {
    const returnDistance = scenario.distanceMatrix[order.locationId][vehicle.startLocationId];
    const projectedDistance = routeState.totalDistance + distance + returnDistance;

    if (projectedDistance > vehicle.maxDistance) {
      return false;
    }
  }

  return true;
}

export function buildUnassignedOrderDetails(scenario, unassignedOrderIds, constraints) {
  return unassignedOrderIds.map(function mapUnassignedOrder(orderId) {
    const order = scenario.orders.find(function findOrder(candidate) {
      return candidate.id === orderId;
    });

    return {
      orderId: orderId,
      reason: explainUnassignedOrder(scenario, order, constraints),
      required: isOrderRequired(constraints, orderId)
    };
  });
}

function explainUnassignedOrder(scenario, order, constraints) {
  if (!order) {
    return "unknown_order";
  }

  if (
    constraints.hardTimeWindows &&
    !scenario.vehicles.some(function canReachWithinWindow(vehicle) {
      const travelTime = scenario.distanceMatrix[vehicle.startLocationId][order.locationId];
      const arrivalTime = scenario.operation.startTimeMinutes + travelTime;
      const serviceStart = Math.max(arrivalTime, order.timeWindow.startMinutes);

      return serviceStart <= order.timeWindow.endMinutes;
    })
  ) {
    return "hard_time_window_unreachable";
  }

  if (
    constraints.maxRouteDistance &&
    !scenario.vehicles.some(function canFitRoundTrip(vehicle) {
      if (vehicle.maxDistance === undefined) {
        return false;
      }

      const outboundDistance = scenario.distanceMatrix[vehicle.startLocationId][order.locationId];
      const returnDistance = scenario.distanceMatrix[order.locationId][vehicle.startLocationId];

      return outboundDistance + returnDistance <= vehicle.maxDistance;
    })
  ) {
    return "max_route_distance_exceeded";
  }

  if (isOrderRequired(constraints, order.id)) {
    return "required_order_unassigned";
  }

  return "not_selected_by_strategy_or_capacity";
}
