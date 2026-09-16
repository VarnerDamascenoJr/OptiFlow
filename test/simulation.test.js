import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { simulateFixedPlan, summarizeSamples } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("simulates a fixed plan with deterministic seeded uncertainty", function testSimulation() {
  const first = simulateFixedPlan(scenario, {
    iterations: 10,
    seed: 12345,
    uncertainty: {
      cancellationProbability: 0,
      demandVariationProbability: 1,
      demandVariationRate: 0.2,
      travelTimeVariationRate: 0.1
    }
  });
  const second = simulateFixedPlan(scenario, {
    iterations: 10,
    seed: 12345,
    uncertainty: {
      cancellationProbability: 0,
      demandVariationProbability: 1,
      demandVariationRate: 0.2,
      travelTimeVariationRate: 0.1
    }
  });

  assert.deepStrictEqual(first, second);
  assert.strictEqual(first.scenarioId, "small-delivery-v1");
  assert.strictEqual(first.strategy, "nearest-neighbor-capacity");
  assert.strictEqual(first.iterations, 10);
  assert.strictEqual(first.samples.length, 10);
  assert.strictEqual(first.baseMetrics.totalCost, 792);
  assert.ok(first.summary.totalCost.mean > 0);
  assert.ok(first.summary.totalCost.p95 >= first.summary.totalCost.median);
});

test("calculates descriptive statistics for simulation samples", function testSummaryStats() {
  const summary = summarizeSamples([
    sample(10, 0, 0),
    sample(20, 5, 0),
    sample(30, 0, 1),
    sample(40, 10, 1)
  ]);

  assert.deepStrictEqual(summary, {
    totalCost: {
      mean: 25,
      median: 25,
      p90: 37,
      p95: 38.5,
      worstCase: 40
    },
    totalLateMinutes: {
      mean: 3.75,
      median: 2.5,
      p90: 8.5,
      p95: 9.25,
      worstCase: 10
    },
    unassignedOrders: {
      mean: 0.5,
      median: 0.5,
      p90: 1,
      p95: 1,
      worstCase: 1
    },
    lateProbability: 0.5,
    unassignedProbability: 0.5
  });
});

test("keeps base deterministic metrics when uncertainty is disabled", function testNoUncertainty() {
  const result = simulateFixedPlan(scenario, {
    iterations: 5,
    seed: 7,
    uncertainty: {
      cancellationProbability: 0,
      demandVariationProbability: 0,
      demandVariationRate: 0,
      travelTimeVariationRate: 0
    }
  });

  assert.deepStrictEqual(
    result.samples.map(function mapCost(sample) {
      return sample.metrics.totalCost;
    }),
    [792, 792, 792, 792, 792]
  );
  assert.strictEqual(result.summary.lateProbability, 0);
  assert.strictEqual(result.summary.unassignedProbability, 1);
});

function sample(totalCost, totalLateMinutes, unassignedOrders) {
  return {
    metrics: {
      totalCost: totalCost,
      totalLateMinutes: totalLateMinutes,
      unassignedOrders: unassignedOrders
    }
  };
}
