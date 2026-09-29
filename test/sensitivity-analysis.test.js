import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { analyzeDecisionSensitivity, renderSensitivityReport } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "small-delivery.json");
const priorsPath = path.join(
  __dirname,
  "..",
  "data",
  "sales-event-exports",
  "optiflow-sales-priors.example.json"
);
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));
const salesEventPriors = JSON.parse(fs.readFileSync(priorsPath, "utf8"));

test("analyzes decision sensitivity across priors, distributions and penalties", function testSensitivity() {
  const analysis = analyzeDecisionSensitivity(scenario, {
    iterations: 5,
    profiles: ["balanced"],
    salesEventPriors: salesEventPriors,
    seed: 42
  });
  const profile = analysis.profiles[0];

  assert.strictEqual(analysis.scenarioId, "small-delivery-v1");
  assert.strictEqual(profile.profile, "balanced");
  assert.strictEqual(profile.variants.length, 10);
  assert.strictEqual(profile.tornado.length, 5);
  assert.ok(profile.tornado[0].influence >= profile.tornado[1].influence);
  assert.ok(
    profile.variants.some(function hasPriorVariant(variant) {
      return variant.category === "prior";
    })
  );
  assert.ok(
    profile.variants.some(function hasPenaltyVariant(variant) {
      return variant.category === "penalty";
    })
  );
  assert.ok(["robust", "fragile"].includes(profile.robustness.classification));
});

test("renders a textual tornado sensitivity report", function testSensitivityReport() {
  const report = renderSensitivityReport(
    analyzeDecisionSensitivity(scenario, {
      iterations: 5,
      profiles: ["balanced"],
      salesEventPriors: salesEventPriors,
      seed: 42
    })
  );

  assert.match(report, /OptiFlow decision sensitivity/);
  assert.match(report, /Profile: balanced/);
  assert.match(report, /tornado:/);
  assert.match(report, /prior:cancellationProbability/);
});

test("marks a profile as fragile when a factor changes the recommendation", function testFragileSensitivity() {
  const analysis = analyzeDecisionSensitivity(createLateTradeoffScenario(), {
    factors: [
      {
        id: "penalty:lateMinutePenalty",
        label: "Late minute penalty",
        category: "penalty",
        target: "lateMinutePenalty",
        lowMultiplier: 0.5,
        highMultiplier: 100
      }
    ],
    iterations: 3,
    profiles: ["aggressive"],
    uncertainty: {
      cancellationProbability: 0,
      demandVariationProbability: 0,
      demandVariationRate: 0,
      travelTimeVariationRate: 0
    }
  });
  const profile = analysis.profiles[0];

  assert.strictEqual(profile.baseline.strategy, "exact-enumeration");
  assert.strictEqual(profile.robustness.classification, "fragile");
  assert.strictEqual(profile.robustness.recommendationChangeCount, 1);
  assert.strictEqual(profile.tornado[0].recommendationChanged, true);
});

function createLateTradeoffScenario() {
  return {
    id: "late-tradeoff-sensitivity-v1",
    operation: {
      startTimeMinutes: 0
    },
    costs: {
      distanceUnitCost: 1,
      lateMinutePenalty: 0.05,
      unassignedOrderPenalty: 1000
    },
    locations: [
      { id: "depot" },
      { id: "l0" },
      { id: "l1" },
      { id: "l2" },
      { id: "l3" }
    ],
    vehicles: [
      {
        id: "v1",
        capacity: 4,
        startLocationId: "depot"
      }
    ],
    orders: [
      {
        id: "o0",
        locationId: "l0",
        demand: 1,
        serviceTimeMinutes: 3,
        timeWindow: {
          startMinutes: 0,
          endMinutes: 32
        }
      },
      {
        id: "o1",
        locationId: "l1",
        demand: 1,
        serviceTimeMinutes: 3,
        timeWindow: {
          startMinutes: 0,
          endMinutes: 17
        }
      },
      {
        id: "o2",
        locationId: "l2",
        demand: 1,
        serviceTimeMinutes: 2,
        timeWindow: {
          startMinutes: 0,
          endMinutes: 19
        }
      },
      {
        id: "o3",
        locationId: "l3",
        demand: 1,
        serviceTimeMinutes: 4,
        timeWindow: {
          startMinutes: 0,
          endMinutes: 21
        }
      }
    ],
    distanceMatrix: {
      depot: { depot: 0, l0: 2, l1: 10, l2: 14, l3: 22 },
      l0: { depot: 24, l0: 0, l1: 14, l2: 11, l3: 11 },
      l1: { depot: 19, l0: 15, l1: 0, l2: 19, l3: 22 },
      l2: { depot: 5, l0: 4, l1: 17, l2: 0, l3: 6 },
      l3: { depot: 4, l0: 15, l1: 25, l2: 11, l3: 0 }
    }
  };
}
