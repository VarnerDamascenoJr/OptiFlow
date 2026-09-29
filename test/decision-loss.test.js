import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  compareStrategiesByDecisionLoss,
  evaluateDecisionLoss,
  renderDecisionLossReport
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("evaluates decision loss components for a known profile", function testDecisionLossComponents() {
  const loss = evaluateDecisionLoss(
    [
      metrics(100, 0, 0),
      metrics(140, 10, 1)
    ],
    {
      name: "audit",
      weights: {
        observedCost: 1,
        lateMinute: 2,
        unassignedOrder: 50,
        downsideCostRisk: 0.5
      },
      slo: {
        maxLateMinutes: 0,
        maxUnassignedOrders: 0,
        violationPenalty: 25,
        lateMinuteExcessPenalty: 3,
        unassignedOrderExcessPenalty: 100
      }
    },
    {
      confidenceLevel: 0.5
    }
  );

  assert.deepStrictEqual(loss.expectedLoss, {
    mean: 237.5,
    components: {
      observedCost: 120,
      lateMinutes: 10,
      unassignedOrders: 25,
      downsideRisk: 5,
      sloViolation: 77.5
    }
  });
  assert.deepStrictEqual(loss.tailRisk.totalLoss, {
    confidenceLevel: 0.5,
    valueAtRisk: 100,
    conditionalValueAtRisk: 237.5,
    tailSampleCount: 2
  });
  assert.deepStrictEqual(loss.slo, {
    violationCount: 1,
    violationProbability: 0.5
  });
});

test("lets profiles choose different strategies from the same samples", function testProfileDivergence() {
  const cheapButLateSamples = [metrics(100, 12, 0), metrics(110, 12, 0)];
  const costlyButReliableSamples = [metrics(130, 0, 0), metrics(135, 0, 0)];
  const aggressiveBaseline = evaluateDecisionLoss(cheapButLateSamples, "aggressive");
  const aggressiveCandidate = evaluateDecisionLoss(costlyButReliableSamples, "aggressive");
  const conservativeBaseline = evaluateDecisionLoss(cheapButLateSamples, "conservative");
  const conservativeCandidate = evaluateDecisionLoss(costlyButReliableSamples, "conservative");

  assert.ok(aggressiveBaseline.expectedLoss.mean < aggressiveCandidate.expectedLoss.mean);
  assert.ok(conservativeCandidate.expectedLoss.mean < conservativeBaseline.expectedLoss.mean);
});

test("compares strategies by decision loss and renders profile recommendations", function testDecisionLossComparison() {
  const comparison = compareStrategiesByDecisionLoss(scenario, {
    iterations: 5,
    seed: 7,
    profiles: ["aggressive", "balanced"],
    uncertainty: {
      cancellationProbability: 0,
      demandVariationProbability: 0,
      demandVariationRate: 0,
      travelTimeVariationRate: 0
    }
  });

  assert.strictEqual(comparison.scenarioId, "small-delivery-v1");
  assert.deepStrictEqual(comparison.pairing, {
    method: "shared_seed_and_iteration",
    seed: 7,
    sampleSize: 5
  });
  assert.deepStrictEqual(
    comparison.profiles.map(function mapDecision(profileComparison) {
      return profileComparison.recommendation.strategy;
    }),
    ["exact-enumeration", "exact-enumeration"]
  );

  const report = renderDecisionLossReport(comparison);

  assert.match(report, /OptiFlow decision loss comparison/);
  assert.match(report, /Profile: aggressive/);
  assert.match(report, /Profile: balanced/);
  assert.match(report, /decision=exact-enumeration/);
});

function metrics(totalCost, totalLateMinutes, unassignedOrders) {
  return {
    metrics: {
      totalCost: totalCost,
      totalLateMinutes: totalLateMinutes,
      unassignedOrders: unassignedOrders
    }
  };
}
