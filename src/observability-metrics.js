export default function renderOptimizationMetrics(result, status = "succeeded") {
  const labels = labelsText({
    service: result.metadata.service,
    environment: result.metadata.environment,
    strategy: result.strategy,
    status: status
  });

  return [
    "# HELP optimization_runs_total Total optimization runs executed.",
    "# TYPE optimization_runs_total counter",
    `optimization_runs_total{${labels}} 1`,
    "# HELP optimization_plan_cost_total Total cost calculated for the optimization plan.",
    "# TYPE optimization_plan_cost_total gauge",
    `optimization_plan_cost_total{${labels}} ${numberMetric(result.metrics.totalCost)}`,
    "# HELP optimization_plan_distance_total Total distance calculated for the optimization plan.",
    "# TYPE optimization_plan_distance_total gauge",
    `optimization_plan_distance_total{${labels}} ${numberMetric(result.metrics.totalDistance)}`,
    "# HELP optimization_plan_late_minutes_total Total late minutes calculated for the optimization plan.",
    "# TYPE optimization_plan_late_minutes_total gauge",
    `optimization_plan_late_minutes_total{${labels}} ${numberMetric(result.metrics.totalLateMinutes)}`,
    "# HELP optimization_plan_unassigned_orders_total Unassigned orders in the optimization plan.",
    "# TYPE optimization_plan_unassigned_orders_total gauge",
    `optimization_plan_unassigned_orders_total{${labels}} ${numberMetric(result.metrics.unassignedOrders)}`
  ].join("\n") + "\n";
}

export function renderOptimizationRepositoryMetrics(input) {
  const repository = input.repository;
  const service = input.service || "optiflow-api";
  const environment = input.environment || "local";
  const queueStats = input.queueStats || {};
  const runs = repository.listRuns();
  const runCounts = new Map();
  const latestSamples = new Map();

  for (const run of runs) {
    const status = normalizeStatus(run.status);
    const baseLabels = {
      environment: environment,
      service: service,
      status: status,
      strategy: run.strategy || "unknown"
    };

    incrementSample(runCounts, baseLabels, 1);

    if (typeof run.durationMs === "number") {
      setLatestSample(latestSamples, "optiflow_optimization_run_duration_seconds", {
        ...baseLabels,
        scenario_id: run.scenarioId
      }, run.durationMs / 1000);
    }

    if (status === "succeeded") {
      const persisted = repository.getRun(run.id);
      const metrics = persisted ? persisted.metrics : null;

      if (metrics) {
        const planLabels = {
          ...baseLabels,
          scenario_id: run.scenarioId
        };

        setLatestSample(latestSamples, "optiflow_optimization_plan_cost", planLabels, metrics.totalCost);
        setLatestSample(latestSamples, "optiflow_optimization_plan_distance", planLabels, metrics.totalDistance);
        setLatestSample(latestSamples, "optiflow_optimization_plan_late_minutes", planLabels, metrics.totalLateMinutes);
        setLatestSample(latestSamples, "optiflow_optimization_plan_unassigned_orders", planLabels, metrics.unassignedOrders);
      }
    }
  }

  return [
    "# HELP optiflow_optimization_runs_total Optimization runs observed by status and strategy.",
    "# TYPE optiflow_optimization_runs_total counter",
    ...renderSamples("optiflow_optimization_runs_total", runCounts),
    "# HELP optiflow_optimization_run_duration_seconds Last observed optimization run duration in seconds.",
    "# TYPE optiflow_optimization_run_duration_seconds gauge",
    ...renderMetricSamples("optiflow_optimization_run_duration_seconds", latestSamples),
    "# HELP optiflow_optimization_plan_cost Last observed optimization plan total cost.",
    "# TYPE optiflow_optimization_plan_cost gauge",
    ...renderMetricSamples("optiflow_optimization_plan_cost", latestSamples),
    "# HELP optiflow_optimization_plan_distance Last observed optimization plan total distance.",
    "# TYPE optiflow_optimization_plan_distance gauge",
    ...renderMetricSamples("optiflow_optimization_plan_distance", latestSamples),
    "# HELP optiflow_optimization_plan_late_minutes Last observed optimization plan late minutes.",
    "# TYPE optiflow_optimization_plan_late_minutes gauge",
    ...renderMetricSamples("optiflow_optimization_plan_late_minutes", latestSamples),
    "# HELP optiflow_optimization_plan_unassigned_orders Last observed optimization plan unassigned orders.",
    "# TYPE optiflow_optimization_plan_unassigned_orders gauge",
    ...renderMetricSamples("optiflow_optimization_plan_unassigned_orders", latestSamples),
    "# HELP optiflow_optimization_queue_depth Optimization runs waiting in the local queue.",
    "# TYPE optiflow_optimization_queue_depth gauge",
    renderSample("optiflow_optimization_queue_depth", { environment, service }, readNumber(queueStats.queuedCount)),
    "# HELP optiflow_optimization_active_runs Active optimization runs in the local queue.",
    "# TYPE optiflow_optimization_active_runs gauge",
    renderSample("optiflow_optimization_active_runs", { environment, service }, readNumber(queueStats.activeCount)),
    "# HELP optiflow_optimization_queue_concurrency Configured local optimization queue concurrency.",
    "# TYPE optiflow_optimization_queue_concurrency gauge",
    renderSample("optiflow_optimization_queue_concurrency", { environment, service }, readNumber(queueStats.concurrency))
  ].filter(Boolean).join("\n") + "\n";
}

function labelsText(labels) {
  return Object.entries(labels)
    .map(function formatLabel(entry) {
      const [key, value] = entry;
      return `${key}="${escapeLabelValue(String(value))}"`;
    })
    .join(",");
}

function escapeLabelValue(value) {
  return value
    .replaceAll("\\", String.raw`\\`)
    .replaceAll("\n", String.raw`\n`)
    .replaceAll('"', String.raw`\"`);
}

function numberMetric(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return value;
}

function incrementSample(samples, labels, value) {
  const key = JSON.stringify(labels);
  const current = samples.get(key);

  samples.set(key, {
    labels: labels,
    value: current ? current.value + value : value
  });
}

function setLatestSample(samples, metricName, labels, value) {
  samples.set(metricName + JSON.stringify(labels), {
    labels: labels,
    metricName: metricName,
    value: numberMetric(value)
  });
}

function renderSamples(metricName, samples) {
  return Array.from(samples.values()).map(function renderStoredSample(sample) {
    return renderSample(metricName, sample.labels, sample.value);
  });
}

function renderMetricSamples(metricName, samples) {
  return Array.from(samples.values())
    .filter(function filterMetric(sample) {
      return sample.metricName === metricName;
    })
    .map(function renderStoredSample(sample) {
      return renderSample(metricName, sample.labels, sample.value);
    });
}

function renderSample(metricName, labels, value) {
  return `${metricName}{${labelsText(labels)}} ${numberMetric(value)}`;
}

function normalizeStatus(status) {
  return String(status || "unknown").toLowerCase();
}

function readNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
