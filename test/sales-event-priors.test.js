import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  deriveSalesEventPriors,
  normalizeSalesEventPriors,
  simulateFixedPlan
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");
const salesExportPath = path.join(rootPath, "data", "sales-event-exports", "optiflow-sales-history.example.json");
const salesPriorsPath = path.join(rootPath, "data", "sales-event-exports", "optiflow-sales-priors.example.json");
const scenarioPath = path.join(rootPath, "data", "scenarios", "small-delivery.json");

const salesExport = JSON.parse(fs.readFileSync(salesExportPath, "utf8"));
const salesPriors = JSON.parse(fs.readFileSync(salesPriorsPath, "utf8"));
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("derives sales-event priors from the observed export", function testDeriveSalesEventPriors() {
  const priors = deriveSalesEventPriors(salesExport);

  assert.deepStrictEqual(priors, salesPriors);
});

test("accepts either a prior fixture or a raw sales export", function testNormalizeSalesEventPriors() {
  assert.deepStrictEqual(normalizeSalesEventPriors(salesPriors), salesPriors);
  assert.deepStrictEqual(normalizeSalesEventPriors(salesExport), salesPriors);
});

test("calibrates simulation uncertainty from sales-event priors", function testSalesEventCalibration() {
  const result = simulateFixedPlan(scenario, {
    iterations: 5,
    seed: 123,
    salesEventPriors: salesPriors,
    uncertainty: {
      travelTimeVariationRate: 0
    }
  });

  assert.strictEqual(result.calibration.mode, "sales-event-priors");
  assert.deepStrictEqual(result.calibration.sampleSize, salesPriors.sampleSize);
  assert.deepStrictEqual(result.calibration.period, salesPriors.period);
  assert.deepStrictEqual(result.calibration.appliedUncertainty, salesPriors.uncertainty);
  assert.deepStrictEqual(result.uncertainty, {
    cancellationProbability: 0.25,
    demandVariationProbability: 0.3333,
    demandVariationRate: 0.202,
    travelTimeVariationRate: 0
  });
  assert.strictEqual(result.samples.length, 5);
  assert.ok(result.summary.totalCost.mean > 0);
});

test("preserves synthetic mode when priors are not provided", function testSyntheticMode() {
  const result = simulateFixedPlan(scenario, {
    iterations: 1,
    seed: 123,
    uncertainty: {
      cancellationProbability: 0,
      demandVariationProbability: 0,
      demandVariationRate: 0,
      travelTimeVariationRate: 0
    }
  });

  assert.strictEqual(result.calibration.mode, "synthetic");
  assert.strictEqual(result.calibration.source.schemaVersion, "default-simulation-options");
});
