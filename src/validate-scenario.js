export default function validateScenario(scenario) {
  assertObject(scenario, "scenario");
  assertString(scenario.id, "scenario.id");
  assertArray(scenario.locations, "scenario.locations");
  assertArray(scenario.vehicles, "scenario.vehicles");
  assertArray(scenario.orders, "scenario.orders");
  assertObject(scenario.distanceMatrix, "scenario.distanceMatrix");
  assertObject(scenario.costs, "scenario.costs");
  assertNonNegativeNumber(scenario.costs.distanceUnitCost, "scenario.costs.distanceUnitCost");
  assertNonNegativeNumber(scenario.costs.lateMinutePenalty, "scenario.costs.lateMinutePenalty");
  assertNonNegativeNumber(scenario.costs.unassignedOrderPenalty, "scenario.costs.unassignedOrderPenalty");
  assertObject(scenario.operation, "scenario.operation");
  assertNumber(scenario.operation.startTimeMinutes, "scenario.operation.startTimeMinutes");

  const locationIds = collectUniqueIds(scenario.locations, "locations");
  const vehicleIds = collectUniqueIds(scenario.vehicles, "vehicles");
  collectUniqueIds(scenario.orders, "orders");

  if (vehicleIds.length === 0) {
    throw new Error("scenario.vehicles must contain at least one vehicle");
  }

  for (let i = 0; i < scenario.locations.length; i += 1) {
    assertString(scenario.locations[i].id, "locations[" + i + "].id");
  }

  for (let vehicleIndex = 0; vehicleIndex < scenario.vehicles.length; vehicleIndex += 1) {
    const vehicle = scenario.vehicles[vehicleIndex];
    assertString(vehicle.id, "vehicles[" + vehicleIndex + "].id");
    assertPositiveNumber(vehicle.capacity, "vehicles[" + vehicleIndex + "].capacity");
    assertKnownLocation(locationIds, vehicle.startLocationId, "vehicles[" + vehicleIndex + "].startLocationId");

    if (vehicle.maxDistance !== undefined) {
      assertPositiveNumber(vehicle.maxDistance, "vehicles[" + vehicleIndex + "].maxDistance");
    }
  }

  const maxVehicleCapacity = getMaxVehicleCapacity(scenario.vehicles);

  for (let orderIndex = 0; orderIndex < scenario.orders.length; orderIndex += 1) {
    const order = scenario.orders[orderIndex];
    assertString(order.id, "orders[" + orderIndex + "].id");
    assertKnownLocation(locationIds, order.locationId, "orders[" + orderIndex + "].locationId");
    assertPositiveNumber(order.demand, "orders[" + orderIndex + "].demand");
    assertPositiveNumber(order.serviceTimeMinutes, "orders[" + orderIndex + "].serviceTimeMinutes");
    assertObject(order.timeWindow, "orders[" + orderIndex + "].timeWindow");
    assertNumber(order.timeWindow.startMinutes, "orders[" + orderIndex + "].timeWindow.startMinutes");
    assertNumber(order.timeWindow.endMinutes, "orders[" + orderIndex + "].timeWindow.endMinutes");

    if (order.timeWindow.endMinutes < order.timeWindow.startMinutes) {
      throw new Error("orders[" + orderIndex + "].timeWindow.endMinutes must be greater than or equal to startMinutes");
    }

    if (order.demand > maxVehicleCapacity) {
      throw new Error("orders[" + orderIndex + "] demand exceeds every vehicle capacity");
    }
  }

  for (let fromIndex = 0; fromIndex < locationIds.length; fromIndex += 1) {
    const fromId = locationIds[fromIndex];
    assertObject(scenario.distanceMatrix[fromId], "distanceMatrix." + fromId);

    for (let toIndex = 0; toIndex < locationIds.length; toIndex += 1) {
      const toId = locationIds[toIndex];
      assertNonNegativeNumber(scenario.distanceMatrix[fromId][toId], "distanceMatrix." + fromId + "." + toId);
    }
  }
}

function collectUniqueIds(items, label) {
  const ids = [];
  const seen = {};

  for (let i = 0; i < items.length; i += 1) {
    assertString(items[i].id, label + "[" + i + "].id");

    if (seen[items[i].id]) {
      throw new Error(label + " contains duplicate id: " + items[i].id);
    }

    seen[items[i].id] = true;
    ids.push(items[i].id);
  }

  return ids;
}

function getMaxVehicleCapacity(vehicles) {
  let max = 0;

  for (let i = 0; i < vehicles.length; i += 1) {
    if (vehicles[i].capacity > max) {
      max = vehicles[i].capacity;
    }
  }

  return max;
}

function assertKnownLocation(locationIds, locationId, label) {
  assertString(locationId, label);

  if (locationIds.indexOf(locationId) === -1) {
    throw new Error(label + " must reference a known location: " + locationId);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(label + " must be an array");
  }
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(label + " must be an object");
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(label + " must be a non-empty string");
  }
}

function assertNumber(value, label) {
  if (typeof value !== "number" || !isFinite(value)) {
    throw new Error(label + " must be a finite number");
  }
}

function assertPositiveNumber(value, label) {
  assertNumber(value, label);

  if (value <= 0) {
    throw new Error(label + " must be greater than zero");
  }
}

function assertNonNegativeNumber(value, label) {
  assertNumber(value, label);

  if (value < 0) {
    throw new Error(label + " must be greater than or equal to zero");
  }
}
