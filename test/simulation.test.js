import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { simulateFixedPlan, summarizeMonteCarloDiagnostics, summarizeSamples } from "../src/index.js";

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
    unassignedProbability: 0.5,
    monteCarlo: {
      sampleSize: 4,
      expectedCost: {
        mean: 25,
        standardDeviation: 12.9099,
        standardError: 6.455,
        confidenceInterval95: {
          lower: 12.3483,
          upper: 37.6517
        }
      },
      quantileStability: {
        metric: "totalCost",
        checkpoints: [
          {
            iterations: 1,
            p90: 10,
            p95: 10
          },
          {
            iterations: 2,
            p90: 19,
            p95: 19.5
          },
          {
            iterations: 3,
            p90: 28,
            p95: 29
          },
          {
            iterations: 4,
            p90: 37,
            p95: 38.5
          }
        ],
        finalP90: 37,
        finalP95: 38.5,
        p90MaxRelativeDelta: 0.7297,
        p95MaxRelativeDelta: 0.7403,
        stable: false
      },
      warnings: [
        {
          code: "mean_sample_size_below_30",
          message: "Expected cost confidence interval is based on fewer than 30 Monte Carlo samples."
        },
        {
          code: "tail_quantile_sample_size_below_100",
          message: "Tail quantile stability should be treated as provisional below 100 Monte Carlo samples."
        }
      ]
    }
  });
});

test("reports Monte Carlo standard error, confidence interval and quantile stability", function testMonteCarloDiagnostics() {
  const diagnostics = summarizeMonteCarloDiagnostics([100, 120, 140, 160]);

  assert.deepStrictEqual(diagnostics.expectedCost, {
    mean: 130,
    standardDeviation: 25.8199,
    standardError: 12.9099,
    confidenceInterval95: {
      lower: 104.6965,
      upper: 155.3035
    }
  });
  assert.deepStrictEqual(diagnostics.quantileStability.checkpoints, [
    {
      iterations: 1,
      p90: 100,
      p95: 100
    },
    {
      iterations: 2,
      p90: 118,
      p95: 119
    },
    {
      iterations: 3,
      p90: 136,
      p95: 138
    },
    {
      iterations: 4,
      p90: 154,
      p95: 157
    }
  ]);
  assert.deepStrictEqual(
    diagnostics.warnings.map(function mapWarning(warning) {
      return warning.code;
    }),
    ["mean_sample_size_below_30", "tail_quantile_sample_size_below_100"]
  );
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
