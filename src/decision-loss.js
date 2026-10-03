import { calculateVarCvar } from "./risk-analysis.js";
import { simulateFixedPlan } from "./simulation.js";
import { formatSignedNumber } from "./shared/format.js";
import {
  mean,
  readFiniteNumber,
  readNonNegativeNumber,
  readPositiveInteger,
  round
} from "./shared/numbers.js";

const DEFAULT_DECISION_OPTIONS = {
  baselineStrategy: "nearest-neighbor-capacity",
  candidateStrategy: "exact-enumeration",
  confidenceLevel: 0.95,
  profiles: ["aggressive", "balanced", "conservative"],
  seed: 20260916
};

const DECISION_LOSS_PROFILES = {
  aggressive: {
    name: "aggressive",
    description: "Prioritizes observed cost and tolerates modest service noise.",
    weights: {
      observedCost: 1,
      lateMinute: 0.5,
      unassignedOrder: 50,
      downsideCostRisk: 0
    },
    slo: {
      maxLateMinutes: 15,
      maxUnassignedOrders: 1,
      violationPenalty: 0,
      lateMinuteExcessPenalty: 0,
      unassignedOrderExcessPenalty: 0
    }
  },
  balanced: {
    name: "balanced",
    description: "Balances efficiency, service level and moderate downside protection.",
    weights: {
      observedCost: 1,
      lateMinute: 3,
      unassignedOrder: 250,
      downsideCostRisk: 0.15
    },
    slo: {
      maxLateMinutes: 0,
      maxUnassignedOrders: 0,
      violationPenalty: 100,
      lateMinuteExcessPenalty: 5,
      unassignedOrderExcessPenalty: 300
    }
  },
  conservative: {
    name: "conservative",
    description: "Protects service reliability and the upper tail of the loss distribution.",
    weights: {
      observedCost: 1,
      lateMinute: 8,
      unassignedOrder: 750,
      downsideCostRisk: 0.4
    },
    slo: {
      maxLateMinutes: 0,
      maxUnassignedOrders: 0,
      violationPenalty: 500,
      lateMinuteExcessPenalty: 15,
      unassignedOrderExcessPenalty: 1000
    }
  }
};

export function compareStrategiesByDecisionLoss(scenario, options = {}) {
  const decisionOptions = normalizeDecisionOptions(options);
  const baselineSimulation = simulateStrategy(scenario, decisionOptions.baselineStrategy, decisionOptions);
  const candidateSimulation = simulateStrategy(scenario, decisionOptions.candidateStrategy, decisionOptions);
  const profiles = decisionOptions.profiles.map(function compareProfile(profile) {
    const baselineLoss = evaluateDecisionLoss(baselineSimulation.samples, profile, {
      confidenceLevel: decisionOptions.confidenceLevel
    });
    const candidateLoss = evaluateDecisionLoss(candidateSimulation.samples, profile, {
      confidenceLevel: decisionOptions.confidenceLevel
    });

    return {
      profile: baselineLoss.profile,
      baseline: baselineLoss,
      candidate: candidateLoss,
      recommendation: chooseLowerLoss(
        baselineSimulation.strategy,
        baselineLoss,
        candidateSimulation.strategy,
        candidateLoss
      )
    };
  });

  return {
    scenarioId: scenario.id,
    confidenceLevel: decisionOptions.confidenceLevel,
    pairing: {
      method: "shared_seed_and_iteration",
      seed: decisionOptions.seed,
      sampleSize: Math.min(baselineSimulation.samples.length, candidateSimulation.samples.length)
    },
    strategies: {
      baseline: summarizeStrategySimulation(baselineSimulation),
      candidate: summarizeStrategySimulation(candidateSimulation)
    },
    profiles: profiles
  };
}

export function evaluateDecisionLoss(samples, profileInput, options = {}) {
  const profile = normalizeDecisionProfile(profileInput);
  const metricsSamples = samples.map(readMetricsSample);

  if (metricsSamples.length === 0) {
    throw new Error("decision loss requires at least one metrics sample");
  }

  const totalCosts = metricsSamples.map(function mapCost(metrics) {
    return metrics.totalCost;
  });
  const riskReferenceCost = readFiniteNumber(options.riskReferenceCost, mean(totalCosts));
  const componentSamples = metricsSamples.map(function mapComponents(metrics) {
    return calculateLossComponents(metrics, profile, riskReferenceCost);
  });
  const totalLosses = componentSamples.map(function mapLoss(components) {
    return components.totalLoss;
  });
  const confidenceLevel =
    readFiniteNumber(options.confidenceLevel, null) !== null
      ? Math.max(0, Math.min(1, options.confidenceLevel))
      : DEFAULT_DECISION_OPTIONS.confidenceLevel;

  return {
    profile: profile,
    sampleSize: metricsSamples.length,
    riskReferenceCost: round(riskReferenceCost, 4),
    observedMetrics: summarizeObservedMetrics(metricsSamples),
    expectedLoss: {
      mean: round(mean(totalLosses), 4),
      components: summarizeLossComponents(componentSamples)
    },
    tailRisk: {
      totalLoss: calculateVarCvar(totalLosses, confidenceLevel)
    },
    slo: summarizeSlo(componentSamples),
    samples: options.includeSamples === true ? componentSamples : undefined
  };
}

