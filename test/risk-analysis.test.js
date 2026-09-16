import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { calculateVarCvar, compareRiskAdjustedStrategies } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("calculates VaR and CVaR for a known small dataset", function testVarCvar() {
  assert.deepStrictEqual(calculateVarCvar([10, 20, 30, 40, 50], 0.8), {
    confidenceLevel: 0.8,
    valueAtRisk: 40,
    conditionalValueAtRisk: 45,
    tailSampleCount: 2
  });
});

test("compares strategies by expected cost and tail risk", function testRiskComparison() {
  const comparison = compareRiskAdjustedStrategies(scenario, {
    confidenceLevel: 0.95,
    iterations: 30,
    seed: 99,
    uncertainty: {
      cancellationProbability: 0.02,
      demandVariationProbability: 0.3,
      demandVariationRate: 0.1,
      travelTimeVariationRate: 0.15
    }
  });

  assert.strictEqual(comparison.scenarioId, "small-delivery-v1");
  assert.strictEqual(comparison.baseline.strategy, "nearest-neighbor-capacity");
  assert.strictEqual(comparison.candidate.strategy, "exact-enumeration");
  assert.ok(comparison.baseline.risk.totalCost.valueAtRisk > 0);
  assert.ok(comparison.candidate.risk.totalCost.conditionalValueAtRisk > 0);
  assert.ok(["nearest-neighbor-capacity", "exact-enumeration"].includes(comparison.recommendations.expectedCost.strategy));
  assert.ok(["nearest-neighbor-capacity", "exact-enumeration"].includes(comparison.recommendations.tailRisk.strategy));
  assert.ok(["aligned", "cost_risk_divergence"].includes(comparison.recommendations.tradeOff));
});
