# Estudo de Funil e Planejamento sob Incerteza

## Identificacao

- `question_id`: RQ1, RQ3, RQ7
- `question`: Incorporar incerteza de conversao e demanda muda a decisao
  operacional do plano?
- `study_date`: 2026-09-29
- `owner_project`: `OptiFlow`
- `related_projects`: `sales-event-project`,
  `operational-observability-platform`

## Versoes dos Repositorios

| Repositorio | Git SHA | Estado local |
| --- | --- | --- |
| `OptiFlow` | `ff35de382e377e19e81d9a9dd0cfbc5ce664c824` | Mudancas locais para S4.1 em `feat/s4-1-funnel-planning-study` |
| `sales-event-project` | `64ca4cde30805cc66a688861bd65e413392841ba` | Limpo em `main...origin/main` |
| `operational-observability-platform` | `94184d4fec03b43acb1f62d205985add0d3c73b4` | Limpo em `main...origin/main` |

## Dados

- `dataset`: `data/sales-event-exports/optiflow-sales-priors.example.json`,
  `data/sales-event-exports/sales-analytics-priors.example.json`,
  `data/scenarios/small-delivery.json` e
  `data/statistics/shared-statistical-fixture.v1.json`
- `schema_version`: `optiflow-sales-priors.v1`,
  `sales-analytics-export.v1` e `portfolio-statistical-fixture.v1`
- `period`: 2026-09-01T00:00:00.000Z ate
  2026-09-22T12:00:00.000Z, conforme fixtures versionadas
- `filters`: none
- `unit_of_analysis`: venda aceita, sinal analitico, medicao de SLO e plano
  simulado
- `population_target`: fluxo operacional futuro que combine conversao de
  vendas, sinais de qualidade e planejamento logistico; este estudo usa
  fixtures pequenas para reproducibilidade

## Metodo

- `estimand`: mudanca na estrategia recomendada ao substituir custo
  deterministico por perda esperada sob incerteza de conversao e demanda
- `model_or_method`: comparacao deterministica de estrategias, simulacao Monte
  Carlo calibrada por priors de vendas, analise de perda por perfil e analise
  de sensibilidade textual
- `parameters`: baseline `nearest-neighbor-capacity`, candidata
  `exact-enumeration`, perfil `balanced`, nivel de confianca `0.95`,
  iteracoes `100`
- `seed`: `20260929`
- `assumptions`: os priors de vendas representam a incerteza de funil e demanda;
  os sinais obrigatorios de analytics estao completos; a medicao RQ5 da
  plataforma e suficiente para o estudo de fixture quando a probabilidade de
  sucesso e maior ou igual a `0.99`

## Comandos de Reproducao

```bash
npm run study:funnel-planning
node --test test/funnel-planning-study.test.js test/sensitivity-analysis.test.js test/decision-loss.test.js test/sales-event-priors.test.js
```

## Resultado

- `primary_result`: a decisao nao mudou; o plano deterministico e o plano sob
  incerteza recomendam `exact-enumeration`.
- `uncertainty`: a estrategia recomendada tem perda esperada `1097.7195`,
  delta de perda esperada `-47.6227` e delta de CVaR de cauda `-59.9304`.
- `supporting_metrics`:
  - `sales_conversion_probability`: 0.75
  - `sales_demand_mean`: 2.3333
  - `sales_demand_coefficient_of_variation`: 0.202
  - `analytics_signal_completeness`: 1
  - `observability_success_probability`: 0.9935
  - `deterministic_total_cost_delta`: -48
  - `sensitivity_classification`: robust

## Interpretacao

Neste fixture, incorporar incerteza de conversao e demanda nao muda a decisao
operacional: `exact-enumeration` continua sendo recomendado. O valor do estudo
esta em tornar a decisao auditavel sob risco: alem do ganho deterministico de
6.06%, o relatorio mostra perda esperada, cauda de perda e sensibilidade das
premissas.

A recomendacao e operacionalmente estavel para este recorte porque a analise de
sensibilidade nao encontrou mudancas de recomendacao no perfil `balanced`.

## Limitacoes

- As fixtures sao pequenas e sinteticas; o estudo e reprodutivel, nao
  populacional.
- A exportacao analitica confirma completude dos sinais obrigatorios, mas nao
  prova qualidade de instrumentacao fora da fixture.
- O sinal de confiabilidade RQ5 vem da fixture compartilhada, nao de uma coleta
  operacional continua.
- A conclusao vale para o cenario `small-delivery-v1` e para os parametros
  declarados acima.

## Evidencias

- `evidence/summary.json`
