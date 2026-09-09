export default function createNearestNeighborPlan(scenario) {
  let remainingOrders = scenario.orders.slice();
  const routes = [];

  for (let vehicleIndex = 0; vehicleIndex < scenario.vehicles.length; vehicleIndex += 1) {
    const vehicle = scenario.vehicles[vehicleIndex];
    const route = buildVehicleRoute(scenario, vehicle, remainingOrders);
    routes.push(route);
    remainingOrders = route.remainingOrders;
    delete route.remainingOrders;
  }

  return {
    strategy: "nearest-neighbor-capacity",
    routes: routes,
    unassignedOrderIds: remainingOrders.map(function mapOrderId(order) {
      return order.id;
    })
  };
}

function buildVehicleRoute(scenario, vehicle, availableOrders) {
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
    const candidate = findNearestFeasibleOrder(scenario, currentLocationId, vehicle.capacity - usedCapacity, remainingOrders);

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

function findNearestFeasibleOrder(scenario, currentLocationId, remainingCapacity, orders) {
  let best = null;

  for (let i = 0; i < orders.length; i += 1) {
    const order = orders[i];

    if (order.demand > remainingCapacity) {
      continue;
    }

    const distance = scenario.distanceMatrix[currentLocationId][order.locationId];
    const score = distance;

    if (!best || score < best.score || (score === best.score && order.id < best.order.id)) {
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
