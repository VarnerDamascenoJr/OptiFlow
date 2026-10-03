import { evaluateDecisionLoss } from "./decision-loss.js";
import { formatNullableNumber, formatSignedNumber } from "./shared/format.js";
import { readFiniteNumber, round } from "./shared/numbers.js";
import { assertRequiredObject } from "./shared/validation.js";

const DEFAULT_STEADY_STATE_PROFILE = {
  name: "steady-state-operations",
  description: "Uses normal operating preferences before a reliability signal escalates.",
  weights: {
    observedCost: 1,
    lateMinute: 0.5,
    unassignedOrder: 75,
    downsideCostRisk: 0
  },
  slo: {
    maxLateMinutes: 15,
    maxUnassignedOrders: 1,
    violationPenalty: 0,
    lateMinuteExcessPenalty: 0,
    unassignedOrderExcessPenalty: 0
  }
};

const RELIABILITY_PROFILE_BY_SEVERITY = {
  no_data: DEFAULT_STEADY_STATE_PROFILE,
  ok: DEFAULT_STEADY_STATE_PROFILE,
  watch: {
    name: "watch-reliability-response",
    description: "Adds modest service penalties when burn rate starts consuming budget faster than planned.",
    weights: {
      observedCost: 1,
      lateMinute: 2,
      unassignedOrder: 150,
      downsideCostRisk: 0.05
    },
    slo: {
      maxLateMinutes: 10,
      maxUnassignedOrders: 0,
      violationPenalty: 50,
      lateMinuteExcessPenalty: 3,
      unassignedOrderExcessPenalty: 200
    }
  },
  warning: {
    name: "warning-reliability-response",
    description: "Raises latency and SLO penalties when one burn-rate window crosses escalation threshold.",
    weights: {
      observedCost: 1,
      lateMinute: 5,
      unassignedOrder: 350,
      downsideCostRisk: 0.15
    },
    slo: {
      maxLateMinutes: 5,
      maxUnassignedOrders: 0,
      violationPenalty: 200,
      lateMinuteExcessPenalty: 10,
      unassignedOrderExcessPenalty: 500
    }
  },
  page: {
    name: "page-reliability-response",
    description: "Prioritizes reliability when short and long burn-rate windows require immediate response.",
    weights: {
      observedCost: 1,
      lateMinute: 8,
      unassignedOrder: 750,
      downsideCostRisk: 0.25
    },
    slo: {
      maxLateMinutes: 0,
      maxUnassignedOrders: 0,
      violationPenalty: 500,
      lateMinuteExcessPenalty: 20,
      unassignedOrderExcessPenalty: 1000
    }
  }
};

const SEVERITIES = ["no_data", "ok", "watch", "warning", "page"];

export function runReliabilityDecisionStudy(input, options = {}) {
  const studyInput = normalizeStudyInput(input);
  const steadyStateProfile = cloneProfile(options.steadyStateProfile || DEFAULT_STEADY_STATE_PROFILE);
  const reliabilitySeverity = readReliabilitySeverity(studyInput.reliabilitySignal);
  const reliabilityProfile = cloneProfile(
    options.reliabilityProfile || RELIABILITY_PROFILE_BY_SEVERITY[reliabilitySeverity]
  );
  const steadyStateDecision = comparePlans(studyInput.plans, steadyStateProfile, options);
  const reliabilityAdjustedDecision = comparePlans(studyInput.plans, reliabilityProfile, options);

  return {
    id: studyInput.id,
    question: studyInput.question,
    reliabilitySignal: {
      severity: reliabilitySeverity,
      sourceProject: studyInput.reliabilitySignal.sourceProject,
      summary: summarizeReliabilitySignal(studyInput.reliabilitySignal)
    },
    decisions: {
      steadyState: steadyStateDecision,
      reliabilityAdjusted: reliabilityAdjustedDecision
    },
    decisionChanged:
      steadyStateDecision.recommendation.role !== reliabilityAdjustedDecision.recommendation.role
  };
}

export function renderReliabilityDecisionStudyReport(study) {
  const lines = [
    "OptiFlow reliability decision study",
    "",
    "Study: " + study.id,
    "Question: " + study.question,
    "Reliability signal: " +
      study.reliabilitySignal.severity +
      " from " +
      study.reliabilitySignal.sourceProject
  ];

  for (const objective of study.reliabilitySignal.summary.objectives) {
    lines.push(
      "  " +
        objective.type +
        " severity=" +
        objective.severity +
        ", short_burn_rate=" +
        formatNullableNumber(objective.shortBurnRate) +
        ", long_burn_rate=" +
        formatNullableNumber(objective.longBurnRate)
    );
  }

  lines.push("", renderDecisionBlock("Steady state", study.decisions.steadyState));
  lines.push(renderDecisionBlock("Reliability adjusted", study.decisions.reliabilityAdjusted));
  lines.push("Decision changed: " + (study.decisionChanged ? "yes" : "no"));
  lines.push("");

  return lines.join("\n");
}

