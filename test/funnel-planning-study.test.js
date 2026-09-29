import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { runFunnelPlanningStudy } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");

test("generates the integrated funnel planning study evidence", function testFunnelPlanningStudy() {
  const summary = runFunnelPlanningStudy(
    {
      salesPriors: readJson("data/sales-event-exports/optiflow-sales-priors.example.json"),
      salesAnalyticsExport: readJson("data/sales-event-exports/sales-analytics-priors.example.json"),
      scenario: readJson("data/scenarios/small-delivery.json"),
      sharedStatisticalFixture: readJson("data/statistics/shared-statistical-fixture.v1.json")
    },
    {
      iterations: 10,
      seed: 20260929
    }
  );

  assert.strictEqual(summary.schemaVersion, "optiflow-integrated-funnel-planning-study.v1");
  assert.strictEqual(summary.sales.funnel.conversionProbability, 0.75);
  assert.strictEqual(summary.sales.analyticsExport.signalCompleteness, 1);
  assert.strictEqual(summary.observability.signalQuality, "sufficient_for_fixture_study");
  assert.strictEqual(summary.optiflow.deterministic.strategy, "exact-enumeration");
  assert.strictEqual(summary.optiflow.uncertaintyAware.strategy, "exact-enumeration");
  assert.strictEqual(summary.conclusion.decisionChanged, false);
  assert.ok(["robust", "fragile"].includes(summary.optiflow.sensitivity.classification));
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootPath, relativePath), "utf8"));
}
