import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { compareStrategies, renderComparisonReport } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("compares heuristic and exact solver metrics", function testCompareStrategies() {
  const comparison = compareStrategies(scenario);

  assert.strictEqual(comparison.scenarioId, "small-delivery-v1");
  assert.strictEqual(comparison.baseline.strategy, "nearest-neighbor-capacity");
  assert.strictEqual(comparison.candidate.strategy, "exact-enumeration");
  assert.strictEqual(comparison.outcome, "improved");
  assert.strictEqual(comparison.baseline.metrics.totalCost, 792);
  assert.strictEqual(comparison.candidate.metrics.totalCost, 744);
  assert.strictEqual(comparison.deltas.totalCostDelta, -48);
  assert.strictEqual(comparison.deltas.totalCostGain, 48);
  assert.strictEqual(comparison.deltas.totalCostGainPercentage, 6.06);
  assert.strictEqual(comparison.deltas.totalDistanceDelta, -12);
  assert.strictEqual(comparison.deltas.totalLateMinutesDelta, 0);
  assert.strictEqual(comparison.deltas.servedOrdersDelta, 0);
  assert.strictEqual(comparison.deltas.unassignedOrdersDelta, 0);
});

test("renders a stable portfolio-friendly comparison report", function testRenderComparisonReport() {
  const report = renderComparisonReport(compareStrategies(scenario));

  assert.strictEqual(
    report,
    [
      "OptiFlow strategy comparison",
      "",
      "Scenario: small-delivery-v1",
      "  nearest-neighbor-capacity cost=792, distance=73, late=0, served=3",
      "  exact-enumeration cost=744, distance=61, late=0, served=3",
      "  outcome=improved, cost_delta=-48, cost_gain=48 (6.06%), distance_delta=-12, late_delta=0, served_delta=0",
      ""
    ].join("\n")
  );
});
