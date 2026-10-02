import { analyzeDecisionSensitivity } from "./sensitivity-analysis.js";
import { compareStrategies } from "./strategy-comparison.js";
import { compareStrategiesByDecisionLoss } from "./decision-loss.js";
import { normalizeSalesEventPriors } from "./sales-event-priors.js";
import { readFiniteNumber, readPositiveInteger, round } from "./shared/numbers.js";

const DEFAULT_STUDY_OPTIONS = {
  baselineStrategy: "nearest-neighbor-capacity",
  candidateStrategy: "exact-enumeration",
  confidenceLevel: 0.95,
  iterations: 100,
  profiles: ["balanced"],
  seed: 20260929
};

const requiredSalesSignals = [
  "sale.created",
  "payment.processed",
  "email.sent",
  "checkin.completed"
];

export function runFunnelPlanningStudy(inputs, options = {}) {
  const studyOptions = normalizeStudyOptions(options);
  const salesPriors = normalizeSalesEventPriors(inputs.salesPriors);
  const analyticsPriors = normalizeSalesEventPriors(inputs.salesAnalyticsExport);
  const observabilitySignal = findSharedRecord(
    inputs.sharedStatisticalFixture,
    "operational-observability-platform",
    "RQ5"
  );
  const deterministicComparison = compareStrategies(inputs.scenario, {
    baselineStrategy: studyOptions.baselineStrategy,
    candidateStrategy: studyOptions.candidateStrategy,
    solver: studyOptions.solver
  });
  const uncertainComparison = compareStrategiesByDecisionLoss(inputs.scenario, {
    baselineStrategy: studyOptions.baselineStrategy,
    candidateStrategy: studyOptions.candidateStrategy,
    confidenceLevel: studyOptions.confidenceLevel,
    iterations: studyOptions.iterations,
    profiles: studyOptions.profiles,
    salesEventPriors: salesPriors,
    seed: studyOptions.seed,
    solver: studyOptions.solver,
    uncertainty: studyOptions.uncertainty
  });
  const sensitivity = analyzeDecisionSensitivity(inputs.scenario, {
    baselineStrategy: studyOptions.baselineStrategy,
    candidateStrategy: studyOptions.candidateStrategy,
    confidenceLevel: studyOptions.confidenceLevel,
    iterations: studyOptions.iterations,
    profiles: studyOptions.profiles,
    salesEventPriors: salesPriors,
    seed: studyOptions.seed,
    solver: studyOptions.solver,
    uncertainty: studyOptions.uncertainty
  });
  const deterministicDecision =
    deterministicComparison.outcome === "regressed"
      ? deterministicComparison.baseline.strategy
      : deterministicComparison.candidate.strategy;
  const uncertainDecision = uncertainComparison.profiles[0].recommendation.strategy;

  return {
    schemaVersion: "optiflow-integrated-funnel-planning-study.v1",
    questionId: "RQ1,RQ3,RQ7",
    generatedAt: "2026-09-29T00:00:00.000Z",
    datasets: {
      salesPriorsSchemaVersion: salesPriors.schemaVersion,
      salesAnalyticsSchemaVersion: inputs.salesAnalyticsExport.schemaVersion,
      sharedFixtureSchemaVersion: inputs.sharedStatisticalFixture.schema_version,
      scenarioId: inputs.scenario.id
    },
    sales: {
      funnel: {
        conversionProbability: salesPriors.estimates.conversionProbability,
        cancellationProbability: salesPriors.estimates.cancellationProbability,
        trainingSaleCount: salesPriors.sampleSize.saleCount,
        completedSaleCount: salesPriors.sampleSize.completedSaleCount
      },
      demand: {
        mean: salesPriors.estimates.demandMean,
        standardDeviation: salesPriors.estimates.demandStdDev,
        coefficientOfVariation: salesPriors.estimates.demandCoefficientOfVariation,
        deviationProbability: salesPriors.estimates.demandDeviationProbability
      },
      analyticsExport: summarizeAnalyticsExport(inputs.salesAnalyticsExport, analyticsPriors)
    },
    observability: summarizeObservabilitySignal(observabilitySignal, inputs.salesAnalyticsExport),
    optiflow: {
      deterministic: {
        strategy: deterministicDecision,
        outcome: deterministicComparison.outcome,
        baselineTotalCost: deterministicComparison.baseline.metrics.totalCost,
        candidateTotalCost: deterministicComparison.candidate.metrics.totalCost,
        totalCostDelta: deterministicComparison.deltas.totalCostDelta,
        totalCostGainPercentage: deterministicComparison.deltas.totalCostGainPercentage
      },
      uncertaintyAware: summarizeDecisionProfile(uncertainComparison.profiles[0]),
      sensitivity: summarizeSensitivityProfile(sensitivity.profiles[0])
    },
    conclusion: {
      decisionChanged: deterministicDecision !== uncertainDecision,
      deterministicDecision: deterministicDecision,
      uncertaintyAwareDecision: uncertainDecision,
      interpretation:
        deterministicDecision === uncertainDecision
          ? "Conversion and demand uncertainty did not change the recommended strategy in this fixture, but it quantified expected loss, tail loss and robustness."
          : "Conversion and demand uncertainty changed the recommended strategy in this fixture.",
      limitation:
        "Small versioned fixtures are sufficient for reproducibility, not for population-level claims."
    }
  };
}

