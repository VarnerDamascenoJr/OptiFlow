# Observabilidade de Execucao

O `OptiFlow` expoe metricas Prometheus para execucoes criadas pela API local e
emite logs JSON com os identificadores de correlacao da execucao.

## Executar

```bash
nvm use
OPTIFLOW_SERVICE_NAME=optiflow-api \
OPTIFLOW_ENVIRONMENT=local \
npm run api
```

Depois de criar uma execucao com `POST /optimization-runs`, consulte:

```bash
curl http://127.0.0.1:3000/metrics
```

## Metricas

As series usam labels de baixa cardinalidade:

- `service`
- `environment`
- `strategy`
- `status`
- `scenario_id`

Metricas principais:

- `optiflow_optimization_runs_total`
- `optiflow_optimization_run_duration_seconds`
- `optiflow_optimization_plan_cost`
- `optiflow_optimization_plan_distance`
- `optiflow_optimization_plan_late_minutes`
- `optiflow_optimization_plan_unassigned_orders`
- `optiflow_optimization_queue_depth`
- `optiflow_optimization_active_runs`
- `optiflow_optimization_queue_concurrency`

`optimization_run_id` e `correlation_id` ficam nos logs, nao em labels
Prometheus, para evitar series de alta cardinalidade.

## Logs

Cada execucao emite eventos JSON:

- `optimization_run_queued`
- `optimization_run_started`
- `optimization_run_retry_queued`
- `optimization_run_succeeded`
- `optimization_run_failed`

Campos de rastreabilidade:

- `optimization_run_id`
- `request_id`
- `correlation_id`
- `transaction_id`
- `scenario_id`
- `strategy`
- `status`

Eventos concluídos tambem incluem `duration_ms`, `total_cost`,
`total_distance`, `total_late_minutes` e `unassigned_orders`.
