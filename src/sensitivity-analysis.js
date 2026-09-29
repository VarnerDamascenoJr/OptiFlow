import { compareStrategiesByDecisionLoss } from "./decision-loss.js";
import { normalizeSalesEventPriors } from "./sales-event-priors.js";
import { round } from "./shared/numbers.js";

const DEFAULT_SENSITIVITY_OPTIONS = {
  baselineStrategy: "nearest-neighbor-capacity",
  candidateStrategy: "exact-enumeration",
  confidenceLevel: 0.95,
  iterations: 100,
  profiles: ["balanced"],
  seed: 20260916
};

const DEFAULT_UNCERTAINTY = {
  cancellationProbability: 0.03,
  demandVariationProbability: 0.25,
  demandVariationRate: 0.1,
  travelTimeVariationRate: 0.15
};

const DEFAULT_FACTORS = [
  {
    id: "prior:cancellationProbability",
    label: "Cancellation prior",
    category: "prior",
    target: "cancellationProbability",
    lowMultiplier: 0.5,
    highMultiplier: 1.5
  },
  {
    id: "distribution:demandVariationRate",
    label: "Demand variation",
    category: "distribution",
    target: "demandVariationRate",
    lowMultiplier: 0.5,
    highMultiplier: 1.5
  },
  {
    id: "distribution:travelTimeVariationRate",
    label: "Travel time variation",
    category: "distribution",
    target: "travelTimeVariationRate",
    lowMultiplier: 0.5,
    highMultiplier: 1.5
  },
  {
    id: "penalty:lateMinutePenalty",
    label: "Late minute penalty",
    category: "penalty",
    target: "lateMinutePenalty",
    lowMultiplier: 0.5,
    highMultiplier: 1.5
  },
  {
    id: "penalty:unassignedOrderPenalty",
    label: "Unassigned order penalty",
    category: "penalty",
    target: "unassignedOrderPenalty",
    lowMultiplier: 0.5,
    highMultiplier: 1.5
  }
];

export function analyzeDecisionSensitivity(scenario, options = {}) {
  const sensitivityOptions = normalizeSensitivityOptions(options);
  const baseline = runDecisionComparison(scenario, sensitivityOptions);
  const variants = sensitivityOptions.factors.flatMap(function mapFactor(factor) {
    return createFactorVariants(scenario, sensitivityOptions, factor).map(function mapVariant(variant) {
      const comparison = runDecisionComparison(variant.scenario, {
        ...sensitivityOptions,
        salesEventPriors: variant.salesEventPriors,
        uncertainty: variant.uncertainty
      });

      return {
        factor: {
          id: factor.id,
          label: factor.label,
          category: factor.category,
          target: factor.target
        },
        level: variant.level,
        value: variant.value,
        comparison: summarizeComparison(comparison)
      };
    });
  });
  const profiles = baseline.profiles.map(function mapProfile(profileBaseline) {
    return summarizeProfileSensitivity(profileBaseline, variants);
  });

  return {
    scenarioId: scenario.id,
    baseline: summarizeComparison(baseline),
    factors: sensitivityOptions.factors.map(function summarizeFactor(factor) {
      return {
        id: factor.id,
        label: factor.label,
        category: factor.category,
        target: factor.target,
        lowMultiplier: factor.lowMultiplier,
        highMultiplier: factor.highMultiplier
      };
    }),
    profiles: profiles
  };
}

