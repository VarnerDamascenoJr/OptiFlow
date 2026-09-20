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
  const orderIds = collectUniqueIds(scenario.orders, "orders");

  if (vehicleIds.length === 0) {
    throw new Error("scenario.vehicles must contain at least one vehicle");
  }

  for (const [i, location] of scenario.locations.entries()) {
    assertString(location.id, "locations[" + i + "].id");
  }

  for (const [vehicleIndex, vehicle] of scenario.vehicles.entries()) {
    assertString(vehicle.id, "vehicles[" + vehicleIndex + "].id");
    assertPositiveNumber(vehicle.capacity, "vehicles[" + vehicleIndex + "].capacity");
    assertKnownLocation(locationIds, vehicle.startLocationId, "vehicles[" + vehicleIndex + "].startLocationId");

    if (vehicle.maxDistance !== undefined) {
      assertPositiveNumber(vehicle.maxDistance, "vehicles[" + vehicleIndex + "].maxDistance");
    }
  }

  const maxVehicleCapacity = getMaxVehicleCapacity(scenario.vehicles);

  for (const [orderIndex, order] of scenario.orders.entries()) {
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

  for (const fromId of locationIds) {
    assertObject(scenario.distanceMatrix[fromId], "distanceMatrix." + fromId);

    for (const toId of locationIds) {
      assertNonNegativeNumber(scenario.distanceMatrix[fromId][toId], "distanceMatrix." + fromId + "." + toId);
    }
  }

  validateConstraints(scenario.constraints, orderIds, scenario.vehicles);
}

function collectUniqueIds(items, label) {
  const ids = [];
  const seen = {};

  for (const [i, item] of items.entries()) {
    assertString(item.id, label + "[" + i + "].id");

    if (seen[item.id]) {
      throw new Error(label + " contains duplicate id: " + item.id);
    }

    seen[item.id] = true;
    ids.push(item.id);
  }

  return ids;
}

function getMaxVehicleCapacity(vehicles) {
  let max = 0;

  for (const vehicle of vehicles) {
    if (vehicle.capacity > max) {
      max = vehicle.capacity;
    }
  }

  return max;
}

function assertKnownLocation(locationIds, locationId, label) {
  assertString(locationId, label);

  if (!locationIds.includes(locationId)) {
    throw new Error(label + " must reference a known location: " + locationId);
  }
}

function assertArray(value, label) {
  if (!Array.isArray(value)) {
    throw new TypeError(label + " must be an array");
  }
}

function assertObject(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(label + " must be an object");
  }
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(label + " must be a non-empty string");
  }
}

function assertNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(label + " must be a finite number");
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

function validateConstraints(constraints, orderIds, vehicles) {
  if (constraints === undefined) {
    return;
  }

  assertObject(constraints, "constraints");
  assertOptionalBoolean(constraints.hardTimeWindows, "constraints.hardTimeWindows");
  assertOptionalBoolean(constraints.maxRouteDistance, "constraints.maxRouteDistance");

  if (constraints.maxRouteDistance === true) {
    for (const [vehicleIndex, vehicle] of vehicles.entries()) {
      if (vehicle.maxDistance === undefined) {
        throw new Error("vehicles[" + vehicleIndex + "].maxDistance is required when constraints.maxRouteDistance is true");
      }
    }
  }

  if (constraints.requiredOrderIds !== undefined) {
    validateRequiredOrderIds(constraints.requiredOrderIds, orderIds);
  }
}

function validateRequiredOrderIds(requiredOrderIds, orderIds) {
  assertArray(requiredOrderIds, "constraints.requiredOrderIds");

  const seen = {};

  for (const [i, orderId] of requiredOrderIds.entries()) {
    assertString(orderId, "constraints.requiredOrderIds[" + i + "]");

    if (seen[orderId]) {
      throw new Error("constraints.requiredOrderIds contains duplicate id: " + orderId);
    }

    if (!orderIds.includes(orderId)) {
      throw new Error("constraints.requiredOrderIds[" + i + "] must reference a known order: " + orderId);
    }

    seen[orderId] = true;
  }
}

function assertOptionalBoolean(value, label) {
  if (value !== undefined && typeof value !== "boolean") {
    throw new TypeError(label + " must be a boolean");
  }
}