function summarizeAnalyticsExport(analyticsExport, analyticsPriors) {
  const eventTypeCounts = analyticsExport.summary?.eventTypeCounts || {};
  const presentSignals = requiredSalesSignals.filter(function filterPresent(signal) {
    return eventTypeCounts[signal] > 0;
  });

  return {
    generatedAt: analyticsExport.generatedAt,
    eventCount: analyticsExport.summary?.eventCount || 0,
    windowCount: analyticsExport.summary?.windowCount || 0,
    requiredSignals: requiredSalesSignals.map(function mapSignal(signal) {
      return {
        signal: signal,
        present: eventTypeCounts[signal] > 0,
        count: eventTypeCounts[signal] || 0
      };
    }),
    signalCompleteness: round(presentSignals.length / requiredSalesSignals.length, 4),
    simulationPriorConversionProbability: analyticsPriors.estimates.conversionProbability
  };
}

function summarizeObservabilitySignal(observabilitySignal, analyticsExport) {
  const measurements = observabilitySignal.measurements || {};
  const uncertainty = observabilitySignal.uncertainty || {};
  const requiredSignalCompleteness = requiredSalesSignals.every(function hasSignal(signal) {
    return (analyticsExport.summary?.eventTypeCounts || {})[signal] > 0;
  });

  return {
    sourceProject: observabilitySignal.project,
    service: observabilitySignal.dimensions?.service,
    endpoint: observabilitySignal.dimensions?.endpoint,
    successProbability: measurements.success_probability,
    burnRate: measurements.burn_rate,
    uncertaintyMethod: uncertainty.method,
    confidenceInterval: {
      lower: uncertainty.lower,
      upper: uncertainty.upper
    },
    signalQuality: requiredSignalCompleteness && measurements.success_probability >= 0.99
      ? "sufficient_for_fixture_study"
      : "needs_investigation"
  };
}

function summarizeDecisionProfile(profileComparison) {
  return {
    profile: profileComparison.profile.name,
    strategy: profileComparison.recommendation.strategy,
    expectedLoss: profileComparison.recommendation.expectedLoss,
    expectedLossDelta: profileComparison.recommendation.expectedLossDelta,
    tailLossCvarDelta: profileComparison.recommendation.tailLossCvarDelta,
    baselineExpectedLoss: profileComparison.baseline.expectedLoss.mean,
    candidateExpectedLoss: profileComparison.candidate.expectedLoss.mean,
    baselineSloViolationProbability: profileComparison.baseline.slo.violationProbability,
    candidateSloViolationProbability: profileComparison.candidate.slo.violationProbability
  };
}

function summarizeSensitivityProfile(profileSensitivity) {
  return {
    profile: profileSensitivity.profile,
    classification: profileSensitivity.robustness.classification,
    recommendationChangeCount: profileSensitivity.robustness.recommendationChangeCount,
    mostInfluentialFactor: profileSensitivity.tornado[0]
      ? {
          factorId: profileSensitivity.tornado[0].factorId,
          influence: profileSensitivity.tornado[0].influence,
          recommendationChanged: profileSensitivity.tornado[0].recommendationChanged
        }
      : null
  };
}

function findSharedRecord(fixture, project, questionId) {
  const record = fixture.records.find(function findRecord(candidate) {
    return candidate.project === project && candidate.question_id === questionId;
  });

  if (!record) {
    throw new Error("shared statistical fixture is missing " + project + " " + questionId);
  }

  return record;
}

function normalizeStudyOptions(options) {
  return {
    baselineStrategy: options.baselineStrategy || DEFAULT_STUDY_OPTIONS.baselineStrategy,
    candidateStrategy: options.candidateStrategy || DEFAULT_STUDY_OPTIONS.candidateStrategy,
    confidenceLevel:
      readFiniteNumber(options.confidenceLevel, null) !== null
        ? Math.max(0, Math.min(1, options.confidenceLevel))
        : DEFAULT_STUDY_OPTIONS.confidenceLevel,
    iterations: readPositiveInteger(options.iterations, DEFAULT_STUDY_OPTIONS.iterations),
    profiles: options.profiles || DEFAULT_STUDY_OPTIONS.profiles,
    seed: readPositiveInteger(options.seed, DEFAULT_STUDY_OPTIONS.seed),
    solver: options.solver || {},
    uncertainty: pickDefinedProperties(options.uncertainty || {})
  };
}

function pickDefinedProperties(values) {
  return Object.fromEntries(
    Object.entries(values).filter(function filterDefined(entry) {
      return entry[1] !== undefined;
    })
  );
}
