import { randomUUID } from "node:crypto";
import { readNonEmptyString } from "./shared/strings.js";

const DEFAULT_SERVICE_NAME = "optiflow-core";
const DEFAULT_ENVIRONMENT = "local";

export default function createExecutionMetadata(options = {}) {
  const source = readOptions(options);
  const optimizationRunId = readNonEmptyString(source.optimizationRunId) || createId("run");

  return {
    requestId: readNonEmptyString(source.requestId) || createId("req"),
    correlationId: readNonEmptyString(source.correlationId) || createId("corr"),
    transactionId: readNonEmptyString(source.transactionId) || optimizationRunId,
    optimizationRunId: optimizationRunId,
    service: readNonEmptyString(source.service) || DEFAULT_SERVICE_NAME,
    environment: readNonEmptyString(source.environment) || DEFAULT_ENVIRONMENT
  };
}

function readOptions(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value;
}

function createId(prefix) {
  return `${prefix}_${randomUUID()}`;
}
