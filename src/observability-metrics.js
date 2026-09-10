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
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll('"', '\\"');
}

function numberMetric(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return value;
}
