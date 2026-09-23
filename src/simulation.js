import evaluatePlan from "./metrics.js";
import { createSalesEventCalibration } from "./sales-event-priors.js";
import { mean, readPositiveInteger, round } from "./shared/numbers.js";
import { createPlanForStrategy } from "./shared/plan-factory.js";
import validateScenario from "./validate-scenario.js";

const DEFAULT_SIMULATION_OPTIONS = {
  iterations: 100,
  seed: 20260916,
  strategy: "nearest-neighbor-capacity",
  uncertainty: {
    demandVariationRate: 0.1,
    demandVariationProbability: 0.25,
    cancellationProbability: 0.03,
    travelTimeVariationRate: 0.15
  }
};

export function simulateFixedPlan(scenario, options = {}) {
  validateScenario(scenario);

  const simulationOptions = normalizeSimulationOptions(options);
  const baseResult = solveBaseScenario(scenario, simulationOptions.strategy, options.solver || {});
  const random = createSeededRandom(simulationOptions.seed);
  const samples = [];

  for (let iteration = 0; iteration < simulationOptions.iterations; iteration += 1) {
    const sampledScenario = sampleScenario(scenario, simulationOptions.uncertainty, random);
    const samplePlan = evaluateFixedPlanAgainstScenario(sampledScenario, baseResult);
    const sampleMetrics = evaluatePlan(sampledScenario, samplePlan);

    samples.push({
      iteration: iteration + 1,
      metrics: sampleMetrics
    });
  }

  return {
    scenarioId: scenario.id,
    strategy: baseResult.strategy,
    seed: simulationOptions.seed,
    iterations: simulationOptions.iterations,
    uncertainty: simulationOptions.uncertainty,
    calibration: simulationOptions.calibration,
    baseMetrics: baseResult.metrics,
    summary: summarizeSamples(samples),
    samples: samples
  };
}

function solveBaseScenario(scenario, strategy, solverOptions) {
  const plan = createPlanForStrategy(scenario, strategy, solverOptions);

  return {
    scenarioId: scenario.id,
    strategy: plan.strategy,
    routes: plan.routes,
    unassignedOrderDetails: plan.unassignedOrderDetails || [],
    unassignedOrderIds: plan.unassignedOrderIds,
    metrics: evaluatePlan(scenario, plan)
  };
}

function evaluateFixedPlanAgainstScenario(sampledScenario, baseResult) {
  const ordersById = indexById(sampledScenario.orders);
  const vehiclesById = indexById(sampledScenario.vehicles);
  const routes = baseResult.routes.map(function mapRoute(route) {
    const vehicle = vehiclesById[route.vehicleId];
    let currentLocationId = vehicle.startLocationId;
    let currentTime = sampledScenario.operation.startTimeMinutes;
    let usedCapacity = 0;
    let totalDistance = 0;
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

    for (const stop of route.stops) {
      if (stop.type !== "order") {
        continue;
      }

      const order = ordersById[stop.orderId];
      const distance = sampledScenario.distanceMatrix[currentLocationId][order.locationId];
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
        arrivalTimeMinutes: round(arrivalTime, 4),
        serviceStartMinutes: round(serviceStart, 4),
        departureTimeMinutes: round(departureTime, 4),
        loadAfterStop: round(usedCapacity, 4),
        distanceFromPrevious: distance,
        lateMinutes: round(lateMinutes, 4)
      });
    }

    const returnDistance = sampledScenario.distanceMatrix[currentLocationId][vehicle.startLocationId];
    totalDistance += returnDistance;
    currentTime += returnDistance;

    stops.push({
      type: "end",
      locationId: vehicle.startLocationId,
      arrivalTimeMinutes: round(currentTime, 4),
      serviceStartMinutes: round(currentTime, 4),
      departureTimeMinutes: round(currentTime, 4),
      loadAfterStop: round(usedCapacity, 4),
      distanceFromPrevious: returnDistance,
      lateMinutes: 0
    });

    return {
      vehicleId: route.vehicleId,
      stops: stops,
      totalDistance: round(totalDistance, 4),
      usedCapacity: round(usedCapacity, 4),
      capacity: vehicle.capacity
    };
  });
  const unassignedOrderIds = baseResult.unassignedOrderIds.filter(function keepActiveUnassignedOrder(orderId) {
    return ordersById[orderId].demand > 0;
  });

  return {
    routes: routes,
    strategy: baseResult.strategy,
    unassignedOrderIds: unassignedOrderIds
  };
}

