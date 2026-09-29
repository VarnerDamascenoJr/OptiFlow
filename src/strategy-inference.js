import { calculateVarCvar } from "./risk-analysis.js";
import { simulateFixedPlan } from "./simulation.js";
import { mean, readPositiveInteger, round } from "./shared/numbers.js";

const DEFAULT_INFERENCE_OPTIONS = {
  baselineStrategy: "nearest-neighbor-capacity",
  candidateStrategy: "exact-enumeration",
  bootstrapIterations: 500,
  confidenceLevel: 0.95,
  seed: 20260916
};

export function compareStrategiesWithInference(scenario, options = {}) {
  const inferenceOptions = normalizeInferenceOptions(options);
  const baselineSimulation = simulateStrategy(scenario, inferenceOptions.baselineStrategy, inferenceOptions);
  const candidateSimulation = simulateStrategy(scenario, inferenceOptions.candidateStrategy, inferenceOptions);
  const pairedSamples = createPairedSamples(baselineSimulation.samples, candidateSimulation.samples);
  const totalCostDeltas = pairedSamples.map(function mapTotalCostDelta(sample) {
    return sample.deltas.totalCostDelta;
  });
  const baselineCosts = pairedSamples.map(function mapBaselineCost(sample) {
    return sample.baseline.metrics.totalCost;
  });
  const candidateCosts = pairedSamples.map(function mapCandidateCost(sample) {
    return sample.candidate.metrics.totalCost;
  });
  const costDelta = summarizePairedCostDelta(totalCostDeltas, baselineCosts);
  const tailRisk = summarizeTailRisk(
    baselineCosts,
    candidateCosts,
    inferenceOptions.confidenceLevel,
    inferenceOptions.bootstrapIterations,
    inferenceOptions.bootstrapSeed
  );

  return {
    scenarioId: scenario.id,
    baseline: summarizeStrategySimulation(baselineSimulation, inferenceOptions.confidenceLevel),
    candidate: summarizeStrategySimulation(candidateSimulation, inferenceOptions.confidenceLevel),
    pairing: {
      method: "shared_seed_and_iteration",
      seed: inferenceOptions.seed,
      sampleSize: pairedSamples.length,
      metric: "candidate_minus_baseline"
    },
    inference: {
      totalCostDelta: costDelta,
      tailRisk: tailRisk,
      conclusion: classifyInference(costDelta)
    },
    samples: options.includeSamples === true ? pairedSamples : undefined
  };
}

export function renderInferenceReport(comparison) {
  const delta = comparison.inference.totalCostDelta;
  const tailRisk = comparison.inference.tailRisk;
  const lines = [
    "OptiFlow strategy inference",
    "",
    "Scenario: " + comparison.scenarioId,
    "  baseline=" +
      comparison.baseline.strategy +
      ", candidate=" +
      comparison.candidate.strategy +
      ", paired_samples=" +
      comparison.pairing.sampleSize,
    "  mean_cost_delta=" +
      formatSignedNumber(delta.mean) +
      ", se=" +
      delta.standardError +
      ", ci95=[" +
      delta.confidenceInterval95.lower +
      ", " +
      delta.confidenceInterval95.upper +
      "]",
    "  probability_candidate_better=" +
      delta.probabilityCandidateBetter +
      ", standardized_effect=" +
      formatNullableNumber(delta.effectSize.standardizedMeanDelta) +
      ", relative_delta=" +
      formatSignedNumber(delta.effectSize.relativeMeanDeltaPercentage) +
      "%",
    "  cvar_delta=" +
      formatSignedNumber(tailRisk.deltas.conditionalValueAtRiskDelta) +
      ", bootstrap_ci95=[" +
      tailRisk.bootstrap.confidenceInterval95.conditionalValueAtRiskDelta.lower +
      ", " +
      tailRisk.bootstrap.confidenceInterval95.conditionalValueAtRiskDelta.upper +
      "]",
    "  conclusion=" + comparison.inference.conclusion,
    ""
  ];

  return lines.join("\n");
}

