export default function validateSalesDecisionScenario(scenario) {
  assertObject(scenario, "scenario");
  assertString(scenario.id, "scenario.id");
  assertObject(scenario.source, "scenario.source");
  assertString(scenario.source.system, "scenario.source.system");
  assertObject(scenario.salesContext, "scenario.salesContext");
  assertString(scenario.salesContext.id, "scenario.salesContext.id");
  assertString(scenario.salesContext.name, "scenario.salesContext.name");
  assertArray(scenario.items, "scenario.items");
  assertArray(scenario.demandAssumptions, "scenario.demandAssumptions");
  assertObject(scenario.constraints, "scenario.constraints");
  assertBoolean(scenario.constraints.oversellAllowed, "scenario.constraints.oversellAllowed");
  assertObject(scenario.objective, "scenario.objective");
  assertString(scenario.objective.maximize, "scenario.objective.maximize");
  assertObject(scenario.objective.penalties, "scenario.objective.penalties");
  assertNonNegativeInteger(scenario.objective.penalties.stockoutPenalty, "scenario.objective.penalties.stockoutPenalty");
  assertNonNegativeInteger(scenario.objective.penalties.unusedCapacityPenalty, "scenario.objective.penalties.unusedCapacityPenalty");

  const itemIds = collectUniqueIds(scenario.items, "items");
  const demandItemIds = collectUniqueItemIds(scenario.demandAssumptions);

  if (scenario.items.length === 0) {
    throw new Error("scenario.items must contain at least one item");
  }

  for (let itemIndex = 0; itemIndex < scenario.items.length; itemIndex += 1) {
    const item = scenario.items[itemIndex];
    assertString(item.id, "items[" + itemIndex + "].id");
    assertString(item.name, "items[" + itemIndex + "].name");
    assertPositiveInteger(item.unitPrice, "items[" + itemIndex + "].unitPrice");
    assertNonNegativeInteger(item.availableQuantity, "items[" + itemIndex + "].availableQuantity");

    if (item.serviceCapacity !== undefined) {
      assertNonNegativeInteger(item.serviceCapacity, "items[" + itemIndex + "].serviceCapacity");
    }
  }

  for (let demandIndex = 0; demandIndex < scenario.demandAssumptions.length; demandIndex += 1) {
    const demand = scenario.demandAssumptions[demandIndex];
    assertKnownItem(itemIds, demand.itemId, "demandAssumptions[" + demandIndex + "].itemId");
    assertNonNegativeInteger(demand.expectedDemand, "demandAssumptions[" + demandIndex + "].expectedDemand");
  }

  for (let itemIndex = 0; itemIndex < itemIds.length; itemIndex += 1) {
    if (!demandItemIds[itemIds[itemIndex]]) {
      throw new Error("demandAssumptions must include itemId: " + itemIds[itemIndex]);
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

function collectUniqueItemIds(demandAssumptions) {
  const seen = {};

  for (let i = 0; i < demandAssumptions.length; i += 1) {
    assertString(demandAssumptions[i].itemId, "demandAssumptions[" + i + "].itemId");

    if (seen[demandAssumptions[i].itemId]) {
      throw new Error("demandAssumptions contains duplicate itemId: " + demandAssumptions[i].itemId);
    }

    seen[demandAssumptions[i].itemId] = true;
  }

  return seen;
}

function assertKnownItem(itemIds, itemId, label) {
  assertString(itemId, label);

  if (!itemIds.includes(itemId)) {
    throw new Error(label + " must reference a known item: " + itemId);
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

function assertBoolean(value, label) {
  if (typeof value !== "boolean") {
    throw new Error(label + " must be a boolean");
  }
}

function assertPositiveInteger(value, label) {
  assertInteger(value, label);

  if (value <= 0) {
    throw new Error(label + " must be greater than zero");
  }
}

function assertNonNegativeInteger(value, label) {
  assertInteger(value, label);

  if (value < 0) {
    throw new Error(label + " must be greater than or equal to zero");
  }
}

function assertInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new Error(label + " must be an integer");
  }
}
