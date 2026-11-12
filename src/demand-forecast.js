import { assertPositiveInteger, mean, round } from "./shared/numbers.js";
import {
  assertNonEmptyArray,
  assertNonNegativeNumber,
  assertObject,
  assertPositiveNumber,
  assertSchemaVersion,
  assertString
} from "./shared/validation.js";

const historySchema = "optiflow-demand-history.v1";
const modelIds = ["naive", "moving-average"];

export function forecastDemand(history, options = {}) {
  assertObject(history, "demandHistory");
  assertSchemaVersion(history.schemaVersion, historySchema, "demandHistory.schemaVersion");
  assertString(history.id, "demandHistory.id");
  assertObject(history.source, "demandHistory.source");
  assertString(history.source.description, "demandHistory.source.description");
  if (!["synthetic", "observed"].includes(history.source.kind)) {
    throw new Error("demandHistory.source.kind must be synthetic or observed");
  }
  assertPositiveNumber(history.windowDurationMinutes, "demandHistory.windowDurationMinutes");
  const durationMs = history.windowDurationMinutes * 60000;
  if (!Number.isSafeInteger(durationMs) || durationMs <= 0) {
    throw new Error("windowDurationMinutes must represent a positive whole number of milliseconds");
  }
  assertNonEmptyArray(history.series, "demandHistory.series", "series");
  if (history.options !== undefined) assertObject(history.options, "demandHistory.options");
  assertObject(options, "forecast options");
  const settings = { movingAverageWindow: 3, testWindowCount: 3, ...history.options, ...options };
  for (const key of ["movingAverageWindow", "testWindowCount"]) {
    assertPositiveInteger(settings[key], key);
    if (!Number.isSafeInteger(settings[key])) throw new Error(key + " must be a safe integer");
  }
  const seriesIds = new Set();
  const locationIds = new Set();

  return {
    schemaVersion: "optiflow-demand-forecast.v1",
    historyId: history.id,
    source: structuredClone(history.source),
    windowDurationMinutes: history.windowDurationMinutes,
    parameters: {
      movingAverageWindow: settings.movingAverageWindow,
      testWindowCount: settings.testWindowCount,
      validationMethod: "rolling-origin-one-step-ahead"
    },
    series: history.series.map(function forecastSeries(series, index) {
      const label = "demandHistory.series[" + index + "]";
      assertObject(series, label);
      for (const key of ["id", "locationId", "unit"]) assertString(series[key], label + "." + key);
      if (seriesIds.has(series.id)) throw new Error("duplicate series id: " + series.id);
      if (locationIds.has(series.locationId)) throw new Error("duplicate series locationId: " + series.locationId);
      seriesIds.add(series.id);
      locationIds.add(series.locationId);
      assertNonEmptyArray(series.observations, label + ".observations", "observation");
      const required = settings.movingAverageWindow + settings.testWindowCount;
      if (series.observations.length < required) {
        throw new Error(label + " requires at least " + required + " observations for training and validation");
      }
      const observations = series.observations.map(function readObservation(observation, i) {
        const observationLabel = label + ".observations[" + i + "]";
        assertObject(observation, observationLabel);
        const timestamp = readWindowStart(observation.windowStart, observationLabel + ".windowStart");
        assertNonNegativeNumber(observation.demand, observationLabel + ".demand");
        if (observation.demand > Number.MAX_SAFE_INTEGER) {
          throw new Error(observationLabel + ".demand exceeds the supported numeric range");
        }
        return { timestamp: timestamp, demand: observation.demand };
      });
      for (let i = 1; i < observations.length; i += 1) {
        if (observations[i].timestamp - observations[i - 1].timestamp !== durationMs) {
          throw new Error(label + " observations must be chronological, unique and contiguous at windowDurationMinutes");
        }
      }
      return forecastSeriesDemand(series, observations, durationMs, settings);
    })
  };
}