export function renderSensitivityReport(analysis) {
  const lines = [
    "OptiFlow decision sensitivity",
    "",
    "Scenario: " + analysis.scenarioId
  ];

  for (const profile of analysis.profiles) {
    lines.push(
      "Profile: " + profile.profile,
      "  baseline_decision=" +
        profile.baseline.strategy +
        ", expected_loss_delta=" +
        formatSignedNumber(profile.baseline.expectedLossDelta),
      "  robustness=" +
        profile.robustness.classification +
        ", recommendation_changes=" +
        profile.robustness.recommendationChangeCount,
      "  tornado:"
    );

    for (const factor of profile.tornado) {
      lines.push(
        "    " +
          factor.factorId +
          " range=[" +
          formatSignedNumber(factor.lowExpectedLossDelta) +
          ", " +
          formatSignedNumber(factor.highExpectedLossDelta) +
          "] influence=" +
          factor.influence +
          " changed=" +
          factor.recommendationChanged
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}

function runDecisionComparison(scenario, options) {
  return compareStrategiesByDecisionLoss(scenario, {
    baselineStrategy: options.baselineStrategy,
    candidateStrategy: options.candidateStrategy,
    confidenceLevel: options.confidenceLevel,
    iterations: options.iterations,
    profiles: options.profiles,
    salesEventPriors: options.salesEventPriors,
    seed: options.seed,
    solver: options.solver,
    uncertainty: options.uncertainty
  });
}

function summarizeComparison(comparison) {
  return {
    pairing: comparison.pairing,
    profiles: comparison.profiles.map(function mapProfile(profileComparison) {
      return {
        profile: profileComparison.profile.name,
        strategy: profileComparison.recommendation.strategy,
        role: profileComparison.recommendation.role,
        expectedLoss: profileComparison.recommendation.expectedLoss,
        expectedLossDelta: profileComparison.recommendation.expectedLossDelta,
        tailLossCvarDelta: profileComparison.recommendation.tailLossCvarDelta
      };
    })
  };
}

function summarizeProfileSensitivity(profileBaseline, variants) {
  const baselineRecommendation = profileBaseline.recommendation;
  const profileVariants = variants.map(function mapVariant(variant) {
    const profileResult = variant.comparison.profiles.find(function findProfile(profile) {
      return profile.profile === profileBaseline.profile.name;
    });

    return {
      factorId: variant.factor.id,
      factorLabel: variant.factor.label,
      category: variant.factor.category,
      level: variant.level,
      value: variant.value,
      strategy: profileResult.strategy,
      expectedLossDelta: profileResult.expectedLossDelta,
      influence: round(
        Math.abs(profileResult.expectedLossDelta - baselineRecommendation.expectedLossDelta),
        4
      ),
      recommendationChanged: profileResult.strategy !== baselineRecommendation.strategy
    };
  });
  const tornado = buildTornadoRows(profileVariants);
  const recommendationChangeCount = profileVariants.filter(function countChanged(variant) {
    return variant.recommendationChanged;
  }).length;

  return {
    profile: profileBaseline.profile.name,
    baseline: {
      strategy: baselineRecommendation.strategy,
      expectedLoss: baselineRecommendation.expectedLoss,
      expectedLossDelta: baselineRecommendation.expectedLossDelta
    },
    robustness: {
      classification: recommendationChangeCount === 0 ? "robust" : "fragile",
      recommendationChangeCount: recommendationChangeCount,
      testedVariantCount: profileVariants.length
    },
    variants: profileVariants,
    tornado: tornado
  };
}

function buildTornadoRows(profileVariants) {
  const variantsByFactor = profileVariants.reduce(function groupByFactor(groups, variant) {
    groups[variant.factorId] = groups[variant.factorId] || [];
    groups[variant.factorId].push(variant);
    return groups;
  }, {});

  return Object.entries(variantsByFactor)
    .map(function mapFactor(entry) {
      const factorVariants = entry[1];
      const low = factorVariants.find(function findLow(variant) {
        return variant.level === "low";
      });
      const high = factorVariants.find(function findHigh(variant) {
        return variant.level === "high";
      });
      const influence = Math.max.apply(
        null,
        factorVariants.map(function mapInfluence(variant) {
          return variant.influence;
        })
      );

      return {
        factorId: entry[0],
        factorLabel: factorVariants[0].factorLabel,
        category: factorVariants[0].category,
        lowExpectedLossDelta: low ? low.expectedLossDelta : 0,
        highExpectedLossDelta: high ? high.expectedLossDelta : 0,
        influence: round(influence, 4),
        recommendationChanged: factorVariants.some(function changed(variant) {
          return variant.recommendationChanged;
        })
      };
    })
    .sort(function sortByInfluence(left, right) {
      const influenceDifference = right.influence - left.influence;

      if (influenceDifference !== 0) {
        return influenceDifference;
      }

      return left.factorId.localeCompare(right.factorId);
    });
}

function createFactorVariants(scenario, options, factor) {
  return [
    createFactorVariant(scenario, options, factor, "low", factor.lowMultiplier),
    createFactorVariant(scenario, options, factor, "high", factor.highMultiplier)
  ];
}

function createFactorVariant(scenario, options, factor, level, multiplier) {
  const scenarioVariant = structuredClone(scenario);
  const uncertaintyVariant = { ...options.uncertainty };
  const priorsVariant = options.salesEventPriors ? structuredClone(options.salesEventPriors) : undefined;
  const baseValue = readFactorBaseValue(scenario, options, factor);
  const value = boundFactorValue(factor, baseValue * multiplier);

  if (factor.category === "penalty") {
    scenarioVariant.costs[factor.target] = value;
  } else {
    uncertaintyVariant[factor.target] = value;

    if (factor.category === "prior" && priorsVariant) {
      priorsVariant.uncertainty[factor.target] = value;

      if (factor.target === "cancellationProbability") {
        priorsVariant.estimates.cancellationProbability = value;
      }
    }
  }

  return {
    level: level,
    value: round(value, 4),
    scenario: scenarioVariant,
    salesEventPriors: priorsVariant,
    uncertainty: uncertaintyVariant
  };
}

function readFactorBaseValue(scenario, options, factor) {
  if (factor.category === "penalty") {
    return scenario.costs[factor.target];
  }

  if (typeof options.uncertainty[factor.target] === "number") {
    return options.uncertainty[factor.target];
  }

  if (
    options.salesEventPriors &&
    options.salesEventPriors.uncertainty &&
    typeof options.salesEventPriors.uncertainty[factor.target] === "number"
  ) {
    return options.salesEventPriors.uncertainty[factor.target];
  }

  return DEFAULT_UNCERTAINTY[factor.target];
}

function boundFactorValue(factor, value) {
  if (factor.category === "prior" || factor.target.endsWith("Probability")) {
    return Math.max(0, Math.min(1, value));
  }

  return Math.max(0, value);
}

function normalizeSensitivityOptions(options) {
  return {
    baselineStrategy: options.baselineStrategy || DEFAULT_SENSITIVITY_OPTIONS.baselineStrategy,
    candidateStrategy: options.candidateStrategy || DEFAULT_SENSITIVITY_OPTIONS.candidateStrategy,
    confidenceLevel:
      typeof options.confidenceLevel === "number"
        ? Math.max(0, Math.min(1, options.confidenceLevel))
        : DEFAULT_SENSITIVITY_OPTIONS.confidenceLevel,
    factors: normalizeFactors(options.factors || DEFAULT_FACTORS),
    iterations: readPositiveInteger(options.iterations, DEFAULT_SENSITIVITY_OPTIONS.iterations),
    profiles: options.profiles || DEFAULT_SENSITIVITY_OPTIONS.profiles,
    salesEventPriors: options.salesEventPriors
      ? normalizeSalesEventPriors(options.salesEventPriors)
      : undefined,
    seed: readPositiveInteger(options.seed, DEFAULT_SENSITIVITY_OPTIONS.seed),
    solver: options.solver || {},
    uncertainty: pickDefinedProperties(options.uncertainty || {})
  };
}

function normalizeFactors(factors) {
  return factors.map(function normalizeFactor(factor) {
    return {
      id: factor.id,
      label: factor.label || factor.id,
      category: factor.category,
      target: factor.target,
      lowMultiplier: readNonNegativeNumber(factor.lowMultiplier, 0.5),
      highMultiplier: readNonNegativeNumber(factor.highMultiplier, 1.5)
    };
  });
}

function pickDefinedProperties(values) {
  return Object.fromEntries(
    Object.entries(values).filter(function filterDefined(entry) {
      return entry[1] !== undefined;
    })
  );
}

function readPositiveInteger(value, fallback) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readNonNegativeNumber(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function formatSignedNumber(value) {
  if (value > 0) {
    return "+" + value;
  }

  return String(value);
}
