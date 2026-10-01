import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  renderReliabilityDecisionStudyReport,
  runReliabilityDecisionStudy
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
  __dirname,
  "..",
  "data",
  "reliability",
  "reliability-decision-study.example.json"
);
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

test("turns a degraded reliability signal into a changed allocation decision", function testReliabilityDecisionStudy() {
  const study = runReliabilityDecisionStudy(fixture);

  assert.strictEqual(study.reliabilitySignal.severity, "page");
  assert.strictEqual(study.decisions.steadyState.recommendation.role, "previous");
  assert.strictEqual(study.decisions.reliabilityAdjusted.recommendation.role, "recommended");
  assert.strictEqual(study.decisionChanged, true);
  assert.ok(study.decisions.steadyState.recommendation.expectedLossDelta > 0);
  assert.ok(study.decisions.reliabilityAdjusted.recommendation.expectedLossDelta < 0);
});

test("renders burn-rate context and both decision states", function testReliabilityDecisionReport() {
  const report = renderReliabilityDecisionStudyReport(runReliabilityDecisionStudy(fixture));

  assert.match(report, /OptiFlow reliability decision study/);
  assert.match(report, /Reliability signal: page/);
  assert.match(report, /short_burn_rate=8.4/);
  assert.match(report, /Steady state profile: steady-state-operations/);
  assert.match(report, /Reliability adjusted profile: page-reliability-response/);
  assert.match(report, /Decision changed: yes/);
});
