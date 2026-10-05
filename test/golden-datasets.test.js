import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { renderGoldenDatasetReport, validateGoldenDatasets } from "../src/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootPath = path.join(__dirname, "..");

test("validates portfolio golden datasets against known formula results", function testGoldenDatasets() {
  const result = validateGoldenDatasets(readJson("data/statistics/golden-datasets.v1.json"), {
    loadScenario: readJson
  });

  assert.strictEqual(result.schemaVersion, "portfolio-golden-datasets.v1");
  assert.strictEqual(result.valid, true);
  assert.deepStrictEqual(
    result.validations.map(function mapValidation(validation) {
      return validation.dataset;
    }),
    ["funnel", "survival", "sloBurnRate", "simulation"]
  );

  for (const validation of result.validations) {
    assert.strictEqual(validation.valid, true, validation.dataset);
  }
});

test("renders a concise golden dataset validation report", function testGoldenDatasetReport() {
  const report = renderGoldenDatasetReport(
    validateGoldenDatasets(readJson("data/statistics/golden-datasets.v1.json"), {
      loadScenario: readJson
    })
  );

  assert.match(report, /OptiFlow golden dataset validation/);
  assert.match(report, /funnel: pass/);
  assert.match(report, /survival: pass/);
  assert.match(report, /sloBurnRate: pass/);
  assert.match(report, /simulation: pass/);
  assert.match(report, /Overall: pass/);
});

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootPath, relativePath), "utf8"));
}
