import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderDecisionBacktestReport, runDecisionBacktest } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
  __dirname,
  "..",
  "data",
  "backtests",
  "sales-decision-backtest.example.json"
);
const backtestFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

test("backtests a decision against a later temporal fixture", function testDecisionBacktest() {
  const result = runDecisionBacktest(backtestFixture);

  assert.strictEqual(result.schemaVersion, "optiflow-decision-backtest.v1");
  assert.strictEqual(result.cutoffAt, "2026-09-17T10:00:00Z");
  assert.strictEqual(result.training.sampleSize.saleCount, 3);
  assert.strictEqual(result.test.sampleSize.saleCount, 2);
  assert.deepStrictEqual(result.forecastError, {
    demandMeanError: 0.5,
    absoluteDemandMeanError: 0.5,
    cancellationProbabilityError: -0.3333,
    absoluteCancellationProbabilityError: 0.3333
  });
  assert.deepStrictEqual(
    result.profiles.map(function mapPredictedStrategy(profile) {
      return profile.predicted.strategy;
    }),
    ["exact-enumeration", "exact-enumeration"]
  );

  const conservative = result.profiles.find(function findConservative(profile) {
    return profile.profile.name === "conservative";
  });

  assert.strictEqual(conservative.realized.oracleStrategy, "nearest-neighbor-capacity");
  assert.strictEqual(conservative.realized.selectedStrategy, "exact-enumeration");
  assert.strictEqual(conservative.realized.regret, 281.65);
  assert.ok(conservative.forecastError.absoluteDecisionLossError > 0);
});

test("renders a concise decision backtest report", function testDecisionBacktestReport() {
  const report = renderDecisionBacktestReport(runDecisionBacktest(backtestFixture));

  assert.match(report, /OptiFlow decision backtest/);
  assert.match(report, /Backtest: sales-event-s3-5-temporal-fixture/);
  assert.match(report, /Profile: aggressive/);
  assert.match(report, /Profile: conservative/);
  assert.match(report, /regret=281.65/);
});
