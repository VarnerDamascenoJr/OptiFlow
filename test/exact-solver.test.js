import assert from "node:assert/strict";
import test from "node:test";
import { solveScenario } from "../src/index.js";

test("exact enumeration can extend a prefix whose direct return exceeds the distance limit", function testNonmetricDistance() {
  const result = solveScenario(createScenario(), { strategy: "exact-enumeration" });

  assert.deepStrictEqual(
    result.routes[0].stops.filter(stop => stop.type === "order").map(stop => stop.orderId),
    ["order-a", "order-b"]
  );
  assert.strictEqual(result.metrics.totalDistance, 3);
  assert.strictEqual(result.metrics.totalCost, 3);
  assert.deepStrictEqual(result.unassignedOrderIds, []);
});

test("exact enumeration excludes routes whose final return exceeds the distance limit", function testFinalReturn() {
  const scenario = createScenario();
  scenario.vehicles[0].capacity = 1;

  const result = solveScenario(scenario, { strategy: "exact-enumeration" });

  assert.strictEqual(result.metrics.servedOrders, 0);
  assert.strictEqual(result.metrics.totalDistance, 0);
  assert.deepStrictEqual(result.unassignedOrderIds, ["order-a", "order-b"]);
});

test("exact enumeration still enforces hard service windows when deferring the return check", function testHardWindow() {
  const scenario = createScenario();
  scenario.constraints.hardTimeWindows = true;
  scenario.orders[1].timeWindow.endMinutes = 2;

  const result = solveScenario(scenario, { strategy: "exact-enumeration" });

  assert.strictEqual(result.metrics.servedOrders, 0);
  assert.deepStrictEqual(result.unassignedOrderIds, ["order-a", "order-b"]);
});

test("exact enumeration leaves distance unlimited when the constraint is disabled", function testDisabledDistance() {
  const scenario = createScenario();
  scenario.vehicles[0].capacity = 1;
  scenario.constraints.maxRouteDistance = false;

  const result = solveScenario(scenario, { strategy: "exact-enumeration" });

  assert.strictEqual(result.metrics.servedOrders, 1);
  assert.strictEqual(result.metrics.totalDistance, 11);
  assert.strictEqual(result.metrics.totalCost, 1011);
});

test("exact enumeration rejects even an empty route when its diagonal exceeds the distance limit", function testEmptyRouteDistance() {
  const scenario = createScenario();
  scenario.orders = [];
  scenario.distanceMatrix.depot.depot = 4;

  assert.throws(function solve() {
    solveScenario(scenario, { strategy: "exact-enumeration" });
  }, /did not produce a feasible plan/);
});

test("exact enumeration can find a valid route even when the empty route exceeds the distance limit", function testInvalidEmptyPrefix() {
  const scenario = createScenario();
  scenario.distanceMatrix.depot.depot = 4;

  const result = solveScenario(scenario, { strategy: "exact-enumeration" });

  assert.strictEqual(result.metrics.servedOrders, 2);
  assert.strictEqual(result.metrics.totalDistance, 3);
});

function createScenario() {
  return {
    id: "nonmetric-route-distance",
    operation: { startTimeMinutes: 0 },
    costs: { distanceUnitCost: 1, lateMinutePenalty: 0, unassignedOrderPenalty: 1000 },
    locations: ["depot", "a", "b"].map(id => ({ id })),
    vehicles: [{ id: "vehicle", capacity: 2, startLocationId: "depot", maxDistance: 3 }],
    orders: ["a", "b"].map(id => ({
      id: "order-" + id,
      locationId: id,
      demand: 1,
      serviceTimeMinutes: 1,
      timeWindow: { startMinutes: 0, endMinutes: 100 }
    })),
    distanceMatrix: {
      depot: { depot: 0, a: 1, b: 10 },
      a: { depot: 10, a: 0, b: 1 },
      b: { depot: 1, a: 10, b: 0 }
    },
    constraints: { maxRouteDistance: true }
  };
}
