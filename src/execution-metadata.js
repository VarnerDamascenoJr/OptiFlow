import { randomUUID } from "node:crypto";

const DEFAULT_SERVICE_NAME = "optiflow-core";
const DEFAULT_ENVIRONMENT = "local";

export default function createExecutionMetadata(options = {}) {
  const source = readOptions(options);
  const optimizationRunId = readString(source.optimizationRunId) || createId("run");

  return {
    requestId: readString(source.requestId) || createId("req"),
    correlationId: readString(source.correlationId) || createId("corr"),
    transactionId: readString(source.transactionId) || optimizationRunId,
    optimizationRunId: optimizationRunId,
    service: readString(source.service) || DEFAULT_SERVICE_NAME,
    environment: readString(source.environment) || DEFAULT_ENVIRONMENT
  };
}

function readOptions(value) {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value;
}

function readString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed;
}

function createId(prefix) {
  return `${prefix}_${randomUUID()}`;
}
