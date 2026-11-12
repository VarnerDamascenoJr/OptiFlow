import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { compareStrategies, renderComparisonReport, solveScenario } from "../src/index.js";

const scenarioDirectory = new URL("../data/scenarios/", import.meta.url);
const sample = JSON.parse(fs.readFileSync(new URL("small-delivery.json", scenarioDirectory), "utf8"));
const solver = { timeoutMs: 3000 };

test("OR-Tools matches exact enumeration on every deterministic benchmark", function testBenchmarks() {
  for (const file of fs.readdirSync(scenarioDirectory).filter(name => name.endsWith(".json"))) {
    const scenario = JSON.parse(fs.readFileSync(new URL(file, scenarioDirectory), "utf8"));
    const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });
    const exact = solveScenario(scenario, { strategy: "exact-enumeration" });

    assert.strictEqual(result.metrics.totalCost, exact.metrics.totalCost, file);
    assert.strictEqual(result.solverInfo.status, "OPTIMAL", file);
    assert.strictEqual(result.solverInfo.bestObjectiveBound, result.solverInfo.objectiveValue, file);
    assert.strictEqual(result.solverInfo.objectiveValue, result.metrics.totalCost, file);
    assertValidPlan(scenario, result);
  }
});

test("OR-Tools preserves comparison metadata and uses the same objective", function testComparison() {
  const comparison = compareStrategies(sample, { candidateStrategy: "or-tools", solver: solver });

  assert.strictEqual(comparison.candidate.metrics.totalCost, 744);
  assert.strictEqual(comparison.deltas.totalCostGain, 48);
  assert.strictEqual(comparison.candidate.solverInfo.status, "OPTIMAL");
  assert.match(renderComparisonReport(comparison), /solver_status=OPTIMAL, objective_bound=744/);
});

test("OR-Tools respects hard service windows and keeps required IDs diagnostic", function testWindows() {
  const scenario = readScenario("benchmark-deadline-latency.json");
  scenario.constraints = { hardTimeWindows: true, requiredOrderIds: [scenario.orders[0].id] };
  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 0);
  assert.strictEqual(result.unassignedOrderDetails[0].required, true);
  assert.strictEqual(result.solverInfo.status, "OPTIMAL");
});

test("OR-Tools handles nonmetric final route distance without unsafe prefix pruning", function testDistance() {
  const scenario = nonmetricScenario();
  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 2);
  assert.strictEqual(result.metrics.totalDistance, 3);
  assertValidPlan(scenario, result);

  scenario.vehicles[0].capacity = 1;
  const constrained = solveScenario(scenario, { strategy: "or-tools", solver: solver });
  assert.strictEqual(constrained.metrics.servedOrders, 0);
  scenario.constraints.maxRouteDistance = false;
  const unlimited = solveScenario(scenario, { strategy: "or-tools", solver: solver });
  assert.strictEqual(unlimited.metrics.servedOrders, 1);
});

test("OR-Tools accepts fractional demand, travel, windows and objective weights", function testDecimals() {
  const scenario = nonmetricScenario();
  scenario.vehicles[0].capacity = 0.5;
  scenario.vehicles[0].maxDistance = 1.5;
  for (const row of Object.values(scenario.distanceMatrix)) {
    for (const key of Object.keys(row)) row[key] /= 2;
  }
  for (const order of scenario.orders) {
    order.demand = 0.25;
    order.serviceTimeMinutes = 0.5;
    order.timeWindow.startMinutes = 0.25;
  }
  scenario.costs.distanceUnitCost = 0.25;
  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 2);
  assert.strictEqual(result.metrics.totalDemand, 0.5);
  assert.strictEqual(result.metrics.totalDistance, 1.5);
  assert.strictEqual(result.solverInfo.objectiveValue, 0.375);
  assert.strictEqual(result.metrics.totalCost, 0.38);
  assertValidPlan(scenario, result);
});

test("OR-Tools preserves a hard deadline at a large time origin with decimal travel", function testScaledDeadline() {
  const scenario = precisionScenario();
  scenario.constraints = { hardTimeWindows: true };

  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });
  const stop = result.routes[0].stops.find(stop => stop.orderId === "order-b");

  assert.strictEqual(result.metrics.servedOrders, 2);
  assert.strictEqual(result.solverInfo.status, "OPTIMAL");
  assert.strictEqual(stop.arrivalTimeMinutes, scenario.orders[1].timeWindow.endMinutes);
  assert.strictEqual(stop.lateMinutes, 0);
  assert.strictEqual(result.solverInfo.objectiveValue, 0.3);
  assertValidPlan(scenario, result);
});