function simulateStrategy(scenario, strategy, options) {
  return simulateFixedPlan(scenario, {
    iterations: options.iterations,
    seed: options.seed,
    salesEventPriors: options.salesEventPriors,
    solver: options.solver,
    strategy: strategy,
    uncertainty: options.uncertainty
  });
}

function summarizeStrategySimulation(simulation, confidenceLevel) {
  return {
    strategy: simulation.strategy,
    baseMetrics: simulation.baseMetrics,
    summary: simulation.summary,
    risk: {
      totalCost: calculateVarCvar(
        simulation.samples.map(function mapCost(sample) {
          return sample.metrics.totalCost;
        }),
        confidenceLevel
      )
    }
  };
}

function createPairedSamples(baselineSamples, candidateSamples) {
  const sampleSize = Math.min(baselineSamples.length, candidateSamples.length);
  const pairs = [];

  for (let index = 0; index < sampleSize; index += 1) {
    const baseline = baselineSamples[index];
    const candidate = candidateSamples[index];

    pairs.push({
      iteration: index + 1,
      baseline: baseline,
      candidate: candidate,
      deltas: {
        totalCostDelta: round(candidate.metrics.totalCost - baseline.metrics.totalCost, 4),
        totalLateMinutesDelta: round(
          candidate.metrics.totalLateMinutes - baseline.metrics.totalLateMinutes,
          4
        ),
        unassignedOrdersDelta: candidate.metrics.unassignedOrders - baseline.metrics.unassignedOrders
      }
    });
  }

  return pairs;
}

function summarizePairedCostDelta(deltas, baselineCosts) {
  const sampleSize = deltas.length;
  const average = mean(deltas);
  const standardDeviation = sampleStandardDeviation(deltas, average);
  const standardError = sampleSize > 0 ? standardDeviation / Math.sqrt(sampleSize) : 0;
  const marginOfError = 1.96 * standardError;
  const baselineMean = mean(baselineCosts);

  return {
    metric: "totalCost",
    direction: "negative_favors_candidate",
    sampleSize: sampleSize,
    mean: round(average, 4),
    standardDeviation: round(standardDeviation, 4),
    standardError: round(standardError, 4),
    confidenceInterval95: {
      lower: round(average - marginOfError, 4),
      upper: round(average + marginOfError, 4)
    },
    probabilityCandidateBetter: probability(deltas, function isBetter(delta) {
      return delta < 0;
    }),
    probabilityCandidateNotWorse: probability(deltas, function isNotWorse(delta) {
      return delta <= 0;
    }),
    effectSize: {
      standardizedMeanDelta:
        standardDeviation === 0 ? null : round(average / standardDeviation, 4),
      relativeMeanDeltaPercentage:
        baselineMean === 0 ? 0 : round((average / baselineMean) * 100, 2)
    },
    warnings: createInferenceWarnings(sampleSize, standardDeviation)
  };
}

function summarizeTailRisk(baselineCosts, candidateCosts, confidenceLevel, bootstrapIterations, bootstrapSeed) {
  const baselineRisk = calculateVarCvar(baselineCosts, confidenceLevel);
  const candidateRisk = calculateVarCvar(candidateCosts, confidenceLevel);
  const bootstrapDeltas = bootstrapTailRiskDeltas(
    baselineCosts,
    candidateCosts,
    confidenceLevel,
    bootstrapIterations,
    bootstrapSeed
  );

  return {
    metric: "totalCost",
    confidenceLevel: confidenceLevel,
    baseline: baselineRisk,
    candidate: candidateRisk,
    deltas: {
      valueAtRiskDelta: round(candidateRisk.valueAtRisk - baselineRisk.valueAtRisk, 4),
      conditionalValueAtRiskDelta: round(
        candidateRisk.conditionalValueAtRisk - baselineRisk.conditionalValueAtRisk,
        4
      )
    },
    bootstrap: {
      iterations: bootstrapIterations,
      confidenceInterval95: {
        conditionalValueAtRiskDelta: percentileInterval(bootstrapDeltas)
      }
    }
  };
}

