import http from "node:http";
import { sendError } from "./api/http.js";
import { createJsonLogger, logOptimizationRunEvent } from "./api/logger.js";
import { handleApiRequest } from "./api/router.js";
import { createOptimizationHistoryRepository } from "./optimization-history.js";
import { createOptimizationRunQueue } from "./optimization-run-queue.js";
import { solveScenario } from "./index.js";

const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024;

export function createOptiFlowApiServer(options = {}) {
  const repository =
    options.repository || createOptimizationHistoryRepository(options.historyFile);
  const bodyLimitBytes = options.bodyLimitBytes || DEFAULT_BODY_LIMIT_BYTES;
  const service = options.serviceName || process.env.OPTIFLOW_SERVICE_NAME || "optiflow-api";
  const environment = options.environment || process.env.OPTIFLOW_ENVIRONMENT || "local";
  const logger = options.logger || createJsonLogger({
    environment: environment,
    service: service
  });
  const runQueue =
    options.runQueue ||
    createOptimizationRunQueue({
      concurrency: options.optimizationConcurrency,
      defaultMaxAttempts: options.defaultMaxAttempts,
      defaultTimeoutMs: options.defaultTimeoutMs,
      onEvent: function onOptimizationRunEvent(event) {
        logOptimizationRunEvent(logger, event, {
          environment: environment,
          service: service
        });
      },
      repository: repository,
      solve: solveScenario
    });

  return http.createServer(function handleRequest(request, response) {
    handleApiRequest(request, response, {
      bodyLimitBytes: bodyLimitBytes,
      environment: environment,
      runQueue: runQueue,
      repository: repository,
      service: service
    }).catch(function handleUnexpectedError(error) {
      if (error.statusCode && error.code) {
        sendError(response, error.statusCode, error.code, error.message);
        return;
      }

      sendError(response, 500, "internal_error", "Unexpected API error", {
        message: error.message
      });
    });
  });
}