test("OR-Tools does not charge a soft-window penalty for floating-point reconstruction error", function testScaledPenalty() {
  const scenario = precisionScenario();
  scenario.costs.lateMinutePenalty = 1000000;

  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.totalLateMinutes, 0);
  assert.strictEqual(result.metrics.latenessCost, 0);
  assert.strictEqual(result.metrics.totalCost, 0.3);
  assert.strictEqual(result.solverInfo.objectiveValue, result.solverInfo.bestObjectiveBound);
});

test("OR-Tools preserves a final-distance boundary with large and decimal segments", function testScaledDistance() {
  const scenario = nonmetricScenario();
  scenario.costs.distanceUnitCost = 0;
  scenario.vehicles[0].maxDistance = 1000000000.3;
  scenario.orders.forEach(order => { order.timeWindow.endMinutes = 10000000000; });
  scenario.distanceMatrix = {
    depot: { depot: 0, a: 1000000000, b: 2000000000 },
    a: { depot: 1, a: 0, b: 0.1 },
    b: { depot: 0.2, a: 1, b: 0 }
  };

  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 2);
  assert.strictEqual(result.routes[0].totalDistance, scenario.vehicles[0].maxDistance);
  assertValidPlan(scenario, result);
});

test("OR-Tools preserves a capacity boundary with large and decimal demands", function testScaledCapacity() {
  const scenario = nonmetricScenario();
  scenario.locations = [{ id: "depot" }];
  scenario.distanceMatrix = { depot: { depot: 0 } };
  scenario.constraints = { hardTimeWindows: true };
  scenario.vehicles[0].capacity = 1000000000.3;
  scenario.orders = [1000000000, 0.1, 0.2].map((demand, i) => ({
    id: "order-" + i,
    locationId: "depot",
    demand: demand,
    serviceTimeMinutes: 1,
    timeWindow: { startMinutes: i, endMinutes: i }
  }));

  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 3);
  assert.strictEqual(result.routes[0].usedCapacity, scenario.vehicles[0].capacity);
  assertValidPlan(scenario, result);
});

test("OR-Tools still rejects service that misses a hard deadline by one supported decimal unit", function testRealLateness() {
  const scenario = precisionScenario();
  scenario.operation.startTimeMinutes = 0;
  scenario.orders.forEach(order => { order.timeWindow.startMinutes = 0; order.timeWindow.endMinutes = 1; });
  scenario.orders[1].timeWindow.endMinutes = 0.299999;
  scenario.constraints = { hardTimeWindows: true };

  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 1);
  assert.deepStrictEqual(result.unassignedOrderIds, ["order-b"]);
  assertValidPlan(scenario, result);
});

test("OR-Tools handles separate orders at the same location and multiple depots", function testLocations() {
  const scenario = nonmetricScenario();
  scenario.constraints = {};
  scenario.orders[1].locationId = "a";
  scenario.orders[1].demand = 2;
  scenario.vehicles.push({ id: "second", capacity: 1, startLocationId: "b" });
  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 2);
  assertValidPlan(scenario, result);
  for (const route of result.routes) {
    const vehicle = scenario.vehicles.find(item => item.id === route.vehicleId);
    assert.strictEqual(route.stops[0].locationId, vehicle.startLocationId);
    assert.strictEqual(route.stops.at(-1).locationId, vehicle.startLocationId);
  }
});

test("OR-Tools supports more than the exact enumerator's default eight orders", function testLargerScenario() {
  const scenario = nonmetricScenario();
  scenario.constraints = {};
  scenario.vehicles[0].capacity = 9;
  scenario.orders = Array.from({ length: 9 }, (_, i) => ({ ...scenario.orders[0], id: "order-" + i }));
  const result = solveScenario(scenario, { strategy: "or-tools", solver: solver });

  assert.strictEqual(result.metrics.servedOrders, 9);
  assertValidPlan(scenario, result);
});

test("OR-Tools includes empty-route diagonal distance and reports infeasibility", function testEmptyScenario() {
  const scenario = nonmetricScenario();
  scenario.orders = [];
  const empty = solveScenario(scenario, { strategy: "or-tools", solver: solver });
  assert.strictEqual(empty.metrics.totalCost, 0);
  scenario.distanceMatrix.depot.depot = 4;
  assert.throws(function solve() {
    solveScenario(scenario, { strategy: "or-tools", solver: solver });
  }, /INFEASIBLE/);
});

