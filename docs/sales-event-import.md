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

Para calibrar a simulacao com priors estimados pelo export analitico do Sales:

```bash
OPTIFLOW_SALES_PRIORS_PATH=data/sales-event-exports/sales-analytics-priors.example.json \
  npm run scenario:small:simulate
```

Atalho equivalente:

```bash
npm run scenario:small:simulate:sales-priors
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

## Priors Estatisticos

O `OptiFlow` aceita priors em tres formatos:

- `optiflow-sales-priors.v1`: documento de priors direto;
- `sales-event-optiflow-export.v1`: historico operacional antigo, do qual os
  priors sao derivados localmente;
- `sales-analytics-export.v1`: export analitico novo, desde que contenha
  `simulationPriors`.

Quando `simulationPriors` existe, a simulacao usa os parametros estimados no
Sales para preencher `cancellationProbability`, `demandVariationProbability` e
`demandVariationRate`. Campos adicionais como `conversionStages`,
`operationalTiming` e `stockoutRisks` ficam preservados para relatorios e
analises posteriores.

## Falhas Esperadas

O importador falha antes de gerar o cenario quando campos obrigatorios estao
ausentes ou incompletos. Exemplos:

- `salesEventExport.schemaVersion must be sales-event-optiflow-export.v1`
- `salesEventExport.sales must contain at least one completed sale`
- `salesEventExport.sales[0].items must contain at least one item`
