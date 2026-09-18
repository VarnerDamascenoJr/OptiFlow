# Importacao do Sales Event Project

O `OptiFlow` consegue importar um export JSON do `sales-event-project` e gerar
um `Scenario` validado. Essa integracao fecha a ponte de portfolio:

```text
sales-event-project -> historico operacional -> OptiFlow Scenario -> plano
```

## Fluxo

No `sales-event-project`:

```bash
go run ./cmd/optiflow-export \
  -sales-event-id 11111111-1111-1111-1111-111111111111 \
  -output /tmp/optiflow-sales-history.json
```

No `OptiFlow`:

```bash
nvm use
node scripts/import-sales-event-scenario.js \
  /tmp/optiflow-sales-history.json \
  data/scenarios/sales-event-fulfillment.json
npm run scenario:sales-event
```

Para reproduzir sem banco local, use a fixture versionada:

```bash
npm run sales-event:import
npm run scenario:sales-event
```

## Mapeamento

| Export do sales | Scenario do OptiFlow |
| --- | --- |
| venda concluida | `orders[]` |
| cliente da venda | `locations[]` |
| quantidade dos itens | `order.demand` |
| `saleId` | `order.source.saleId` e parte do `order.id` |
| `correlationId` e `transactionId` | `order.source` |
| vendas falhas ou pendentes | mantidas no export, ignoradas pelo importador padrao |

Como o sales ainda nao persiste endereco, o importador gera coordenadas
sinteticas deterministicas com base no `saleId` e monta a `distanceMatrix`.
Assim, o mesmo export sempre gera o mesmo cenario.

## Falhas Esperadas

O importador falha antes de gerar o cenario quando campos obrigatorios estao
ausentes ou incompletos. Exemplos:

- `salesEventExport.schemaVersion must be sales-event-optiflow-export.v1`
- `salesEventExport.sales must contain at least one completed sale`
- `salesEventExport.sales[0].items must contain at least one item`