function comparePlans(plans, profile, options) {
  const previousLoss = evaluateDecisionLoss(plans.previous.samples, profile, {
    confidenceLevel: options.confidenceLevel
  });
  const recommendedLoss = evaluateDecisionLoss(plans.recommended.samples, profile, {
    confidenceLevel: options.confidenceLevel
  });
  const expectedLossDelta = round(
    recommendedLoss.expectedLoss.mean - previousLoss.expectedLoss.mean,
    4
  );
  const recommendation =
    recommendedLoss.expectedLoss.mean < previousLoss.expectedLoss.mean
      ? {
          role: "recommended",
          strategy: plans.recommended.strategy,
          expectedLoss: recommendedLoss.expectedLoss.mean
        }
      : {
          role: "previous",
          strategy: plans.previous.strategy,
          expectedLoss: previousLoss.expectedLoss.mean
        };

  return {
    profile: previousLoss.profile,
    plans: {
      previous: {
        strategy: plans.previous.strategy,
        loss: previousLoss
      },
      recommended: {
        strategy: plans.recommended.strategy,
        loss: recommendedLoss
      }
    },
    recommendation: {
      ...recommendation,
      criterion: "minimum_expected_loss",
      expectedLossDelta,
      direction: "negative_delta_favors_recommended"
    }
  };
}

function normalizeStudyInput(input) {
  assertRequiredObject(input, "Reliability decision study input must be an object");

  return {
    id: input.id || "reliability-decision-study",
    question: input.question || "Should a reliability signal change the allocation decision?",
    reliabilitySignal: normalizeReliabilitySignal(input.reliabilitySignal),
    plans: {
      previous: normalizePlan(input.plans?.previous, "previous"),
      recommended: normalizePlan(input.plans?.recommended, "recommended")
    }
  };
}

function normalizeReliabilitySignal(signal) {
  assertRequiredObject(signal, "Reliability decision study requires a reliabilitySignal object");

  return {
    ...signal,
    sourceProject: signal.sourceProject || "operational-observability-platform",
    objectives: Array.isArray(signal.objectives) ? signal.objectives : []
  };
}

function normalizePlan(plan, role) {
  assertRequiredObject(plan, "Reliability decision study requires a " + role + " plan");

  if (!Array.isArray(plan.samples) || plan.samples.length === 0) {
    throw new Error("Reliability decision study " + role + " plan requires samples");
  }

  return {
    strategy: plan.strategy || role,
    samples: plan.samples
  };
}

function readReliabilitySeverity(signal) {
  if (isSeverity(signal.overallSeverity)) {
    return signal.overallSeverity;
  }

  return signal.objectives.reduce(function reduceSeverity(highestSeverity, objective) {
    const severity = isSeverity(objective.severity) ? objective.severity : "no_data";
    return severityRank(severity) > severityRank(highestSeverity) ? severity : highestSeverity;
  }, "no_data");
}

function summarizeReliabilitySignal(signal) {
  return {
    objectives: signal.objectives.map(function mapObjective(objective) {
      return {
        type: objective.type || "unknown",
        severity: isSeverity(objective.severity) ? objective.severity : "no_data",
        shortBurnRate: readBurnRate(objective.shortWindow),
        longBurnRate: readBurnRate(objective.longWindow)
      };
    })
  };
}

function readBurnRate(window) {
  return readFiniteNumber(window?.burnRate, null);
}

function isSeverity(value) {
  return SEVERITIES.includes(value);
}

function severityRank(severity) {
  return SEVERITIES.indexOf(severity);
}

function renderDecisionBlock(label, decision) {
  return [
    label + " profile: " + decision.profile.name,
    "  decision=" +
      decision.recommendation.strategy +
      ", role=" +
      decision.recommendation.role +
      ", expected_loss_delta=" +
      formatSignedNumber(decision.recommendation.expectedLossDelta),
    "  previous expected_loss=" +
      decision.plans.previous.loss.expectedLoss.mean +
      ", slo_violation_probability=" +
      decision.plans.previous.loss.slo.violationProbability,
    "  recommended expected_loss=" +
      decision.plans.recommended.loss.expectedLoss.mean +
      ", slo_violation_probability=" +
      decision.plans.recommended.loss.slo.violationProbability
  ].join("\n");
}

function cloneProfile(profile) {
  return {
    name: profile.name,
    description: profile.description,
    weights: { ...profile.weights },
    slo: { ...profile.slo }
  };
}
