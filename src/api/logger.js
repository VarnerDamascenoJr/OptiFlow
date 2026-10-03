export function createJsonLogger(defaultFields) {
  return {
    info: function info(payload) {
      console.log(JSON.stringify({
        ...defaultFields,
        ...payload
      }));
    }
  };
}

export function logOptimizationRunEvent(logger, event, defaults) {
  const persisted = event.persisted;
  const run = persisted.optimizationRun;
  const metadata = run.metadata || {};
  const metrics = persisted.metrics || {};
  const payload = {
    event: event.eventName,
    service: defaults.service,
    environment: defaults.environment,
    optimization_run_id: run.id,
    request_id: metadata.requestId || "",
    correlation_id: metadata.correlationId || "",
    transaction_id: metadata.transactionId || "",
    scenario_id: run.scenarioId,
    strategy: run.strategy,
    status: run.status,
    attempt_count: run.attemptCount,
    max_attempts: run.maxAttempts,
    duration_ms: run.durationMs,
    total_cost: metrics.totalCost,
    total_distance: metrics.totalDistance,
    total_late_minutes: metrics.totalLateMinutes,
    unassigned_orders: metrics.unassignedOrders,
    error: run.error ? run.error.message : null
  };

  if (logger && typeof logger.info === "function") {
    logger.info(payload);
  }
}
