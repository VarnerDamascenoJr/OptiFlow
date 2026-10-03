import { evaluateDecisionLoss, compareStrategiesByDecisionLoss } from "./decision-loss.js";
import { compareStrategies } from "./strategy-comparison.js";
import { deriveSalesEventPriors } from "./sales-event-priors.js";
import { importSalesEventScenario } from "./sales-event-scenario-importer.js";
import { formatSignedNumber } from "./shared/format.js";
import { readFiniteNumber, readPositiveInteger, round } from "./shared/numbers.js";
import { readOptionalString } from "./shared/strings.js";
import { assertObject } from "./shared/validation.js";

const schemaVersion = "optiflow-decision-backtest.v1";

const defaultBacktestOptions = {
  baselineStrategy: "nearest-neighbor-capacity",
  candidateStrategy: "exact-enumeration",
  confidenceLevel: 0.95,
  iterations: 100,
  profiles: ["balanced"],
  seed: 20260916
};

export function runDecisionBacktest(backtestDocument, options = {}) {
  const normalizedBacktest = normalizeBacktestDocument(backtestDocument);
  const backtestOptions = normalizeBacktestOptions(normalizedBacktest, options);
  const trainingPriors = deriveSalesEventPriors(normalizedBacktest.trainingSalesExport);
  const planningScenario =
    normalizedBacktest.planningScenario ||
    importSalesEventScenario(normalizedBacktest.trainingSalesExport, {
      scenarioId: normalizedBacktest.id + "-planning"
    });
  const realizedScenario =
    normalizedBacktest.realizedScenario ||
    importSalesEventScenario(normalizedBacktest.testSalesExport, {
      scenarioId: normalizedBacktest.id + "-realized"
    });
  const prediction = compareStrategiesByDecisionLoss(planningScenario, {
    baselineStrategy: backtestOptions.baselineStrategy,
    candidateStrategy: backtestOptions.candidateStrategy,
    confidenceLevel: backtestOptions.confidenceLevel,
    iterations: backtestOptions.iterations,
    profiles: backtestOptions.profiles,
    salesEventPriors: trainingPriors,
    seed: backtestOptions.seed,
    solver: backtestOptions.solver,
    uncertainty: backtestOptions.uncertainty
  });
  const realizedComparison = compareStrategies(realizedScenario, {
    baselineStrategy: backtestOptions.baselineStrategy,
    candidateStrategy: backtestOptions.candidateStrategy,
    solver: backtestOptions.solver
  });
  const testPriors = deriveSalesEventPriors(normalizedBacktest.testSalesExport);

  return {
    schemaVersion: schemaVersion,
    id: normalizedBacktest.id,
    cutoffAt: normalizedBacktest.cutoffAt,
    training: summarizeHistoricalSplit(normalizedBacktest.trainingSalesExport, trainingPriors),
    test: summarizeHistoricalSplit(normalizedBacktest.testSalesExport, testPriors),
    prediction: {
      scenarioId: prediction.scenarioId,
      strategies: prediction.strategies,
      pairing: prediction.pairing
    },
    realization: {
      scenarioId: realizedScenario.id,
      baseline: realizedComparison.baseline,
      candidate: realizedComparison.candidate,
      deltas: realizedComparison.deltas
    },
    forecastError: calculateHistoricalForecastError(trainingPriors, testPriors),
    profiles: prediction.profiles.map(function mapProfile(profilePrediction) {
      return backtestProfile(profilePrediction, realizedComparison, backtestOptions.confidenceLevel);
    })
  };
}

export function renderDecisionBacktestReport(backtest) {
  const lines = [
    "OptiFlow decision backtest",
    "",
    "Backtest: " + backtest.id,
    "  cutoff_at=" + backtest.cutoffAt,
    "  training_period=[" +
      backtest.training.period.startedAt +
      ", " +
      backtest.training.period.endedAt +
      "]",
    "  test_period=[" + backtest.test.period.startedAt + ", " + backtest.test.period.endedAt + "]",
    "  demand_mean_error=" +
      formatSignedNumber(backtest.forecastError.demandMeanError) +
      ", cancellation_probability_error=" +
      formatSignedNumber(backtest.forecastError.cancellationProbabilityError)
  ];

  for (const profile of backtest.profiles) {
    lines.push(
      "Profile: " + profile.profile.name,
      "  predicted_decision=" +
        profile.predicted.strategy +
        ", predicted_expected_loss=" +
        profile.predicted.expectedLoss,
      "  realized_selected_loss=" +
        profile.realized.selectedLoss +
        ", oracle_strategy=" +
        profile.realized.oracleStrategy +
        ", oracle_loss=" +
        profile.realized.oracleLoss,
      "  regret=" +
        profile.realized.regret +
        ", decision_loss_error=" +
        formatSignedNumber(profile.forecastError.decisionLossError)
    );
  }

  lines.push("");
  return lines.join("\n");
}

