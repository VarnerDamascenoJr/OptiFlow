# API de Cenarios e Execucoes

A primeira API HTTP do OptiFlow usa apenas `node:http` para manter a fatia P3.7
leve enquanto a arquitetura NestJS ainda nao foi introduzida. Ela expoe o fluxo
principal de cenario e execucao sobre o historico local da P3.6.

## Executar

```bash
npm run api
```

Variaveis:

| Variavel | Padrao | Uso |
| --- | --- | --- |
| `OPTIFLOW_API_HOST` | `127.0.0.1` | Interface onde o servidor escuta. |
| `OPTIFLOW_API_PORT` | `3000` | Porta HTTP. |
| `OPTIFLOW_HISTORY_FILE` | `.optiflow/optimization-history.json` | Arquivo local de historico. |
| `OPTIFLOW_RUN_CONCURRENCY` | `1` | Numero de execucoes processadas em paralelo. |
| `OPTIFLOW_RUN_MAX_ATTEMPTS` | `1` | Tentativas padrao por execucao. |
| `OPTIFLOW_RUN_TIMEOUT_MS` | `1000` | Timeout padrao por execucao. |

## Rotas

| Metodo | Rota | Descricao |
| --- | --- | --- |
| `GET` | `/health` | Healthcheck simples. |
| `POST` | `/scenarios/validate` | Valida um cenario sem persistir. |
| `POST` | `/scenarios` | Valida e persiste um snapshot de cenario. |
| `GET` | `/scenarios/:scenarioRecordId` | Consulta o snapshot persistido. |
| `POST` | `/optimization-runs` | Enfileira uma estrategia e persiste status, plano e metricas. |
| `GET` | `/optimization-runs/:optimizationRunId` | Consulta status e resultado persistidos. |

## Exemplos

Validar:

```bash
curl -s http://127.0.0.1:3000/scenarios/validate \
  -H 'content-type: application/json' \
  -d @data/scenarios/small-delivery.json
```

Criar cenario:

```bash
curl -s http://127.0.0.1:3000/scenarios \
  -H 'content-type: application/json' \
  -d @data/scenarios/small-delivery.json
```

Enfileirar usando um cenario persistido:

```bash
curl -s http://127.0.0.1:3000/optimization-runs \
  -H 'content-type: application/json' \
  -d '{
    "scenarioRecordId": "scenario_HASH",
    "strategy": "exact-enumeration",
    "maxAttempts": 2,
    "timeoutMs": 1000,
    "metadata": {
      "optimizationRunId": "run-demo-api"
    }
  }'
```

Consultar execucao:

```bash
curl -s http://127.0.0.1:3000/optimization-runs/run-demo-api
```

Estados:

| Estado | Significado |
| --- | --- |
| `QUEUED` | A execucao foi aceita e aguarda o worker local. |
| `RUNNING` | A estrategia esta executando fora do request HTTP inicial. |
| `SUCCEEDED` | Plano e metricas foram persistidos. |
| `FAILED` | Todas as tentativas falharam ou a execucao excedeu o timeout. |

## Erros

Erros seguem o mesmo envelope:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "orders[0] demand exceeds every vehicle capacity",
    "details": null
  }
}
```

Esta API usa uma fila local em memoria. Ela e suficiente para a demonstracao
local e prepara a troca futura por uma fila persistente quando houver worker
dedicado.