export function summarizeSamples(samples) {
  const totalCosts = samples.map(function mapCost(sample) {
    return sample.metrics.totalCost;
  });
  const totalLateMinutes = samples.map(function mapLateMinutes(sample) {
    return sample.metrics.totalLateMinutes;
  });
  const unassignedOrders = samples.map(function mapUnassigned(sample) {
    return sample.metrics.unassignedOrders;
  });

  return {
    totalCost: summarizeNumericSeries(totalCosts),
    totalLateMinutes: summarizeNumericSeries(totalLateMinutes),
    unassignedOrders: summarizeNumericSeries(unassignedOrders),
    lateProbability: probability(samples, function hasLateMinutes(sample) {
      return sample.metrics.totalLateMinutes > 0;
    }),
    unassignedProbability: probability(samples, function hasUnassignedOrders(sample) {
      return sample.metrics.unassignedOrders > 0;
    })
  };
}

function sampleScenario(scenario, uncertainty, random) {
  const sampledScenario = structuredClone(scenario);

  sampledScenario.orders = sampledScenario.orders.map(function sampleOrder(order) {
    const sampledOrder = { ...order };

    if (random() < uncertainty.cancellationProbability) {
      sampledOrder.demand = 0;
    } else {
      const demandMultiplier = sampleSymmetricMultiplier(random, uncertainty.demandVariationRate);
      sampledOrder.demand =
        random() < uncertainty.demandVariationProbability
          ? round(Math.max(0, order.demand * demandMultiplier), 4)
          : order.demand;
    }

    return sampledOrder;
  });

  sampledScenario.distanceMatrix = sampleDistanceMatrix(
    sampledScenario.distanceMatrix,
    uncertainty.travelTimeVariationRate,
    random
  );

  return sampledScenario;
}

function sampleDistanceMatrix(distanceMatrix, variationRate, random) {
  const sampledMatrix = {};

  for (const fromId of Object.keys(distanceMatrix)) {
    sampledMatrix[fromId] = {};

    for (const toId of Object.keys(distanceMatrix[fromId])) {
      const value = distanceMatrix[fromId][toId];

      sampledMatrix[fromId][toId] =
        value === 0 ? 0 : round(Math.max(0, value * sampleSymmetricMultiplier(random, variationRate)), 4);
    }
  }

  return sampledMatrix;
}

function summarizeNumericSeries(values) {
  const sorted = values.slice().sort(function sortNumbers(left, right) {
    return left - right;
  });

  return {
    mean: round(mean(sorted), 4),
    median: round(percentile(sorted, 0.5), 4),
    p90: round(percentile(sorted, 0.9), 4),
    p95: round(percentile(sorted, 0.95), 4),
    worstCase: round(sorted[sorted.length - 1] || 0, 4)
  };
}

function percentile(sortedValues, quantile) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = (sortedValues.length - 1) * quantile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = index - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function probability(samples, predicate) {
  if (samples.length === 0) {
    return 0;
  }

  const matches = samples.filter(predicate).length;
  return round(matches / samples.length, 4);
}

function sampleSymmetricMultiplier(random, variationRate) {
  return 1 + (random() * 2 - 1) * variationRate;
}

function indexById(items) {
  return items.reduce(function index(result, item) {
    result[item.id] = item;
    return result;
  }, {});
}

function normalizeSimulationOptions(options) {
  const calibration = createSalesEventCalibration(options.salesEventPriors);
  const uncertainty = {
    ...DEFAULT_SIMULATION_OPTIONS.uncertainty,
    ...calibration.appliedUncertainty,
    ...pickDefinedUncertainty(options.uncertainty)
  };

  return {
    iterations: readPositiveInteger(options.iterations, DEFAULT_SIMULATION_OPTIONS.iterations),
    seed: readPositiveInteger(options.seed, DEFAULT_SIMULATION_OPTIONS.seed),
    strategy: options.strategy || DEFAULT_SIMULATION_OPTIONS.strategy,
    uncertainty: {
      demandVariationRate: readNonNegativeNumber(
        uncertainty.demandVariationRate,
        DEFAULT_SIMULATION_OPTIONS.uncertainty.demandVariationRate
      ),
      demandVariationProbability: readProbability(
        uncertainty.demandVariationProbability,
        DEFAULT_SIMULATION_OPTIONS.uncertainty.demandVariationProbability
      ),
      cancellationProbability: readProbability(
        uncertainty.cancellationProbability,
        DEFAULT_SIMULATION_OPTIONS.uncertainty.cancellationProbability
      ),
      travelTimeVariationRate: readNonNegativeNumber(
        uncertainty.travelTimeVariationRate,
        DEFAULT_SIMULATION_OPTIONS.uncertainty.travelTimeVariationRate
      )
    },
    calibration: calibration
  };
}

function pickDefinedUncertainty(uncertainty) {
  if (!uncertainty || typeof uncertainty !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(uncertainty).filter(function filterDefined(entry) {
      return entry[1] !== undefined;
    })
  );
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function readNonNegativeNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function readProbability(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1
    ? value
    : fallback;
}
