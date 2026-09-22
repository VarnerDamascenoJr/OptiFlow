# Estudo de Fundacao com Fixture Estatistica Compartilhada

## Identificacao

- `question_id`: RQ1, RQ5, RQ7
- `question`: A fixture compartilhada consegue representar funil, SLO e decisao
  por risco usando a mesma linguagem estatistica?
- `study_date`: 2026-09-22
- `owner_project`: `OptiFlow`
- `related_projects`: `sales-event-project`,
  `operational-observability-platform`

## Versoes dos Repositorios

| Repositorio | Git SHA | Estado local |
| --- | --- | --- |
| `OptiFlow` | `d2f00c4e50182abd0de6c57f7dc40a44c2fdcd48` | Mudancas locais documentais nao commitadas para S0.1, S0.2 e S0.3 |
| `sales-event-project` | `e0335380a034252f6ee81bd037cd1663405284eb` | Limpo em `main...origin/main` |
| `operational-observability-platform` | `bd712ce2118c7d805c61b25b759468d5616dc468` | Limpo em `main...origin/main` |

## Dados

- `dataset`: `data/statistics/shared-statistical-fixture.v1.json`
- `schema_version`: `portfolio-statistical-fixture.v1`
- `period`: 2026-09-01T00:00:00.000Z ate 2026-09-02T00:00:00.000Z
- `filters`: none
- `unit_of_analysis`: varia por registro; `accepted_sale`, `http_request` e
  `simulation_run`
- `population_target`: contratos analiticos futuros dos tres projetos, nao uma
  populacao operacional real

## Metodo

- `estimand`: presenca e consistencia dos campos minimos para RQ1, RQ5 e RQ7
- `model_or_method`: validacao deterministica da fixture e sumarizacao dos
  registros
- `parameters`: nenhum parametro estatistico estimado
- `seed`: `not_applicable`
- `assumptions`: a fixture e sintetica e foi criada para validar o formato, nao
  para inferir comportamento real

## Comandos de Reproducao

```bash
node -e "const fs=require('fs'); const d=JSON.parse(fs.readFileSync('data/statistics/shared-statistical-fixture.v1.json','utf8')); const records=d.records; console.log(JSON.stringify({schema_version:d.schema_version, record_count:records.length, question_ids:[...new Set(records.map(r=>r.question_id))], projects:[...new Set(records.map(r=>r.project))], sales_conversion_probability:records.find(r=>r.question_id==='RQ1').measurements.conversion_probability, observability_success_probability:records.find(r=>r.question_id==='RQ5').measurements.success_probability, optiflow_candidate_cvar_delta_cents:records.find(r=>r.question_id==='RQ7').measurements.candidate_cvar_delta_cents}, null, 2));"
```

## Resultado

- `primary_result`: a fixture contem 3 registros, cobrindo RQ1, RQ5 e RQ7.
- `uncertainty`: `not_applicable`; este estudo valida formato, nao estima uma
  quantidade populacional.
- `supporting_metrics`:
  - `sales_conversion_probability`: 0.8
  - `observability_success_probability`: 0.9935
  - `optiflow_candidate_cvar_delta_cents`: -30000

## Interpretacao

A fixture compartilhada e suficiente como primeiro contrato reprodutivel entre
os tres projetos. Ela demonstra que funil de vendas, confiabilidade operacional
e decisao sob risco podem ser descritos com os mesmos blocos: pergunta,
unidade de analise, janela, dimensoes, medidas, incerteza e limitacoes.

Esta conclusao nao diz que os valores sinteticos sao representativos. Ela diz
que o formato minimo esta pronto para orientar as proximas implementacoes S1,
S2 e S3.

## Limitacoes

- A fixture e sintetica.
- Nao ha inferencia estatistica real neste estudo.
- O `OptiFlow` estava com mudancas locais nao commitadas durante a criacao do
  estudo.
- Os projetos `sales-event-project` e `operational-observability-platform`
  ainda nao produzem esta fixture automaticamente.

## Evidencias

- `evidence/summary.json`
