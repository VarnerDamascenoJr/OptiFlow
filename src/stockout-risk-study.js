import { readNonNegativeNumber, readProbability, round } from "./shared/numbers.js";

const DEFAULT_STOCKOUT_PENALTY_PER_UNIT = 40;

export function runStockoutRiskStudy(input, options = {}) {
  const studyInput = normalizeStudyInput(input);
  const penaltyPerUnit = readNonNegativeNumber(
    options.stockoutPenaltyPerUnit,
    studyInput.stockoutPenaltyPerUnit ?? DEFAULT_STOCKOUT_PENALTY_PER_UNIT
  );
  const baseline = evaluatePolicy(studyInput, studyInput.policies.baseline, penaltyPerUnit);
  const candidate = evaluatePolicy(studyInput, studyInput.policies.candidate, penaltyPerUnit);
  const deltas = summarizeDeltas(baseline, candidate);

  return {
    schemaVersion: "optiflow-stockout-risk-study.v1",
    id: studyInput.id,
    question: studyInput.question,
    generatedAt: studyInput.generatedAt,
    source: studyInput.source,
    stockoutPenaltyPerUnit: penaltyPerUnit,
    baseline,
    candidate,
    deltas,
    recommendation:
      candidate.expectedDecisionCost < baseline.expectedDecisionCost
        ? {
            policy: candidate.policy,
            reason: "candidate_reduces_expected_decision_cost"
          }
        : {
            policy: baseline.policy,
            reason: "baseline_minimizes_expected_decision_cost"
          },
    conclusion: {
      riskReduced: deltas.stockoutProbabilityDelta < 0,
      costIncreased: deltas.interventionCostDelta > 0,
      interpretation:
        deltas.stockoutProbabilityDelta < 0
          ? "The candidate policy spends additional capacity to reduce stockout probability."
          : "The candidate policy does not reduce stockout probability in this fixture."
    }
  };
}

export function renderStockoutRiskStudyReport(study) {
  return [
    "OptiFlow stockout risk study",
    "",
    "Study: " + study.id,
    "Question: " + study.question,
    "Source: " + study.source.service + " " + study.source.schemaVersion,
    "Penalty per unit: " + study.stockoutPenaltyPerUnit,
    "",
    renderPolicy("Baseline", study.baseline),
    renderPolicy("Candidate", study.candidate),
    "Trade-off:",
    "  stockout_probability_delta=" + formatSignedNumber(study.deltas.stockoutProbabilityDelta),
    "  intervention_cost_delta=" + formatSignedNumber(study.deltas.interventionCostDelta),
    "  expected_stockout_loss_delta=" + formatSignedNumber(study.deltas.expectedStockoutLossDelta),
    "  expected_decision_cost_delta=" + formatSignedNumber(study.deltas.expectedDecisionCostDelta),
    "  cost_per_probability_point_reduced=" +
      formatNullableNumber(study.deltas.costPerProbabilityPointReduced),
    "Recommendation: " + study.recommendation.policy + " (" + study.recommendation.reason + ")",
    ""
  ].join("\n");
}

function evaluatePolicy(studyInput, policy, penaltyPerUnit) {
  const ticketResults = studyInput.stockoutRisks.map(function mapRisk(risk) {
    const action = findPolicyAction(policy, risk);
    const addedCapacity = action ? action.additionalCapacity : 0;
    const interventionCost = action ? addedCapacity * action.unitCost : 0;
    const initialProbability = readProbability(risk.stockoutProbability, 0);
    const residualProbability = calculateResidualStockoutProbability(risk, addedCapacity);
    const expectedDemand = readNonNegativeNumber(risk.expectedDemand, 0);
    const expectedStockoutLoss = residualProbability * expectedDemand * penaltyPerUnit;

    return {
      ticketId: risk.ticketId,
      ticketType: risk.ticketType,
      riskBand: risk.riskBand,
      status: risk.status,
      availableQuantity: readNonNegativeNumber(risk.availableQuantity, 0),
      expectedDemand,
      baselineStockoutProbability: round(initialProbability, 4),
      residualStockoutProbability: round(residualProbability, 4),
      stockoutProbabilityReduction: round(initialProbability - residualProbability, 4),
      addedCapacity,
      interventionCost: round(interventionCost, 4),
      expectedStockoutLoss: round(expectedStockoutLoss, 4)
    };
  });
  const aggregate = summarizePolicy(ticketResults);

  return {
    policy: policy.name,
    description: policy.description,
    tickets: ticketResults,
    ...aggregate
  };
}

function summarizePolicy(ticketResults) {
  const expectedDemandTotal = sum(
    ticketResults.map(function mapExpectedDemand(ticket) {
      return ticket.expectedDemand;
    })
  );
  const weightedStockoutProbability =
    expectedDemandTotal === 0
      ? 0
      : sum(
          ticketResults.map(function mapWeightedRisk(ticket) {
            return ticket.residualStockoutProbability * ticket.expectedDemand;
          })
        ) / expectedDemandTotal;
  const interventionCost = sum(
    ticketResults.map(function mapInterventionCost(ticket) {
      return ticket.interventionCost;
    })
  );
  const expectedStockoutLoss = sum(
    ticketResults.map(function mapStockoutLoss(ticket) {
      return ticket.expectedStockoutLoss;
    })
  );

  return {
    weightedStockoutProbability: round(weightedStockoutProbability, 4),
    interventionCost: round(interventionCost, 4),
    expectedStockoutLoss: round(expectedStockoutLoss, 4),
    expectedDecisionCost: round(interventionCost + expectedStockoutLoss, 4)
  };
}

