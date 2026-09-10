import validateSalesDecisionScenario from "./validate-sales-decision-scenario.js";

export default function evaluateSalesDecisionScenario(scenario) {
  validateSalesDecisionScenario(scenario);

  const demandByItemId = new Map(
    scenario.demandAssumptions.map(function mapDemand(demand) {
      return [demand.itemId, demand.expectedDemand];
    })
  );
  const itemResults = scenario.items.map(function evaluateItem(item) {
    const expectedDemand = demandByItemId.get(item.id);
    const availableCapacity = getAvailableCapacity(item);
    const acceptedDemand = scenario.constraints.oversellAllowed
      ? expectedDemand
      : Math.min(expectedDemand, availableCapacity);
    const lostDemand = Math.max(0, expectedDemand - acceptedDemand);
    const unusedCapacity = Math.max(0, availableCapacity - acceptedDemand);
    const potentialRevenue = expectedDemand * item.unitPrice;
    const expectedRevenue = acceptedDemand * item.unitPrice;
    const lostRevenue = lostDemand * item.unitPrice;
    const stockoutPenalty = lostDemand * scenario.objective.penalties.stockoutPenalty;
    const unusedCapacityPenalty = unusedCapacity * scenario.objective.penalties.unusedCapacityPenalty;
    const strategyValue = expectedRevenue - stockoutPenalty - unusedCapacityPenalty;

    return {
      itemId: item.id,
      itemName: item.name,
      unitPrice: item.unitPrice,
      expectedDemand: expectedDemand,
      availableCapacity: availableCapacity,
      acceptedDemand: acceptedDemand,
      lostDemand: lostDemand,
      unusedCapacity: unusedCapacity,
      potentialRevenue: potentialRevenue,
      expectedRevenue: expectedRevenue,
      lostRevenue: lostRevenue,
      stockoutPenalty: stockoutPenalty,
      unusedCapacityPenalty: unusedCapacityPenalty,
      strategyValue: strategyValue
    };
  });

  const totals = itemResults.reduce(function sumTotals(accumulator, itemResult) {
    accumulator.expectedDemand += itemResult.expectedDemand;
    accumulator.availableCapacity += itemResult.availableCapacity;
    accumulator.acceptedDemand += itemResult.acceptedDemand;
    accumulator.lostDemand += itemResult.lostDemand;
    accumulator.unusedCapacity += itemResult.unusedCapacity;
    accumulator.potentialRevenue += itemResult.potentialRevenue;
    accumulator.expectedRevenue += itemResult.expectedRevenue;
    accumulator.lostRevenue += itemResult.lostRevenue;
    accumulator.stockoutPenalty += itemResult.stockoutPenalty;
    accumulator.unusedCapacityPenalty += itemResult.unusedCapacityPenalty;
    accumulator.strategyValue += itemResult.strategyValue;
    return accumulator;
  }, {
    expectedDemand: 0,
    availableCapacity: 0,
    acceptedDemand: 0,
    lostDemand: 0,
    unusedCapacity: 0,
    potentialRevenue: 0,
    expectedRevenue: 0,
    lostRevenue: 0,
    stockoutPenalty: 0,
    unusedCapacityPenalty: 0,
    strategyValue: 0
  });

  return {
    scenarioId: scenario.id,
    strategy: {
      id: "deterministic-capacity-baseline",
      description: "Accept expected demand until item capacity is exhausted."
    },
    itemResults: itemResults,
    totals: {
      ...totals,
      serviceRate: ratio(totals.acceptedDemand, totals.expectedDemand),
      capacityUtilizationRate: ratio(totals.acceptedDemand, totals.availableCapacity),
      stockoutRate: ratio(totals.lostDemand, totals.expectedDemand)
    },
    warnings: buildWarnings(scenario, itemResults)
  };
}

function getAvailableCapacity(item) {
  if (item.serviceCapacity === undefined) {
    return item.availableQuantity;
  }

  return Math.min(item.availableQuantity, item.serviceCapacity);
}

function ratio(numerator, denominator) {
  if (denominator === 0) {
    return 0;
  }

  return round(numerator / denominator, 4);
}

function round(value, decimals) {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

function buildWarnings(scenario, itemResults) {
  const warnings = [];

  if (scenario.constraints.oversellAllowed) {
    warnings.push({
      code: "OVERSALE_ALLOWED",
      message: "Scenario allows accepting demand above current available capacity."
    });
  }

  for (let i = 0; i < itemResults.length; i += 1) {
    const itemResult = itemResults[i];

    if (itemResult.lostDemand > 0) {
      warnings.push({
        code: "STOCKOUT_RISK",
        itemId: itemResult.itemId,
        message: "Expected demand exceeds available capacity for this item."
      });
    }

    if (itemResult.unusedCapacity > 0) {
      warnings.push({
        code: "UNUSED_CAPACITY",
        itemId: itemResult.itemId,
        message: "Available capacity remains unused under expected demand."
      });
    }
  }

  return warnings;
}
