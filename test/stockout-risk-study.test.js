import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderStockoutRiskStudyReport, runStockoutRiskStudy } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");

test("measures the cost and risk trade-off of a stockout policy", function testStockoutRiskStudy() {
  const study = runStockoutRiskStudy(readJson("data/stockout/stockout-risk-study.example.json"));

  assert.strictEqual(study.schemaVersion, "optiflow-stockout-risk-study.v1");
  assert.strictEqual(study.baseline.policy, "current-inventory");
  assert.strictEqual(study.candidate.policy, "vip-risk-buffer");
  assert.ok(study.deltas.stockoutProbabilityDelta < 0);
  assert.ok(study.deltas.interventionCostDelta > 0);
  assert.ok(study.deltas.expectedDecisionCostDelta < 0);
  assert.deepStrictEqual(study.recommendation, {
    policy: "vip-risk-buffer",
    reason: "candidate_reduces_expected_decision_cost"
  });
});

test("renders a stockout risk report with delta risk and delta cost", function testStockoutRiskReport() {
  const report = renderStockoutRiskStudyReport(
    runStockoutRiskStudy(readJson("data/stockout/stockout-risk-study.example.json"))
  );

  assert.match(report, /OptiFlow stockout risk study/);
  assert.match(report, /Baseline policy: current-inventory/);
  assert.match(report, /Candidate policy: vip-risk-buffer/);
  assert.match(report, /stockout_probability_delta=-/);
  assert.match(report, /intervention_cost_delta=\+/);
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootPath, relativePath), "utf8"));
}