function summarizeDeltas(baseline, candidate) {
  const probabilityDelta = round(
    candidate.weightedStockoutProbability - baseline.weightedStockoutProbability,
    4
  );
  const interventionCostDelta = round(candidate.interventionCost - baseline.interventionCost, 4);
  const expectedStockoutLossDelta = round(
    candidate.expectedStockoutLoss - baseline.expectedStockoutLoss,
    4
  );
  const expectedDecisionCostDelta = round(
    candidate.expectedDecisionCost - baseline.expectedDecisionCost,
    4
  );
  const probabilityReduction = Math.max(0, -probabilityDelta);

  return {
    stockoutProbabilityDelta: probabilityDelta,
    interventionCostDelta,
    expectedStockoutLossDelta,
    expectedDecisionCostDelta,
    costPerProbabilityPointReduced:
      probabilityReduction === 0 ? null : round(interventionCostDelta / (probabilityReduction * 100), 4)
  };
}

function calculateResidualStockoutProbability(risk, addedCapacity) {
  const initialProbability = readProbability(risk.stockoutProbability, 0);
  const expectedDemand = readNonNegativeNumber(risk.expectedDemand, 0);
  const availableQuantity = readNonNegativeNumber(risk.availableQuantity, 0) + addedCapacity;

  if (addedCapacity === 0) {
    return initialProbability;
  }

  if (risk.status === "stockout") {
    return addedCapacity > 0 ? poissonTailProbability(expectedDemand, availableQuantity) : 1;
  }

  if (expectedDemand === 0) {
    return initialProbability;
  }

  return poissonTailProbability(expectedDemand, availableQuantity);
}

function poissonTailProbability(lambda, threshold) {
  const integerThreshold = Math.max(0, Math.floor(threshold));
  let probability = Math.exp(-lambda);
  let cumulative = probability;

  for (let k = 1; k <= integerThreshold; k += 1) {
    probability *= lambda / k;
    cumulative += probability;
  }

  return round(Math.max(0, Math.min(1, 1 - cumulative)), 6);
}

function normalizeStudyInput(input) {
  if (!input || typeof input !== "object") {
    throw new Error("Stockout risk study input must be an object");
  }

  return {
    id: input.id || "stockout-risk-study",
    question: input.question || "How much does it cost to reduce stockout probability?",
    generatedAt: input.generatedAt || "",
    source: {
      service: input.source?.service || "sales-event-project",
      schemaVersion: input.source?.schemaVersion || "sales-analytics-export.v1"
    },
    stockoutPenaltyPerUnit: input.stockoutPenaltyPerUnit,
    stockoutRisks: readStockoutRisks(input),
    policies: {
      baseline: normalizePolicy(input.policies?.baseline, "baseline"),
      candidate: normalizePolicy(input.policies?.candidate, "candidate")
    }
  };
}

function readStockoutRisks(input) {
  const risks =
    input.stockoutRisks ||
    input.simulationPriors?.stockoutRisks ||
    input.salesAnalyticsExport?.simulationPriors?.stockoutRisks;

  if (!Array.isArray(risks) || risks.length === 0) {
    throw new Error("Stockout risk study requires at least one stockout risk");
  }

  return risks;
}

function normalizePolicy(policy, fallbackName) {
  if (!policy || typeof policy !== "object") {
    throw new Error("Stockout risk study requires a " + fallbackName + " policy");
  }

  return {
    name: policy.name || fallbackName,
    description: policy.description || "",
    actions: Array.isArray(policy.actions) ? policy.actions.map(normalizePolicyAction) : []
  };
}

function normalizePolicyAction(action) {
  return {
    ticketId: action.ticketId,
    ticketType: action.ticketType,
    additionalCapacity: readNonNegativeNumber(action.additionalCapacity, 0),
    unitCost: readNonNegativeNumber(action.unitCost, 0)
  };
}

function findPolicyAction(policy, risk) {
  return policy.actions.find(function findAction(action) {
    return (
      (action.ticketId && action.ticketId === risk.ticketId) ||
      (action.ticketType && action.ticketType === risk.ticketType)
    );
  });
}

function renderPolicy(label, policy) {
  return [
    label + " policy: " + policy.policy,
    "  weighted_stockout_probability=" + policy.weightedStockoutProbability,
    "  intervention_cost=" + policy.interventionCost,
    "  expected_stockout_loss=" + policy.expectedStockoutLoss,
    "  expected_decision_cost=" + policy.expectedDecisionCost
  ].join("\n");
}

function sum(values) {
  return values.reduce(function reduceValues(total, value) {
    return total + value;
  }, 0);
}

function formatNullableNumber(value) {
  return value === null ? "n/a" : String(value);
}

function formatSignedNumber(value) {
  if (value > 0) {
    return "+" + value;
  }

  return String(value);
}