test("OR-Tools returns clear option, numeric precision and size errors", function testLimits() {
  assert.throws(() => solveScenario(sample, { strategy: "or-tools", solver: { timeoutMs: 0 } }), /timeoutMs must be a positive integer/);
  assert.throws(() => solveScenario(sample, { strategy: "or-tools", solver: { maxOrders: 1 } }), /supports at most 1 orders; received 4/);
  const scenario = nonmetricScenario();
  scenario.orders[0].demand = 0.1234567;
  assert.throws(() => solveScenario(scenario, { strategy: "or-tools", solver: solver }), /at most six decimal places/);
  scenario.orders[0].demand = 1;
  scenario.costs.distanceUnitCost = 1e13;
  assert.throws(() => solveScenario(scenario, { strategy: "or-tools", solver: solver }), /numeric range/);
});

test("OR-Tools reports a missing Python executable without falling back to a heuristic", function testMissingPython(t) {
  const previous = process.env.OPTIFLOW_PYTHON;
  process.env.OPTIFLOW_PYTHON = path.join(path.parse(process.cwd()).root, "missing-optiflow-python");
  t.after(() => {
    if (previous === undefined) delete process.env.OPTIFLOW_PYTHON;
    else process.env.OPTIFLOW_PYTHON = previous;
  });
  assert.throws(() => solveScenario(sample, { strategy: "or-tools" }), /Cannot start OR-Tools Python/);
});

test("OR-Tools reports when its search limit expires without a feasible solution", function testTimeout() {
  const scenario = nonmetricScenario();
  scenario.constraints = {};
  scenario.vehicles[0].capacity = 30;
  scenario.orders = Array.from({ length: 30 }, (_, i) => ({ ...scenario.orders[0], id: "order-" + i }));
  assert.throws(function solve() {
    solveScenario(scenario, { strategy: "or-tools", solver: { timeoutMs: 1 } });
  }, /UNKNOWN.*without a feasible plan/);
});

function assertValidPlan(scenario, result) {
  const ids = result.routes.flatMap(route => route.stops.filter(stop => stop.type === "order").map(stop => stop.orderId));
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.deepStrictEqual([...ids, ...result.unassignedOrderIds].sort(), scenario.orders.map(order => order.id).sort());
  for (const route of result.routes) {
    assert.ok(route.usedCapacity <= route.capacity);
    if (scenario.constraints?.maxRouteDistance) {
      const vehicle = scenario.vehicles.find(item => item.id === route.vehicleId);
      assert.ok(route.totalDistance <= vehicle.maxDistance);
    }
    if (scenario.constraints?.hardTimeWindows) assert.ok(route.stops.every(stop => stop.lateMinutes === 0));
  }
}

function readScenario(name) {
  return JSON.parse(fs.readFileSync(new URL(name, scenarioDirectory), "utf8"));
}

function nonmetricScenario() {
  return {
    id: "or-tools-nonmetric",
    operation: { startTimeMinutes: 0 },
    costs: { distanceUnitCost: 1, lateMinutePenalty: 0, unassignedOrderPenalty: 1000 },
    locations: ["depot", "a", "b"].map(id => ({ id })),
    vehicles: [{ id: "vehicle", capacity: 2, startLocationId: "depot", maxDistance: 3 }],
    orders: ["a", "b"].map(id => ({ id: "order-" + id, locationId: id, demand: 1, serviceTimeMinutes: 1, timeWindow: { startMinutes: 0, endMinutes: 100 } })),
    distanceMatrix: { depot: { depot: 0, a: 1, b: 10 }, a: { depot: 10, a: 0, b: 1 }, b: { depot: 1, a: 10, b: 0 } },
    constraints: { maxRouteDistance: true }
  };
}

function precisionScenario() {
  const scenario = nonmetricScenario();
  const start = 1000000000;
  scenario.operation.startTimeMinutes = start;
  scenario.constraints = {};
  scenario.orders.forEach(order => {
    order.serviceTimeMinutes = 0.1;
    order.timeWindow = { startMinutes: start, endMinutes: start + 1 };
  });
  scenario.orders[1].timeWindow.endMinutes = start + 0.3;
  scenario.distanceMatrix = {
    depot: { depot: 0, a: 0.1, b: 1 },
    a: { depot: 1, a: 0, b: 0.1 },
    b: { depot: 0.1, a: 1, b: 0 }
  };
  return scenario;
}