function backtestProfile(profilePrediction, realizedComparison, confidenceLevel) {
  const baselineLoss = evaluateDecisionLoss(
    [{ metrics: realizedComparison.baseline.metrics }],
    profilePrediction.profile,
    { confidenceLevel: confidenceLevel }
  );
  const candidateLoss = evaluateDecisionLoss(
    [{ metrics: realizedComparison.candidate.metrics }],
    profilePrediction.profile,
    { confidenceLevel: confidenceLevel }
  );
  const realizedByRole = {
    baseline: {
      strategy: realizedComparison.baseline.strategy,
      loss: baselineLoss.expectedLoss.mean
    },
    candidate: {
      strategy: realizedComparison.candidate.strategy,
      loss: candidateLoss.expectedLoss.mean
    }
  };
  const selected = realizedByRole[profilePrediction.recommendation.role];
  const oracle =
    baselineLoss.expectedLoss.mean <= candidateLoss.expectedLoss.mean
      ? realizedByRole.baseline
      : realizedByRole.candidate;
  const regret = round(selected.loss - oracle.loss, 4);
  const decisionLossError = round(selected.loss - profilePrediction.recommendation.expectedLoss, 4);

  return {
    profile: profilePrediction.profile,
    predicted: {
      criterion: profilePrediction.recommendation.criterion,
      role: profilePrediction.recommendation.role,
      strategy: profilePrediction.recommendation.strategy,
      expectedLoss: profilePrediction.recommendation.expectedLoss,
      baselineExpectedLoss: profilePrediction.baseline.expectedLoss.mean,
      candidateExpectedLoss: profilePrediction.candidate.expectedLoss.mean
    },
    realized: {
      selectedStrategy: selected.strategy,
      selectedLoss: selected.loss,
      oracleStrategy: oracle.strategy,
      oracleLoss: oracle.loss,
      regret: regret,
      baselineLoss: baselineLoss.expectedLoss.mean,
      candidateLoss: candidateLoss.expectedLoss.mean
    },
    forecastError: {
      decisionLossError: decisionLossError,
      absoluteDecisionLossError: round(Math.abs(decisionLossError), 4)
    }
  };
}

function calculateHistoricalForecastError(trainingPriors, testPriors) {
  return {
    demandMeanError: round(
      testPriors.estimates.demandMean - trainingPriors.estimates.demandMean,
      4
    ),
    absoluteDemandMeanError: round(
      Math.abs(testPriors.estimates.demandMean - trainingPriors.estimates.demandMean),
      4
    ),
    cancellationProbabilityError: round(
      testPriors.estimates.cancellationProbability -
        trainingPriors.estimates.cancellationProbability,
      4
    ),
    absoluteCancellationProbabilityError: round(
      Math.abs(
        testPriors.estimates.cancellationProbability -
          trainingPriors.estimates.cancellationProbability
      ),
      4
    )
  };
}

function summarizeHistoricalSplit(exportDocument, priors) {
  return {
    source: exportDocument.source,
    period: priors.period,
    sampleSize: priors.sampleSize,
    estimates: priors.estimates
  };
}

function normalizeBacktestDocument(backtestDocument) {
  assertObject(backtestDocument, "decisionBacktest");

  if (backtestDocument.schemaVersion !== schemaVersion) {
    throw new Error("decisionBacktest.schemaVersion must be " + schemaVersion);
  }

  assertObject(backtestDocument.trainingSalesExport, "decisionBacktest.trainingSalesExport");
  assertObject(backtestDocument.testSalesExport, "decisionBacktest.testSalesExport");

  return {
    id: readOptionalString(backtestDocument.id, "decision-backtest"),
    cutoffAt: readOptionalString(backtestDocument.cutoffAt, ""),
    options: backtestDocument.options || {},
    planningScenario: backtestDocument.planningScenario,
    realizedScenario: backtestDocument.realizedScenario,
    testSalesExport: backtestDocument.testSalesExport,
    trainingSalesExport: backtestDocument.trainingSalesExport
  };
}

function normalizeBacktestOptions(backtest, options) {
  const documentOptions = backtest.options || {};
  const explicitOptions = pickDefinedProperties(options);
  const mergedOptions = {
    ...defaultBacktestOptions,
    ...documentOptions,
    ...explicitOptions,
    solver: {
      ...pickDefinedProperties(documentOptions.solver || {}),
      ...pickDefinedProperties(options.solver || {})
    },
    uncertainty: {
      ...pickDefinedProperties(documentOptions.uncertainty || {}),
      ...pickDefinedProperties(options.uncertainty || {})
    }
  };

  return {
    baselineStrategy: mergedOptions.baselineStrategy,
    candidateStrategy: mergedOptions.candidateStrategy,
    confidenceLevel: readFiniteNumber(
      mergedOptions.confidenceLevel,
      defaultBacktestOptions.confidenceLevel
    ),
    iterations: readPositiveInteger(mergedOptions.iterations, defaultBacktestOptions.iterations),
    profiles: mergedOptions.profiles || defaultBacktestOptions.profiles,
    seed: readPositiveInteger(mergedOptions.seed, defaultBacktestOptions.seed),
    solver: mergedOptions.solver,
    uncertainty: mergedOptions.uncertainty
  };
}

function pickDefinedProperties(values) {
  return Object.fromEntries(
    Object.entries(values).filter(function filterDefined(entry) {
      return entry[1] !== undefined;
    })
  );
}
