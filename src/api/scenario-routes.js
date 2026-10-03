import { readJsonBody, sendError, sendJson } from "./http.js";
import { validateScenarioForApi } from "./scenario-validation.js";

export async function handleValidateScenarioRoute(requestContext) {
  const body = await readJsonBody(
    requestContext.request,
    requestContext.dependencies.bodyLimitBytes
  );
  const scenario = readScenarioPayload(body);

  if (!validateScenarioForApi(requestContext.response, scenario)) {
    return;
  }

  sendJson(requestContext.response, 200, {
    valid: true,
    scenarioId: scenario.id
  });
}

export async function handleCreateScenarioRoute(requestContext) {
  const body = await readJsonBody(
    requestContext.request,
    requestContext.dependencies.bodyLimitBytes
  );
  const scenario = readScenarioPayload(body);

  if (!validateScenarioForApi(requestContext.response, scenario)) {
    return;
  }

  const scenarioRecord = requestContext.dependencies.repository.recordScenario({
    scenario: scenario,
    createdAt: new Date()
  });

  sendJson(requestContext.response, 201, renderScenarioRecord(scenarioRecord));
}

export function handleGetScenarioRoute(requestContext) {
  const pathname = requestContext.url.pathname;
  const scenarioRecordId = decodeURIComponent(pathname.slice("/scenarios/".length));
  const scenarioRecord = requestContext.dependencies.repository.getScenarioRecord(scenarioRecordId);

  if (!scenarioRecord) {
    sendError(requestContext.response, 404, "scenario_not_found", "Scenario record not found");
    return;
  }

  sendJson(requestContext.response, 200, renderScenarioRecord(scenarioRecord));
}

function readScenarioPayload(body) {
  if (body && body.scenario) {
    return body.scenario;
  }

  return body;
}

function renderScenarioRecord(scenarioRecord) {
  return {
    scenarioRecordId: scenarioRecord.id,
    scenarioId: scenarioRecord.scenarioId,
    name: scenarioRecord.name,
    contentHash: scenarioRecord.contentHash,
    createdAt: scenarioRecord.createdAt,
    scenario: scenarioRecord.payload
  };
}
