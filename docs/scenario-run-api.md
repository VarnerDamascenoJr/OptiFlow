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

## Rotas

| Metodo | Rota | Descricao |
| --- | --- | --- |
| `GET` | `/health` | Healthcheck simples. |
| `POST` | `/scenarios/validate` | Valida um cenario sem persistir. |
| `POST` | `/scenarios` | Valida e persiste um snapshot de cenario. |
| `GET` | `/scenarios/:scenarioRecordId` | Consulta o snapshot persistido. |
| `POST` | `/optimization-runs` | Executa uma estrategia e persiste status, plano e metricas. |
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

Executar usando um cenario persistido:

```bash
curl -s http://127.0.0.1:3000/optimization-runs \
  -H 'content-type: application/json' \
  -d '{
    "scenarioRecordId": "scenario_HASH",
    "strategy": "exact-enumeration",
    "metadata": {
      "optimizationRunId": "run-demo-api"
    }
  }'
```

Consultar execucao:

```bash
curl -s http://127.0.0.1:3000/optimization-runs/run-demo-api
```

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

Esta API executa a otimizacao no request atual. Execucao assincrona com estados
`QUEUED` e `RUNNING` fica para a P3.8.
