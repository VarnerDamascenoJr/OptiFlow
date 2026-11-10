export default function buildRoute(scenario, vehicle, orders) {
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

  for (const order of orders) {
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
