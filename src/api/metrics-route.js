import { renderOptimizationRepositoryMetrics } from "../observability-metrics.js";
import { sendText } from "./http.js";

export function handleMetricsRoute(requestContext) {
  const dependencies = requestContext.dependencies;

  sendText(requestContext.response, 200, renderOptimizationRepositoryMetrics({
    environment: dependencies.environment,
    queueStats: dependencies.runQueue.getStats(),
    repository: dependencies.repository,
    service: dependencies.service
  }), "text/plain; version=0.0.4; charset=utf-8");
}
