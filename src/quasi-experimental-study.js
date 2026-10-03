import { formatSignedNumber } from "./shared/format.js";
import { readFiniteNumber, readPositiveInteger, round } from "./shared/numbers.js";

const DEFAULT_CONFIDENCE_LEVEL = 0.95;
const NORMAL_CRITICAL_VALUE_95 = 1.96;

export function runQuasiExperimentalStudy(input, options = {}) {
  const studyInput = normalizeStudyInput(input);
  const confidenceLevel = readFiniteNumber(
    options.confidenceLevel,
    studyInput.confidenceLevel || DEFAULT_CONFIDENCE_LEVEL
  );
  const treatment = summarizeGroup(studyInput.groups.treatment);
  const control = studyInput.groups.control ? summarizeGroup(studyInput.groups.control) : null;
  const estimate = control
    ? estimateDifferenceInDifferences(treatment, control, confidenceLevel)
    : estimateBeforeAfter(treatment, confidenceLevel);

  return {
    schemaVersion: "optiflow-quasi-experimental-study.v1",
    id: studyInput.id,
    question: studyInput.question,
    generatedAt: studyInput.generatedAt,
    intervention: studyInput.intervention,
    metric: studyInput.metric,
    design: {
      method: control ? "difference_in_differences" : "before_after",
      confidenceLevel,
      treatmentGroup: treatment.group,
      controlGroup: control ? control.group : null
    },
    groups: {
      treatment,
      control
    },
    estimate,
    validity: assessValidity(studyInput, estimate, control),
    conclusion: summarizeConclusion(estimate, control)
  };
}

export function renderQuasiExperimentalStudyReport(study) {
  return [
    "OptiFlow quasi-experimental study",
    "",
    "Study: " + study.id,
    "Question: " + study.question,
    "Intervention: " + study.intervention.name,
    "Metric: " + study.metric.name,
    "Design: " + study.design.method,
    "",
    renderGroup("Treatment", study.groups.treatment),
    study.groups.control ? renderGroup("Control", study.groups.control) : "",
    "Estimate:",
    "  effect=" + formatSignedNumber(study.estimate.effect),
    "  standard_error=" + study.estimate.standardError,
    "  ci95=[" +
      study.estimate.confidenceInterval95.lower +
      ", " +
      study.estimate.confidenceInterval95.upper +
      "]",
    "  direction=" + study.estimate.direction,
    "Conclusion: " + study.conclusion.label,
    "Caution: " + study.conclusion.caution,
    ""
  ]
    .filter(Boolean)
    .join("\n");
}

function estimateDifferenceInDifferences(treatment, control, confidenceLevel) {
  const effect = treatment.change - control.change;
  const standardError = Math.sqrt(treatment.variance + control.variance);

  return {
    estimand: "average_treatment_effect_on_rate_difference",
    effect: round(effect, 4),
    standardError: round(standardError, 4),
    confidenceInterval95: confidenceInterval(effect, standardError),
    confidenceLevel,
    treatmentBeforeAfterChange: round(treatment.change, 4),
    controlBeforeAfterChange: round(control.change, 4),
    direction: effect > 0 ? "improved" : effect < 0 ? "worse" : "no_change"
  };
}

function estimateBeforeAfter(treatment, confidenceLevel) {
  return {
    estimand: "before_after_rate_difference",
    effect: round(treatment.change, 4),
    standardError: round(Math.sqrt(treatment.variance), 4),
    confidenceInterval95: confidenceInterval(treatment.change, Math.sqrt(treatment.variance)),
    confidenceLevel,
    treatmentBeforeAfterChange: round(treatment.change, 4),
    controlBeforeAfterChange: null,
    direction: treatment.change > 0 ? "improved" : treatment.change < 0 ? "worse" : "no_change"
  };
}

function summarizeGroup(group) {
  const before = summarizePeriod(group.before);
  const after = summarizePeriod(group.after);

  return {
    group: group.name,
    description: group.description,
    before,
    after,
    change: round(after.rate - before.rate, 4),
    variance: round(before.variance + after.variance, 8)
  };
}

