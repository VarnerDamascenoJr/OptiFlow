import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { forecastDemand, renderDemandForecastReport } from "../src/index.js";

const fixtureUrl = new URL("../data/demand/delivery-demand-history.example.json", import.meta.url);
const fixture = JSON.parse(fs.readFileSync(fixtureUrl, "utf8"));

test("forecasts each location independently with manually verifiable validation errors", function testFixture() {
  const result = forecastDemand(fixture);
  const [north, east] = result.series;

  assert.strictEqual(result.schemaVersion, "optiflow-demand-forecast.v1");
  assert.strictEqual(result.parameters.validationMethod, "rolling-origin-one-step-ahead");
  assert.strictEqual(north.initialTraining.windowCount, 4);
  assert.strictEqual(north.validation.windowCount, 4);
  assert.strictEqual(north.models.naive.mae, 10);
  assert.strictEqual(north.models.naive.rmse, 10);
  assert.strictEqual(north.models["moving-average"].mae, 5);
  assert.strictEqual(north.models["moving-average"].rmse, 5);
  assert.strictEqual(north.models["moving-average"].bias, 0);
  assert.strictEqual(north.recommendation.model, "moving-average");
  assert.strictEqual(north.recommendation.expectedDemand, 5);
  assert.strictEqual(east.models.naive.mae, 2);
  assert.strictEqual(east.models.naive.rmse, 2);
  assert.strictEqual(east.models.naive.bias, -2);
  assert.strictEqual(east.models["moving-average"].mae, 3);
  assert.strictEqual(east.recommendation.model, "naive");
  assert.strictEqual(east.recommendation.expectedDemand, 16);
  assert.deepStrictEqual(north.nextWindow, {
    windowStart: "2026-11-01T08:00:00.000Z", windowEnd: "2026-11-01T09:00:00.000Z"
  });
});

test("uses only preceding observations for every validation prediction", function testTemporalLeakage() {
  const history = historyFor([2, 4, 6, 8, 10, 12]);
  const before = forecastDemand(history).series[0];
  history.series[0].observations.at(-1).demand = 1200;
  const after = forecastDemand(history).series[0];

  for (const model of ["naive", "moving-average"]) {
    assert.deepStrictEqual(after.models[model].predictions.map(row => row.predictedDemand),
      before.models[model].predictions.map(row => row.predictedDemand));
    assert.notStrictEqual(after.models[model].mae, before.models[model].mae);
    assert.notStrictEqual(after.models[model].expectedDemand, before.models[model].expectedDemand);
  }
  assert.deepStrictEqual(before.models.naive.predictions.map(row => row.predictedDemand), [6, 8, 10]);
  assert.deepStrictEqual(before.models["moving-average"].predictions.map(row => row.predictedDemand), [4, 6, 8]);
});

test("updates the training origin only after each validation observation is revealed", function testRollingOrigin() {
  const history = historyFor([2, 4, 6, 8, 10, 12]);
  const before = forecastDemand(history).series[0];
  history.series[0].observations[4].demand = 100;
  const after = forecastDemand(history).series[0];

  assert.strictEqual(after.models.naive.predictions[0].predictedDemand, before.models.naive.predictions[0].predictedDemand);
  assert.strictEqual(after.models.naive.predictions[1].predictedDemand, before.models.naive.predictions[1].predictedDemand);
  assert.strictEqual(after.models.naive.predictions[2].predictedDemand, 100);
});

test("calculates RMSE separately from MAE for varying forecast errors", function testErrorMetrics() {
  const history = historyFor([1, 1, 1, 2, 5, 5]);
  const model = forecastDemand(history).series[0].models.naive;

  assert.strictEqual(model.mae, 1.333333);
  assert.strictEqual(model.rmse, 1.825742);
  assert.strictEqual(model.bias, -1.333333);
});

test("supports zero demand and prefers the naive baseline on exact ties", function testZeros() {
  const result = forecastDemand(historyFor([0, 0, 0, 0, 0, 0])).series[0];

  assert.strictEqual(result.recommendation.model, "naive");
  assert.strictEqual(result.recommendation.expectedDemand, 0);
  for (const model of Object.values(result.models)) {
    assert.strictEqual(model.mae, 0);
    assert.strictEqual(model.rmse, 0);
  }
});

test("selects on unrounded validation errors rather than rounded display values", function testUnroundedSelection() {
  const history = historyFor([0, 0.0000004, 0]);
  const result = forecastDemand(history, { movingAverageWindow: 2, testWindowCount: 1 }).series[0];

  assert.strictEqual(result.models.naive.mae, 0);
  assert.strictEqual(result.models["moving-average"].mae, 0);
  assert.strictEqual(result.recommendation.model, "moving-average");
});

test("keeps histories and sources immutable and does not mix series", function testImmutability() {
  const history = structuredClone(fixture);
  const original = structuredClone(history);
  const before = forecastDemand(history);
  assert.deepStrictEqual(history, original);
  before.source.description = "changed output";
  assert.deepStrictEqual(history, original);
  history.series[1].observations.forEach(row => { row.demand = 10000; });
  assert.deepStrictEqual(forecastDemand(history).series[0], before.series[0]);
});