export function renderDecisionLossReport(comparison) {
  const lines = [
    "OptiFlow decision loss comparison",
    "",
    "Scenario: " + comparison.scenarioId,
    "  baseline=" +
      comparison.strategies.baseline.strategy +
      ", candidate=" +
      comparison.strategies.candidate.strategy +
      ", paired_samples=" +
      comparison.pairing.sampleSize
  ];

  for (const profileComparison of comparison.profiles) {
    const delta = profileComparison.recommendation.expectedLossDelta;
    const tailDelta = profileComparison.recommendation.tailLossCvarDelta;

    lines.push(
      "Profile: " + profileComparison.profile.name,
      "  decision=" +
        profileComparison.recommendation.strategy +
        ", expected_loss_delta=" +
        formatSignedNumber(delta),
      "  baseline expected_loss=" +
        profileComparison.baseline.expectedLoss.mean +
        ", cvar_loss=" +
        profileComparison.baseline.tailRisk.totalLoss.conditionalValueAtRisk +
        ", slo_violation_probability=" +
        profileComparison.baseline.slo.violationProbability,
      "  candidate expected_loss=" +
        profileComparison.candidate.expectedLoss.mean +
        ", cvar_loss=" +
        profileComparison.candidate.tailRisk.totalLoss.conditionalValueAtRisk +
        ", slo_violation_probability=" +
        profileComparison.candidate.slo.violationProbability,
      "  tail_loss_cvar_delta=" + formatSignedNumber(tailDelta)
    );
  }

  lines.push("");
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

function summarizeStrategySimulation(simulation) {
  return {
    strategy: simulation.strategy,
    baseMetrics: simulation.baseMetrics,
    summary: simulation.summary
  };
}

function calculateLossComponents(metrics, profile, riskReferenceCost) {
  const lateExcess = Math.max(0, metrics.totalLateMinutes - profile.slo.maxLateMinutes);
  const unassignedExcess = Math.max(0, metrics.unassignedOrders - profile.slo.maxUnassignedOrders);
  const violatesSlo = lateExcess > 0 || unassignedExcess > 0;
  const components = {
    observedCost: metrics.totalCost * profile.weights.observedCost,
    lateMinutes: metrics.totalLateMinutes * profile.weights.lateMinute,
    unassignedOrders: metrics.unassignedOrders * profile.weights.unassignedOrder,
    downsideRisk: Math.max(0, metrics.totalCost - riskReferenceCost) * profile.weights.downsideCostRisk,
    sloViolation: violatesSlo
      ? profile.slo.violationPenalty +
        lateExcess * profile.slo.lateMinuteExcessPenalty +
        unassignedExcess * profile.slo.unassignedOrderExcessPenalty
      : 0
  };

  return {
    metrics: {
      totalCost: metrics.totalCost,
      totalLateMinutes: metrics.totalLateMinutes,
      unassignedOrders: metrics.unassignedOrders
    },
    components: roundComponents(components),
    totalLoss: round(
      components.observedCost +
        components.lateMinutes +
        components.unassignedOrders +
        components.downsideRisk +
        components.sloViolation,
      4
    ),
    sloViolated: violatesSlo
  };
}

function summarizeObservedMetrics(metricsSamples) {
  return {
    totalCostMean: round(
      mean(
        metricsSamples.map(function mapCost(metrics) {
          return metrics.totalCost;
        })
      ),
      4
    ),
    totalLateMinutesMean: round(
      mean(
        metricsSamples.map(function mapLate(metrics) {
          return metrics.totalLateMinutes;
        })
      ),
      4
    ),
    unassignedOrdersMean: round(
      mean(
        metricsSamples.map(function mapUnassigned(metrics) {
          return metrics.unassignedOrders;
        })
      ),
      4
    )
  };
}

function summarizeLossComponents(componentSamples) {
  const componentNames = [
    "observedCost",
    "lateMinutes",
    "unassignedOrders",
    "downsideRisk",
    "sloViolation"
  ];

  return componentNames.reduce(function reduceComponents(summary, componentName) {
    summary[componentName] = round(
      mean(
        componentSamples.map(function mapComponent(sample) {
          return sample.components[componentName];
        })
      ),
      4
    );
    return summary;
  }, {});
}

function summarizeSlo(componentSamples) {
  const violationCount = componentSamples.filter(function isViolated(sample) {
    return sample.sloViolated;
  }).length;

  return {
    violationCount: violationCount,
    violationProbability: round(violationCount / componentSamples.length, 4)
  };
}

function chooseLowerLoss(baselineStrategy, baselineLoss, candidateStrategy, candidateLoss) {
  const expectedLossDelta = round(candidateLoss.expectedLoss.mean - baselineLoss.expectedLoss.mean, 4);
  const tailLossCvarDelta = round(
    candidateLoss.tailRisk.totalLoss.conditionalValueAtRisk -
      baselineLoss.tailRisk.totalLoss.conditionalValueAtRisk,
    4
  );
  const selected =
    candidateLoss.expectedLoss.mean < baselineLoss.expectedLoss.mean
      ? {
          role: "candidate",
          strategy: candidateStrategy,
          expectedLoss: candidateLoss.expectedLoss.mean
        }
      : {
          role: "baseline",
          strategy: baselineStrategy,
          expectedLoss: baselineLoss.expectedLoss.mean
        };

  return {
    criterion: "minimum_expected_loss",
    role: selected.role,
    strategy: selected.strategy,
    expectedLoss: selected.expectedLoss,
    expectedLossDelta: expectedLossDelta,
    direction: "negative_delta_favors_candidate",
    tailLossCvarDelta: tailLossCvarDelta
  };
}

function normalizeDecisionOptions(options) {
  const seed = readPositiveInteger(options.seed, DEFAULT_DECISION_OPTIONS.seed);

  return {
    baselineStrategy: options.baselineStrategy || DEFAULT_DECISION_OPTIONS.baselineStrategy,
    candidateStrategy: options.candidateStrategy || DEFAULT_DECISION_OPTIONS.candidateStrategy,
    confidenceLevel:
      readFiniteNumber(options.confidenceLevel, null) !== null
        ? Math.max(0, Math.min(1, options.confidenceLevel))
        : DEFAULT_DECISION_OPTIONS.confidenceLevel,
    iterations: options.iterations,
    profiles: normalizeProfiles(options.profiles || DEFAULT_DECISION_OPTIONS.profiles),
    salesEventPriors: options.salesEventPriors,
    seed: seed,
    solver: options.solver || {},
    uncertainty: options.uncertainty || {}
  };
}

function normalizeProfiles(profiles) {
  const profileEntries = Array.isArray(profiles) ? profiles : [profiles];

  return profileEntries.map(normalizeDecisionProfile);
}

function normalizeDecisionProfile(profileInput) {
  if (typeof profileInput === "string") {
    const profile = DECISION_LOSS_PROFILES[profileInput];

    if (!profile) {
      throw new Error("Unknown decision loss profile: " + profileInput);
    }

    return cloneProfile(profile);
  }

  if (!profileInput || typeof profileInput !== "object" || !profileInput.name) {
    throw new Error("Decision loss profile must be a known name or an object with a name");
  }

  return {
    name: profileInput.name,
    description: profileInput.description || "",
    weights: {
      observedCost: readNonNegativeNumber(profileInput.weights?.observedCost, 1),
      lateMinute: readNonNegativeNumber(profileInput.weights?.lateMinute, 0),
      unassignedOrder: readNonNegativeNumber(profileInput.weights?.unassignedOrder, 0),
      downsideCostRisk: readNonNegativeNumber(profileInput.weights?.downsideCostRisk, 0)
    },
    slo: {
      maxLateMinutes: readNonNegativeNumber(profileInput.slo?.maxLateMinutes, 0),
      maxUnassignedOrders: readNonNegativeNumber(profileInput.slo?.maxUnassignedOrders, 0),
      violationPenalty: readNonNegativeNumber(profileInput.slo?.violationPenalty, 0),
      lateMinuteExcessPenalty: readNonNegativeNumber(profileInput.slo?.lateMinuteExcessPenalty, 0),
      unassignedOrderExcessPenalty: readNonNegativeNumber(
        profileInput.slo?.unassignedOrderExcessPenalty,
        0
      )
    }
  };
}

function readMetricsSample(sample) {
  const metrics = sample.metrics || sample;

  return {
    totalCost: readFiniteNumber(metrics.totalCost, 0),
    totalLateMinutes: readFiniteNumber(metrics.totalLateMinutes, 0),
    unassignedOrders: readFiniteNumber(metrics.unassignedOrders, 0)
  };
}

function cloneProfile(profile) {
  return {
    name: profile.name,
    description: profile.description,
    weights: { ...profile.weights },
    slo: { ...profile.slo }
  };
}

function roundComponents(components) {
  return Object.fromEntries(
    Object.entries(components).map(function mapComponent(entry) {
      return [entry[0], round(entry[1], 4)];
    })
  );
}