function forecastSeriesDemand(series, observations, durationMs, settings) {
  const values = observations.map(observation => observation.demand);
  const testStart = values.length - settings.testWindowCount;
  const models = modelIds.map(function evaluateModel(id) {
    const predictions = [];
    for (let i = testStart; i < values.length; i += 1) {
      const predictedDemand = predict(id, values, i, settings.movingAverageWindow);
      predictions.push({
        windowStart: formatTime(observations[i].timestamp),
        predictedDemand: predictedDemand,
        actualDemand: values[i],
        error: predictedDemand - values[i]
      });
    }
    const errors = predictions.map(prediction => prediction.error);
    return {
      id: id,
      expectedDemand: predict(id, values, values.length, settings.movingAverageWindow),
      mae: mean(errors.map(Math.abs)),
      rmse: Math.sqrt(mean(errors.map(error => error * error))),
      bias: mean(errors),
      predictions: predictions
    };
  });
  // Keep selection on unrounded errors; the naive baseline wins exact ties.
  const selected = models.slice().sort((left, right) =>
    left.mae - right.mae || left.rmse - right.rmse || modelIds.indexOf(left.id) - modelIds.indexOf(right.id)
  )[0];
  const nextStart = observations.at(-1).timestamp + durationMs;

  return {
    id: series.id,
    locationId: series.locationId,
    unit: series.unit,
    observationCount: observations.length,
    initialTraining: {
      windowCount: testStart,
      windowStart: formatTime(observations[0].timestamp),
      windowEnd: formatTime(observations[testStart].timestamp)
    },
    validation: {
      windowCount: settings.testWindowCount,
      windowStart: formatTime(observations[testStart].timestamp),
      windowEnd: formatTime(nextStart)
    },
    nextWindow: { windowStart: formatTime(nextStart), windowEnd: formatTime(nextStart + durationMs) },
    models: Object.fromEntries(models.map(model => [model.id, {
      expectedDemand: round(model.expectedDemand, 6),
      mae: round(model.mae, 6),
      rmse: round(model.rmse, 6),
      bias: round(model.bias, 6),
      predictions: model.predictions.map(prediction => ({
        ...prediction,
        predictedDemand: round(prediction.predictedDemand, 6),
        error: round(prediction.error, 6)
      }))
    }])),
    recommendation: {
      model: selected.id,
      criterion: "minimum_validation_mae_then_rmse",
      expectedDemand: round(selected.expectedDemand, 6)
    }
  };
}

function predict(model, values, end, window) {
  return model === "naive" ? values[end - 1] : mean(values.slice(end - window, end));
}

function readWindowStart(value, label) {
  assertString(value, label);
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(value);
  const timestamp = Date.parse(value);
  if (!match || !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== match[1] + "." + (match[2] || "").padEnd(3, "0") + "Z") {
    throw new Error(label + " must be a valid ISO timestamp in UTC (Z)");
  }
  return timestamp;
}

function formatTime(timestamp) {
  if (!Number.isSafeInteger(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) {
    throw new Error("forecast window is outside the supported date range");
  }
  return new Date(timestamp).toISOString();
}

export function renderDemandForecastReport(result) {
  const lines = ["OptiFlow demand forecast", "", "History: " + result.historyId,
    "Validation: rolling-origin, one step ahead", "Source: " + result.source.kind];
  for (const series of result.series) {
    lines.push("", "Location: " + series.locationId + " (" + series.unit + ")",
      "  next_window=[" + series.nextWindow.windowStart + ", " + series.nextWindow.windowEnd + ")",
      "  training_windows=" + series.initialTraining.windowCount + ", validation_windows=" + series.validation.windowCount);
    for (const id of modelIds) {
      const model = series.models[id];
      lines.push("  " + id + " forecast=" + model.expectedDemand + ", MAE=" + model.mae +
        ", RMSE=" + model.rmse + ", bias=" + model.bias);
    }
    lines.push("  recommended=" + series.recommendation.model + ", forecast=" + series.recommendation.expectedDemand);
  }
  return lines.join("\n") + "\n";
}
