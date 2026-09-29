import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { compareStrategiesWithInference, renderInferenceReport } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("compares strategies with paired inference and a known interval", function testStrategyInference() {
  const comparison = compareStrategiesWithInference(scenario, {
    bootstrapIterations: 25,
    iterations: 10,
    seed: 77,
    uncertainty: {
      cancellationProbability: 0,
      demandVariationProbability: 0,
      demandVariationRate: 0,
      travelTimeVariationRate: 0
    }
  });

  assert.strictEqual(comparison.scenarioId, "small-delivery-v1");
  assert.strictEqual(comparison.baseline.strategy, "nearest-neighbor-capacity");
  assert.strictEqual(comparison.candidate.strategy, "exact-enumeration");
  assert.deepStrictEqual(comparison.pairing, {
    method: "shared_seed_and_iteration",
    seed: 77,
    sampleSize: 10,
    metric: "candidate_minus_baseline"
  });
  assert.deepStrictEqual(comparison.inference.totalCostDelta, {
    metric: "totalCost",
    direction: "negative_favors_candidate",
    sampleSize: 10,
    mean: -48,
    standardDeviation: 0,
    standardError: 0,
    confidenceInterval95: {
      lower: -48,
      upper: -48
    },
    probabilityCandidateBetter: 1,
    probabilityCandidateNotWorse: 1,
    effectSize: {
      standardizedMeanDelta: null,
      relativeMeanDeltaPercentage: -6.06
    },
    warnings: [
      {
        code: "paired_sample_size_below_30",
        message: "Cost delta confidence interval is based on fewer than 30 paired samples."
      },
      {
        code: "paired_delta_has_no_observed_variation",
        message: "Standardized effect size is not reported because every paired delta is identical."
      }
    ]
  });
  assert.strictEqual(comparison.inference.conclusion, "candidate_better");
  assert.deepStrictEqual(
    comparison.inference.tailRisk.bootstrap.confidenceInterval95.conditionalValueAtRiskDelta,
    {
      lower: -48,
      upper: -48
    }
  );
  assert.strictEqual(comparison.samples, undefined);
});

test("renders a concise inference report", function testInferenceReport() {
  const report = renderInferenceReport(
    compareStrategiesWithInference(scenario, {
      bootstrapIterations: 10,
      iterations: 5,
      seed: 7,
      uncertainty: {
        cancellationProbability: 0,
        demandVariationProbability: 0,
        demandVariationRate: 0,
        travelTimeVariationRate: 0
      }
    })
  );

  assert.strictEqual(
    report,
    [
      "OptiFlow strategy inference",
      "",
      "Scenario: small-delivery-v1",
      "  baseline=nearest-neighbor-capacity, candidate=exact-enumeration, paired_samples=5",
      "  mean_cost_delta=-48, se=0, ci95=[-48, -48]",
      "  probability_candidate_better=1, standardized_effect=not_available, relative_delta=-6.06%",
      "  cvar_delta=-48, bootstrap_ci95=[-48, -48]",
      "  conclusion=candidate_better",
      ""
    ].join("\n")
  );
});
