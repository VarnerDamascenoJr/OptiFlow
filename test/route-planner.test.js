import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as optiflow from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("validates the sample scenario", function testValidateScenario() {
  assert.doesNotThrow(function validate() {
    optiflow.validateScenario(scenario);
  });
});

test("builds a deterministic nearest-neighbor baseline plan", function testBaselinePlan() {
  const result = optiflow.solveScenario(scenario);

  assert.strictEqual(result.scenarioId, "small-delivery-v1");
  assert.strictEqual(result.strategy, "nearest-neighbor-capacity");
  assert.strictEqual(result.routes.length, 2);
  assert.deepStrictEqual(
    getRouteOrderIds(result.routes[0]),
    ["order-west", "order-north"]
  );
  assert.deepStrictEqual(
    getRouteOrderIds(result.routes[1]),
    ["order-east"]
  );
  assert.deepStrictEqual(result.unassignedOrderIds, ["order-south"]);
});

test("calculates core metrics for comparison with future solvers", function testMetrics() {
  const result = optiflow.solveScenario(scenario);

  assert.strictEqual(result.metrics.servedOrders, 3);
  assert.strictEqual(result.metrics.unassignedOrders, 1);
  assert.strictEqual(result.metrics.totalDemand, 12);
  assert.strictEqual(result.metrics.totalDistance, 73);
  assert.strictEqual(result.metrics.totalLateMinutes, 0);
  assert.strictEqual(result.metrics.distanceCost, 292);
  assert.strictEqual(result.metrics.unassignedCost, 500);
  assert.strictEqual(result.metrics.totalCost, 792);
  assert.deepStrictEqual(result.metrics.vehicleUtilization, [
    {
      vehicleId: "truck-1",
      usedCapacity: 7,
      capacity: 10,
      utilizationRate: 0.7
    },
    {
      vehicleId: "van-1",
      usedCapacity: 5,
      capacity: 6,
      utilizationRate: 0.8333
    }
  ]);
});

test("rejects orders that no vehicle can carry", function testInvalidDemand() {
  const invalidScenario = clone(scenario);
  invalidScenario.orders[0].demand = 999;

  assert.throws(function validate() {
    optiflow.validateScenario(invalidScenario);
  }, /demand exceeds every vehicle capacity/);
});

test("allows objective weights to be disabled with zero cost", function testZeroCostWeights() {
  const distanceOnlyScenario = clone(scenario);
  distanceOnlyScenario.costs.lateMinutePenalty = 0;
  distanceOnlyScenario.costs.unassignedOrderPenalty = 0;

  const result = optiflow.solveScenario(distanceOnlyScenario);

  assert.strictEqual(result.metrics.distanceCost, 292);
  assert.strictEqual(result.metrics.totalCost, 292);
});

function getRouteOrderIds(route) {
  return route.stops
    .filter(function filterOrderStops(stop) {
      return stop.type === "order";
    })
    .map(function mapOrderIds(stop) {
      return stop.orderId;
    });
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
