import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildUnassignedOrderDetails, readScenarioConstraints } from "./constraints.js";
import buildRoute from "./shared/route-builder.js";

const bridgePath = fileURLToPath(new URL("../solver/ortools_solver.py", import.meta.url));
const virtualPython = fileURLToPath(new URL(
  process.platform === "win32" ? "../.venv/Scripts/python.exe" : "../.venv/bin/python",
  import.meta.url
));

export default function createOrToolsPlan(scenario, options = {}) {
  const maxOrders = readOption(options.maxOrders, 50, "maxOrders");
  const timeoutMs = readOption(options.timeoutMs, 1000, "timeoutMs");

  if (scenario.orders.length > maxOrders) {
    throw new Error("or-tools supports at most " + maxOrders + " orders; received " + scenario.orders.length);
  }

  const python = process.env.OPTIFLOW_PYTHON || (existsSync(virtualPython) ? virtualPython : "python3");
  const processResult = spawnSync(python, [bridgePath], {
    input: JSON.stringify({ scenario: scenario, options: { timeoutMs: timeoutMs } }),
    encoding: "utf8",
    timeout: timeoutMs + 5000,
    maxBuffer: 8 * 1024 * 1024
  });

  if (processResult.error) {
    if (processResult.error.code === "ETIMEDOUT") {
      throw new Error("or-tools Python process exceeded its timeout (including startup allowance)");
    }
    throw new Error("Cannot start OR-Tools Python; configure OPTIFLOW_PYTHON or install .venv: " + processResult.error.message);
  }

  if (processResult.status !== 0) {
    throw new Error("or-tools solver failed: " + (processResult.stderr.trim() || processResult.signal || processResult.status));
  }

  let solution;
  try {
    solution = JSON.parse(processResult.stdout);
  } catch {
    throw new Error("or-tools returned invalid JSON");
  }

  if (
    !solution || !Array.isArray(solution.routes) || solution.routes.length !== scenario.vehicles.length ||
    !["OPTIMAL", "FEASIBLE"].includes(solution.solverInfo?.status)
  ) {
    throw new Error("or-tools returned an invalid solution");
  }

  const timeScale = readScale(solution.scales?.time);
  const quantityScale = readScale(solution.scales?.quantity);
  const integerScenario = scaleScenario(scenario, timeScale, quantityScale);
  const ordersById = new Map(integerScenario.orders.map(order => [order.id, order]));
  const servedIds = new Set();
  const constraints = readScenarioConstraints(scenario);
  const routes = solution.routes.map(function mapRoute(orderIds, vehicleIndex) {
    if (!Array.isArray(orderIds)) {
      throw new Error("or-tools returned an invalid route");
    }
    const orders = orderIds.map(function mapOrder(id) {
      if (!ordersById.has(id) || servedIds.has(id)) {
        throw new Error("or-tools returned an unknown or repeated order: " + id);
      }
      servedIds.add(id);
      return ordersById.get(id);
    });
    const vehicle = integerScenario.vehicles[vehicleIndex];
    const { orderIds: internalOrderIds, ...route } = buildRoute(integerScenario, vehicle, orders);

    if (
      route.usedCapacity > vehicle.capacity ||
      (constraints.maxRouteDistance && route.totalDistance > vehicle.maxDistance) ||
      (constraints.hardTimeWindows && route.stops.some(stop => stop.lateMinutes > 0))
    ) {
      throw new Error("or-tools returned a route that violates scenario constraints");
    }
    return restoreRouteUnits(route, timeScale, quantityScale);
  });
  const unassignedOrderIds = scenario.orders.filter(order => !servedIds.has(order.id)).map(order => order.id);
  const totalDistance = routes.reduce((sum, route) => sum + route.totalDistance, 0);
  const totalLateMinutes = routes.reduce((sum, route) =>
    sum + route.stops.reduce((late, stop) => late + stop.lateMinutes, 0), 0);
  // Rebuilding at the earliest possible times can improve a time-limited incumbent's schedule.
  const objectiveValue = totalDistance * scenario.costs.distanceUnitCost +
    totalLateMinutes * scenario.costs.lateMinutePenalty +
    unassignedOrderIds.length * scenario.costs.unassignedOrderPenalty;

  return {
    strategy: "or-tools",
    routes: routes,
    unassignedOrderIds: unassignedOrderIds,
    unassignedOrderDetails: buildUnassignedOrderDetails(scenario, unassignedOrderIds, constraints),
    solverInfo: { ...solution.solverInfo, objectiveValue: objectiveValue }
  };
}

function readScale(value) {
  if (!Number.isInteger(value) || value < 1 || value > 1000000 || !Number.isInteger(Math.log10(value))) {
    throw new Error("or-tools returned an invalid numeric scale");
  }
  return value;
}

function scaleValue(value, scale) {
  const integer = Math.round(value * scale);
  if (!Number.isSafeInteger(integer)) {
    throw new Error("or-tools scenario cannot be reconstructed with safe integers");
  }
  return integer;
}

function scaleScenario(scenario, timeScale, quantityScale) {
  return {
    ...scenario,
    operation: { ...scenario.operation, startTimeMinutes: scaleValue(scenario.operation.startTimeMinutes, timeScale) },
    vehicles: scenario.vehicles.map(vehicle => ({
      ...vehicle,
      capacity: scaleValue(vehicle.capacity, quantityScale),
      ...(scenario.constraints?.maxRouteDistance ? { maxDistance: scaleValue(vehicle.maxDistance, timeScale) } : {})
    })),
    orders: scenario.orders.map(order => ({
      ...order,
      demand: scaleValue(order.demand, quantityScale),
      serviceTimeMinutes: scaleValue(order.serviceTimeMinutes, timeScale),
      timeWindow: {
        ...order.timeWindow,
        startMinutes: scaleValue(order.timeWindow.startMinutes, timeScale),
        endMinutes: scaleValue(order.timeWindow.endMinutes, timeScale)
      }
    })),
    distanceMatrix: Object.fromEntries(scenario.locations.map(from => [from.id,
      Object.fromEntries(scenario.locations.map(to => [to.id,
        scaleValue(scenario.distanceMatrix[from.id][to.id], timeScale)
      ]))
    ]))
  };
}

function restoreRouteUnits(route, timeScale, quantityScale) {
  return {
    ...route,
    capacity: route.capacity / quantityScale,
    usedCapacity: route.usedCapacity / quantityScale,
    totalDistance: route.totalDistance / timeScale,
    stops: route.stops.map(stop => ({
      ...stop,
      arrivalTimeMinutes: stop.arrivalTimeMinutes / timeScale,
      serviceStartMinutes: stop.serviceStartMinutes / timeScale,
      departureTimeMinutes: stop.departureTimeMinutes / timeScale,
      distanceFromPrevious: stop.distanceFromPrevious / timeScale,
      lateMinutes: stop.lateMinutes / timeScale,
      loadAfterStop: stop.loadAfterStop / quantityScale,
      ...(stop.demand !== undefined ? { demand: stop.demand / quantityScale } : {})
    }))
  };
}

function readOption(value, fallback, label) {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isSafeInteger(value) || value <= 0 || value > 2147478647) {
    throw new Error("or-tools " + label + " must be a positive integer no greater than 2147478647");
  }
  return value;
}
