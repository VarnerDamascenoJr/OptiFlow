import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  evaluateSalesDecisionScenario,
  validateSalesDecisionScenario
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scenarioPath = path.join(__dirname, "..", "data", "scenarios", "sales-event-capacity.json");
const scenario = JSON.parse(fs.readFileSync(scenarioPath, "utf8"));

test("validates the sales decision scenario", function testValidateSalesDecisionScenario() {
  assert.doesNotThrow(function validate() {
    validateSalesDecisionScenario(scenario);
  });
});

test("evaluates deterministic sales capacity metrics", function testEvaluateSalesCapacityMetrics() {
  const result = evaluateSalesDecisionScenario(scenario);

  assert.strictEqual(result.scenarioId, "sales-event-capacity-v1");
  assert.strictEqual(result.strategy.id, "deterministic-capacity-baseline");
  assert.deepStrictEqual(result.totals, {
    expectedDemand: 138,
    availableCapacity: 120,
    acceptedDemand: 118,
    lostDemand: 20,
    unusedCapacity: 2,
    potentialRevenue: 1650000,
    expectedRevenue: 1450000,
    lostRevenue: 200000,
    stockoutPenalty: 100000,
    unusedCapacityPenalty: 200,
    strategyValue: 1349800,
    serviceRate: 0.8551,
    capacityUtilizationRate: 0.9833,
    stockoutRate: 0.1449
  });
  assert.deepStrictEqual(result.itemResults, [
    {
      itemId: "22222222-2222-2222-2222-222222222222",
      itemName: "General Admission",
      unitPrice: 10000,
      expectedDemand: 120,
      availableCapacity: 100,
      acceptedDemand: 100,
      lostDemand: 20,
      unusedCapacity: 0,
      potentialRevenue: 1200000,
      expectedRevenue: 1000000,
      lostRevenue: 200000,
      stockoutPenalty: 100000,
      unusedCapacityPenalty: 0,
      strategyValue: 900000
    },
    {
      itemId: "33333333-3333-3333-3333-333333333333",
      itemName: "VIP",
      unitPrice: 25000,
      expectedDemand: 18,
      availableCapacity: 20,
      acceptedDemand: 18,
      lostDemand: 0,
      unusedCapacity: 2,
      potentialRevenue: 450000,
      expectedRevenue: 450000,
      lostRevenue: 0,
      stockoutPenalty: 0,
      unusedCapacityPenalty: 200,
      strategyValue: 449800
    }
  ]);
});

test("returns warnings for stockout and unused capacity", function testWarnings() {
  const result = evaluateSalesDecisionScenario(scenario);

  assert.deepStrictEqual(result.warnings, [
    {
      code: "STOCKOUT_RISK",
      itemId: "22222222-2222-2222-2222-222222222222",
      message: "Expected demand exceeds available capacity for this item."
    },
    {
      code: "UNUSED_CAPACITY",
      itemId: "33333333-3333-3333-3333-333333333333",
      message: "Available capacity remains unused under expected demand."
    }
  ]);
});

test("rejects demand assumptions for unknown items", function testUnknownDemandItem() {
  const invalidScenario = clone(scenario);
  invalidScenario.demandAssumptions[0].itemId = "unknown-item";

  assert.throws(function validate() {
    validateSalesDecisionScenario(invalidScenario);
  }, /must reference a known item/);
});

test("rejects missing demand assumptions for known items", function testMissingDemandAssumption() {
  const invalidScenario = clone(scenario);
  invalidScenario.demandAssumptions.pop();

  assert.throws(function validate() {
    validateSalesDecisionScenario(invalidScenario);
  }, /must include itemId/);
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
