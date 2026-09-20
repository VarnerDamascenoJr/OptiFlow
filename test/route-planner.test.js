import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import * as optiflow from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
const benchmarkScenarios = [
  {
    file: "benchmark-minimal-obvious.json",
    expected: {
      routeOrderIds: [["demand-a"]],
      servedOrders: 1,
      totalCost: 16,
      totalDistance: 8,
      totalLateMinutes: 0,
      unassignedOrderIds: []
    }
  },
  {
    file: "benchmark-capacity-insufficient.json",
    expected: {
      routeOrderIds: [["demand-a"]],
      servedOrders: 1,
      totalCost: 206,
      totalDistance: 6,
      totalLateMinutes: 0,
      unassignedOrderIds: ["demand-b"]
    }
  },
  {
    file: "benchmark-deadline-latency.json",
    expected: {
      routeOrderIds: [["critical-demand"]],
      servedOrders: 1,
      totalCost: 160,
      totalDistance: 10,
      totalLateMinutes: 3,
      unassignedOrderIds: []
    }
  },
  {
    file: "benchmark-multi-resource-tradeoff.json",
    expected: {
      routeOrderIds: [["near-demand"], ["far-demand"]],
      servedOrders: 2,
      totalCost: 52,
      totalDistance: 26,
      totalLateMinutes: 0,
      unassignedOrderIds: []
    }
  }
];

test("validates the sample scenario", function testValidateScenario() {
  assert.doesNotThrow(function validate() {
    optiflow.validateScenario(scenario);
  });
});

