import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  importSalesEventScenario,
  solveScenario,
  validateScenario
} from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const exportFixturePath = path.join(
  __dirname,
  "..",
  "data",
  "sales-event-exports",
  "optiflow-sales-history.example.json"
);

test("imports completed sales as a valid OptiFlow scenario", function testImportCompletedSales() {
  const exportDocument = readJSON(exportFixturePath);
  const scenario = importSalesEventScenario(exportDocument);

  assert.strictEqual(scenario.id, "sales-event-11111111-1111-1111-1111-111111111111-fulfillment");
  assert.strictEqual(scenario.source.saleCount, 4);
  assert.strictEqual(scenario.source.completedSaleCount, 3);
  assert.strictEqual(scenario.locations.length, 4);
  assert.strictEqual(scenario.orders.length, 3);
  assert.deepStrictEqual(
    scenario.orders.map(function mapOrder(order) {
      return order.id;
    }),
    [
      "sale-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
      "sale-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
      "sale-cccccccc-cccc-cccc-cccc-ccccccccccc3"
    ]
  );
  assert.deepStrictEqual(
    scenario.orders.map(function mapDemand(order) {
      return order.demand;
    }),
    [2, 2, 3]
  );
  assert.strictEqual(scenario.orders[0].source.correlationId, "corr-sales-alpha");

  assert.doesNotThrow(function validateImportedScenario() {
    validateScenario(scenario);
  });

  const result = solveScenario(scenario);
  assert.strictEqual(result.metrics.servedOrders, 3);
  assert.strictEqual(result.metrics.unassignedOrders, 0);
});

test("rejects sales exports with incomplete order data", function testRejectIncompleteSale() {
  const exportDocument = readJSON(exportFixturePath);
  exportDocument.sales[0].items = [];

  assert.throws(function importIncompleteExport() {
    importSalesEventScenario(exportDocument);
  }, /salesEventExport\.sales\[0\]\.items must contain at least one item/);
});

test("rejects unsupported sales export schema versions", function testRejectSchemaVersion() {
  const exportDocument = readJSON(exportFixturePath);
  exportDocument.schemaVersion = "sales-event-optiflow-export.v0";

  assert.throws(function importUnsupportedVersion() {
    importSalesEventScenario(exportDocument);
  }, /salesEventExport\.schemaVersion must be sales-event-optiflow-export\.v1/);
});

function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