function bootstrapTailRiskDeltas(baselineCosts, candidateCosts, confidenceLevel, iterations, seed) {
  const sampleSize = Math.min(baselineCosts.length, candidateCosts.length);
  const random = createSeededRandom(seed);
  const deltas = [];

  if (sampleSize === 0) {
    return deltas;
  }

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const resampledBaselineCosts = [];
    const resampledCandidateCosts = [];

    for (let index = 0; index < sampleSize; index += 1) {
      const sampleIndex = Math.floor(random() * sampleSize);
      resampledBaselineCosts.push(baselineCosts[sampleIndex]);
      resampledCandidateCosts.push(candidateCosts[sampleIndex]);
    }

    const baselineRisk = calculateVarCvar(resampledBaselineCosts, confidenceLevel);
    const candidateRisk = calculateVarCvar(resampledCandidateCosts, confidenceLevel);
    deltas.push(
      round(candidateRisk.conditionalValueAtRisk - baselineRisk.conditionalValueAtRisk, 4)
    );
  }

  return deltas;
}

function classifyInference(costDelta) {
  if (costDelta.confidenceInterval95.upper < 0) {
    return "candidate_better";
  }

  if (costDelta.confidenceInterval95.lower > 0) {
    return "baseline_better";
  }

  return "inconclusive";
}

function percentileInterval(values) {
  if (values.length === 0) {
    return {
      lower: 0,
      upper: 0
    };
  }

  const sortedValues = values.slice().sort(function sortNumbers(left, right) {
    return left - right;
  });

  return {
    lower: round(percentile(sortedValues, 0.025), 4),
    upper: round(percentile(sortedValues, 0.975), 4)
  };
}

function percentile(sortedValues, quantile) {
  const index = (sortedValues.length - 1) * quantile;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  const weight = index - lowerIndex;
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
}

function sampleStandardDeviation(values, average) {
  if (values.length < 2) {
    return 0;
  }

  const sumSquaredDistance = values.reduce(function sumDistance(total, value) {
    return total + Math.pow(value - average, 2);
  }, 0);

  return Math.sqrt(sumSquaredDistance / (values.length - 1));
}

function probability(values, predicate) {
  if (values.length === 0) {
    return 0;
  }

  const matches = values.filter(predicate).length;
  return round(matches / values.length, 4);
}

function createInferenceWarnings(sampleSize, standardDeviation) {
  const warnings = [];

  if (sampleSize < 30) {
    warnings.push({
      code: "paired_sample_size_below_30",
      message: "Cost delta confidence interval is based on fewer than 30 paired samples."
    });
  }

  if (standardDeviation === 0) {
    warnings.push({
      code: "paired_delta_has_no_observed_variation",
      message: "Standardized effect size is not reported because every paired delta is identical."
    });
  }

  return warnings;
}

function normalizeInferenceOptions(options) {
  const seed = readPositiveInteger(options.seed, DEFAULT_INFERENCE_OPTIONS.seed);

  return {
    baselineStrategy: options.baselineStrategy || DEFAULT_INFERENCE_OPTIONS.baselineStrategy,
    bootstrapIterations: readPositiveInteger(
      options.bootstrapIterations,
      DEFAULT_INFERENCE_OPTIONS.bootstrapIterations
    ),
    bootstrapSeed: readPositiveInteger(options.bootstrapSeed, seed + 1),
    candidateStrategy: options.candidateStrategy || DEFAULT_INFERENCE_OPTIONS.candidateStrategy,
    confidenceLevel:
      typeof options.confidenceLevel === "number"
        ? clamp(options.confidenceLevel, 0, 1)
        : DEFAULT_INFERENCE_OPTIONS.confidenceLevel,
    iterations: options.iterations,
    salesEventPriors: options.salesEventPriors,
    seed: seed,
    solver: options.solver || {},
    uncertainty: options.uncertainty || {}
  };
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatSignedNumber(value) {
  if (value > 0) {
    return "+" + value;
  }

  return String(value);
}

function formatNullableNumber(value) {
  return value === null ? "not_available" : String(value);
}