function summarizePeriod(period) {
  const trials = readPositiveInteger(period.trials, 0);
  const successes = readPositiveInteger(period.successes, 0);
  const rate = trials === 0 ? 0 : successes / trials;

  return {
    label: period.label,
    startedAt: period.startedAt,
    endedAt: period.endedAt,
    successes,
    trials,
    rate: round(rate, 4),
    variance: trials === 0 ? 0 : round((rate * (1 - rate)) / trials, 8)
  };
}

function assessValidity(studyInput, estimate, control) {
  const declaredThreats = Array.isArray(studyInput.validityThreats)
    ? studyInput.validityThreats
    : [];
  const assumptions = Array.isArray(studyInput.assumptions) ? studyInput.assumptions : [];

  return {
    assumptions,
    threats: declaredThreats,
    controlAvailable: Boolean(control),
    causalLanguage:
      control && estimate.confidenceInterval95.lower > 0
        ? "cautious_association_with_plausible_positive_effect"
        : "association_only",
    limitation:
      "This fixture demonstrates design discipline; it does not prove causality without stronger parallel-trend and confounding evidence."
  };
}

function summarizeConclusion(estimate, control) {
  const excludesZero =
    estimate.confidenceInterval95.lower > 0 || estimate.confidenceInterval95.upper < 0;

  if (estimate.effect > 0 && excludesZero && control) {
    return {
      label: "cautious_positive_association",
      caution:
        "The treated group improved more than the control, but the conclusion still depends on parallel trends and unobserved confounding assumptions."
    };
  }

  if (estimate.effect < 0 && excludesZero && control) {
    return {
      label: "cautious_negative_association",
      caution:
        "The treated group worsened relative to control; treat this as a signal for investigation, not proof of harm."
    };
  }

  return {
    label: "inconclusive",
    caution:
      "The estimated effect is compatible with zero or lacks a control group, so it should not be described as causal."
  };
}

function normalizeStudyInput(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Quasi-experimental study input must be an object");
  }

  return {
    id: input.id || "quasi-experimental-study",
    question: input.question || "Did the intervention improve the metric beyond temporal noise?",
    generatedAt: input.generatedAt || "",
    confidenceLevel: input.confidenceLevel,
    intervention: normalizeIntervention(input.intervention),
    metric: normalizeMetric(input.metric),
    groups: {
      treatment: normalizeGroup(input.groups?.treatment, "treatment"),
      control: input.groups?.control ? normalizeGroup(input.groups.control, "control") : null
    },
    assumptions: input.assumptions,
    validityThreats: input.validityThreats
  };
}

function normalizeIntervention(intervention) {
  if (!intervention || typeof intervention !== "object") {
    throw new Error("Quasi-experimental study requires an intervention");
  }

  return {
    name: intervention.name || "intervention",
    type: intervention.type || "simulated_operational_change",
    description: intervention.description || "",
    startedAt: intervention.startedAt || ""
  };
}

function normalizeMetric(metric) {
  if (!metric || typeof metric !== "object") {
    throw new Error("Quasi-experimental study requires a metric");
  }

  return {
    name: metric.name || "success_rate",
    unit: metric.unit || "proportion",
    favorableDirection: metric.favorableDirection || "increase"
  };
}

function normalizeGroup(group, fallbackName) {
  if (!group || typeof group !== "object") {
    throw new Error("Quasi-experimental study requires a " + fallbackName + " group");
  }

  return {
    name: group.name || fallbackName,
    description: group.description || "",
    before: normalizePeriod(group.before, fallbackName + ".before"),
    after: normalizePeriod(group.after, fallbackName + ".after")
  };
}

function normalizePeriod(period, label) {
  if (!period || typeof period !== "object") {
    throw new Error("Quasi-experimental study requires period " + label);
  }

  return {
    label: period.label || label,
    startedAt: period.startedAt || "",
    endedAt: period.endedAt || "",
    successes: period.successes,
    trials: period.trials
  };
}

function confidenceInterval(effect, standardError) {
  return {
    lower: round(effect - NORMAL_CRITICAL_VALUE_95 * standardError, 4),
    upper: round(effect + NORMAL_CRITICAL_VALUE_95 * standardError, 4)
  };
}

function renderGroup(label, group) {
  return [
    label + " group: " + group.group,
    "  before_rate=" + group.before.rate + ", after_rate=" + group.after.rate,
    "  before_after_change=" + formatSignedNumber(group.change)
  ].join("\n");
}