test("builds a deterministic nearest-neighbor baseline plan", function testBaselinePlan() {
  const result = optiflow.solveScenario(scenario);

  assert.strictEqual(result.scenarioId, "small-delivery-v1");
  assert.match(result.metadata.requestId, /^req_/);
  assert.match(result.metadata.correlationId, /^corr_/);
  assert.match(result.metadata.optimizationRunId, /^run_/);
  assert.strictEqual(result.metadata.transactionId, result.metadata.optimizationRunId);
  assert.strictEqual(result.metadata.service, "optiflow-core");
  assert.strictEqual(result.metadata.environment, "local");
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

test("cost-aware greedy serves an urgent order before a closer one", function testCostAwarePlan() {
  const deadlineScenario = readScenario("benchmark-cost-aware-deadline.json");
  const nearest = optiflow.solveScenario(deadlineScenario);
  const costAware = optiflow.solveScenario(deadlineScenario, { strategy: "cost-aware-greedy" });

  assert.deepStrictEqual(getRouteOrderIds(nearest.routes[0]), ["near-order", "urgent-order"]);
  assert.deepStrictEqual(getRouteOrderIds(costAware.routes[0]), ["urgent-order", "near-order"]);
  assert.strictEqual(nearest.metrics.totalDistance, 6);
  assert.strictEqual(costAware.metrics.totalDistance, 6);
  assert.strictEqual(nearest.metrics.totalLateMinutes, 4);
  assert.strictEqual(costAware.metrics.totalLateMinutes, 0);
  assert.strictEqual(nearest.metrics.totalCost, 46);
  assert.strictEqual(costAware.metrics.totalCost, 6);

  const hardDeadlineScenario = clone(deadlineScenario);
  hardDeadlineScenario.constraints = { hardTimeWindows: true };
  const hardDeadlinePlan = optiflow.solveScenario(hardDeadlineScenario, { strategy: "cost-aware-greedy" });

  assert.deepStrictEqual(getRouteOrderIds(hardDeadlinePlan.routes[0]), ["urgent-order", "near-order"]);
  assert.deepStrictEqual(hardDeadlinePlan.unassignedOrderIds, []);
});

test("preserves execution metadata provided by callers", function testProvidedMetadata() {
  const result = optiflow.solveScenario(scenario, {
    metadata: {
      requestId: "req-demo",
      correlationId: "corr-demo",
      transactionId: "delivery-wave-2026-09-09",
      optimizationRunId: "run-demo",
      service: "optiflow-api",
      environment: "test"
    }
  });

  assert.deepStrictEqual(result.metadata, {
    requestId: "req-demo",
    correlationId: "corr-demo",
    transactionId: "delivery-wave-2026-09-09",
    optimizationRunId: "run-demo",
    service: "optiflow-api",
    environment: "test"
  });
});

test("renders optimization metrics in Prometheus format", function testPrometheusMetrics() {
  const result = optiflow.solveScenario(scenario, {
    metadata: {
      service: "optiflow-core",
      environment: "test"
    }
  });
  const output = optiflow.renderOptimizationMetrics(result);

  assert.match(output, /optimization_runs_total\{.*service="optiflow-core".*\} 1/);
  assert.match(output, /optimization_plan_cost_total\{.*strategy="nearest-neighbor-capacity".*\} 792/);
  assert.match(output, /optimization_plan_distance_total\{.*environment="test".*\} 73/);
  assert.match(output, /optimization_plan_unassigned_orders_total\{.*status="succeeded".*\} 1/);
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

test("loads and solves all deterministic benchmark scenarios", function testBenchmarkScenarios() {
  for (const benchmark of benchmarkScenarios) {
    const benchmarkPath = path.join(__dirname, "..", "data", "scenarios", benchmark.file);
    const benchmarkScenario = JSON.parse(fs.readFileSync(benchmarkPath, "utf8"));

    assert.doesNotThrow(function validateBenchmarkScenario() {
      optiflow.validateScenario(benchmarkScenario);
    }, benchmark.file);

    const result = optiflow.solveScenario(benchmarkScenario);

    assert.deepStrictEqual(
      result.routes.map(getRouteOrderIds),
      benchmark.expected.routeOrderIds,
      benchmark.file
    );
    assert.deepStrictEqual(
      result.unassignedOrderIds,
      benchmark.expected.unassignedOrderIds,
      benchmark.file
    );
    assert.strictEqual(result.metrics.servedOrders, benchmark.expected.servedOrders, benchmark.file);
    assert.strictEqual(result.metrics.totalDistance, benchmark.expected.totalDistance, benchmark.file);
    assert.strictEqual(result.metrics.totalLateMinutes, benchmark.expected.totalLateMinutes, benchmark.file);
    assert.strictEqual(result.metrics.totalCost, benchmark.expected.totalCost, benchmark.file);
  }
});

test("solves the sample scenario with exact enumeration", function testExactSolver() {
  const result = optiflow.solveScenario(scenario, {
    strategy: "exact-enumeration"
  });

  assert.strictEqual(result.strategy, "exact-enumeration");
  assert.deepStrictEqual(
    getRouteOrderIds(result.routes[0]),
    ["order-north", "order-east"]
  );
  assert.deepStrictEqual(
    getRouteOrderIds(result.routes[1]),
    ["order-west"]
  );
  assert.deepStrictEqual(result.unassignedOrderIds, ["order-south"]);
  assert.strictEqual(result.metrics.totalDistance, 61);
  assert.strictEqual(result.metrics.totalCost, 744);
});

test("returns an explainable solver error when exact enumeration exceeds its limit", function testExactSolverLimit() {
  assert.throws(function solveWithTooSmallLimit() {
    optiflow.solveScenario(scenario, {
      solver: {
        maxOrders: 1
      },
      strategy: "exact-enumeration"
    });
  }, /exact-enumeration supports at most 1 orders; received 4/);
});

test("rejects unknown optimization strategies", function testUnknownStrategy() {
  assert.throws(function solveWithUnknownStrategy() {
    optiflow.solveScenario(scenario, {
      strategy: "missing-strategy"
    });
  }, /Unknown optimization strategy: missing-strategy/);
});

test("rejects invalid configurable constraints", function testInvalidConstraints() {
  const invalidScenario = clone(scenario);
  invalidScenario.constraints = {
    hardTimeWindows: "true"
  };

  assert.throws(function validate() {
    optiflow.validateScenario(invalidScenario);
  }, /constraints.hardTimeWindows must be a boolean/);

  const missingMaxDistanceScenario = clone(scenario);
  missingMaxDistanceScenario.constraints = {
    maxRouteDistance: true
  };

  assert.throws(function validateMissingMaxDistance() {
    optiflow.validateScenario(missingMaxDistanceScenario);
  }, /vehicles\[0\].maxDistance is required when constraints.maxRouteDistance is true/);

  const unknownRequiredOrderScenario = clone(scenario);
  unknownRequiredOrderScenario.constraints = {
    requiredOrderIds: ["missing-order"]
  };

  assert.throws(function validateUnknownRequiredOrder() {
    optiflow.validateScenario(unknownRequiredOrderScenario);
  }, /constraints.requiredOrderIds\[0\] must reference a known order: missing-order/);
});

test("can turn deadline windows into hard constraints", function testHardTimeWindowConstraint() {
  const constrainedScenario = readScenario("benchmark-deadline-latency.json");
  constrainedScenario.constraints = {
    hardTimeWindows: true,
    requiredOrderIds: ["critical-demand"]
  };

  const result = optiflow.solveScenario(constrainedScenario);

  assert.strictEqual(result.metrics.servedOrders, 0);
  assert.deepStrictEqual(result.unassignedOrderIds, ["critical-demand"]);
  assert.deepStrictEqual(result.unassignedOrderDetails, [
    {
      orderId: "critical-demand",
      reason: "hard_time_window_unreachable",
      required: true
    }
  ]);
});

test("can enable or disable maximum route distance constraints", function testMaxRouteDistanceConstraint() {
  const unconstrainedScenario = readScenario("benchmark-deadline-latency.json");
  unconstrainedScenario.vehicles[0].maxDistance = 8;

  const unconstrainedResult = optiflow.solveScenario(unconstrainedScenario);
  assert.strictEqual(unconstrainedResult.metrics.servedOrders, 1);

  const constrainedScenario = clone(unconstrainedScenario);
  constrainedScenario.constraints = {
    maxRouteDistance: true
  };

  const constrainedResult = optiflow.solveScenario(constrainedScenario);

  assert.strictEqual(constrainedResult.metrics.servedOrders, 0);
  assert.deepStrictEqual(constrainedResult.unassignedOrderDetails, [
    {
      orderId: "critical-demand",
      reason: "max_route_distance_exceeded",
      required: false
    }
  ]);
});

test("applies hard constraints to exact enumeration too", function testExactSolverConstraints() {
  const constrainedScenario = readScenario("benchmark-deadline-latency.json");
  constrainedScenario.constraints = {
    hardTimeWindows: true
  };

  const result = optiflow.solveScenario(constrainedScenario, {
    strategy: "exact-enumeration"
  });

  assert.strictEqual(result.metrics.servedOrders, 0);
  assert.deepStrictEqual(result.unassignedOrderIds, ["critical-demand"]);
  assert.deepStrictEqual(result.unassignedOrderDetails[0], {
    orderId: "critical-demand",
    reason: "hard_time_window_unreachable",
    required: false
  });
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

function readScenario(fileName) {
  const benchmarkPath = path.join(__dirname, "..", "data", "scenarios", fileName);
  return JSON.parse(fs.readFileSync(benchmarkPath, "utf8"));
}