test("requires an explicit contiguous chronology and rejects duplicate or shuffled windows", function testChronology() {
  const missing = structuredClone(fixture);
  missing.series[0].observations.splice(4, 1);
  assert.throws(() => forecastDemand(missing), /chronological, unique and contiguous/);
  const duplicate = structuredClone(fixture);
  duplicate.series[0].observations[1].windowStart = duplicate.series[0].observations[0].windowStart;
  assert.throws(() => forecastDemand(duplicate), /chronological, unique and contiguous/);
  const shuffled = structuredClone(fixture);
  shuffled.series[0].observations.reverse();
  assert.throws(() => forecastDemand(shuffled), /chronological, unique and contiguous/);
});

test("rejects invalid timestamps, omitted timezones and impossible calendar dates", function testDates() {
  for (const timestamp of ["not-a-date", "2026-11-01T00:00:00", "2026-02-30T00:00:00Z"]) {
    const history = structuredClone(fixture);
    history.series[0].observations[0].windowStart = timestamp;
    assert.throws(() => forecastDemand(history), /valid ISO timestamp in UTC/);
  }
});

test("requires enough training data and valid forecasting parameters", function testOptions() {
  assert.throws(() => forecastDemand(historyFor([1, 2, 3])), /requires at least 6 observations/);
  for (const value of [0, -1, 1.5, null]) {
    assert.throws(() => forecastDemand(fixture, { movingAverageWindow: value }), /movingAverageWindow must be a positive integer/);
    assert.throws(() => forecastDemand(fixture, { testWindowCount: value }), /testWindowCount must be a positive integer/);
  }
  assert.strictEqual(forecastDemand(fixture, { movingAverageWindow: 3 }).parameters.movingAverageWindow, 3);
});

test("rejects invalid demand, duplicate identifiers and unsupported source contracts", function testInputValidation() {
  for (const value of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    const history = structuredClone(fixture);
    history.series[0].observations[0].demand = value;
    assert.throws(() => forecastDemand(history), /demand/);
  }
  const duplicateId = structuredClone(fixture);
  duplicateId.series[1].id = duplicateId.series[0].id;
  assert.throws(() => forecastDemand(duplicateId), /duplicate series id/);
  const duplicateLocation = structuredClone(fixture);
  duplicateLocation.series[1].locationId = duplicateLocation.series[0].locationId;
  assert.throws(() => forecastDemand(duplicateLocation), /duplicate series locationId/);
  const schema = structuredClone(fixture);
  schema.schemaVersion = "unsupported";
  assert.throws(() => forecastDemand(schema), /schemaVersion/);
  const source = structuredClone(fixture);
  source.source.kind = "unknown";
  assert.throws(() => forecastDemand(source), /kind must be synthetic or observed/);
});

test("requires whole-millisecond positive windows", function testWindowDuration() {
  for (const duration of [0, -1, 0.000001]) {
    const history = structuredClone(fixture);
    history.windowDurationMinutes = duration;
    assert.throws(() => forecastDemand(history), /greater than zero|positive whole number/);
  }
});

test("runs the forecast CLI in text and JSON formats", function testCli() {
  const script = new URL("../scripts/forecast-demand.js", import.meta.url);
  const args = [fileURLToPath(script), fileURLToPath(fixtureUrl)];
  const json = spawnSync(process.execPath, args, {
    encoding: "utf8", env: { ...process.env, OPTIFLOW_OUTPUT_FORMAT: "json" }
  });
  assert.strictEqual(json.status, 0, json.stderr);
  assert.strictEqual(JSON.parse(json.stdout).series[0].recommendation.expectedDemand, 5);
  const text = spawnSync(process.execPath, args, {
    encoding: "utf8", env: { ...process.env, OPTIFLOW_OUTPUT_FORMAT: "text" }
  });
  assert.strictEqual(text.status, 0, text.stderr);
  assert.match(text.stdout, /moving-average forecast=5, MAE=5, RMSE=5/);
  const noArgument = spawnSync(process.execPath, [fileURLToPath(script)], { encoding: "utf8" });
  assert.strictEqual(noArgument.status, 1);
  assert.match(noArgument.stderr, /Usage:/);
});

test("renders the forecast horizon, validation split and recommendations", function testReport() {
  const text = renderDemandForecastReport(forecastDemand(fixture));
  assert.match(text, /Source: synthetic/);
  assert.match(text, /training_windows=4, validation_windows=4/);
  assert.match(text, /2026-11-01T08:00:00.000Z/);
  assert.match(text, /recommended=moving-average, forecast=5/);
  assert.match(text, /recommended=naive, forecast=16/);
});

function historyFor(values) {
  const history = structuredClone(fixture);
  delete history.options;
  history.series = [history.series[0]];
  history.series[0].observations = values.map((demand, i) => ({
    windowStart: new Date(Date.UTC(2026, 0, 1) + i * 3600000).toISOString(), demand: demand
  }));
  return history;
}
