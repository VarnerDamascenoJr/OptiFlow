# Estudo de Estoque e Risco

## Identificacao

- `question_id`: RQ3, RQ4, RQ7
- `question`: Quanto custa reduzir a probabilidade de esgotamento?
- `study_date`: 2026-10-01
- `owner_project`: `OptiFlow`
- `related_projects`: `sales-event-project`

## Dados

- `dataset`: `data/stockout/stockout-risk-study.example.json`
- `schema_version`: `sales-analytics-export.v1` como contrato de origem e
  `optiflow-stockout-risk-study.v1` como evidencia do estudo
- `unit_of_analysis`: tipo de ticket por evento
- `population_target`: decisoes futuras de alocacao de capacidade quando o
  Sales estima risco de esgotamento por ticket

## Metodo

- `estimand`: reducao na probabilidade ponderada de esgotamento e custo
  incremental por ponto percentual reduzido
- `model_or_method`: risco de estoque vindo do Sales, politica base sem
  intervencao e politica candidata com capacidade protegida para o ticket de
  maior risco; o risco residual e recalculado com cauda Poisson quando a
  politica adiciona capacidade
- `parameters`: penalidade de stockout `40` por unidade esperada, capacidade
  adicional VIP `6`, custo unitario de intervencao `15`
- `assumptions`: a demanda esperada por janela do Sales e representativa do
  horizonte curto; capacidade extra pode ser alocada ao ticket VIP; a penalidade
  por unidade resume perda operacional de demanda nao atendida

## Comandos de Reproducao

```bash
npm run study:stockout-risk
node --test test/stockout-risk-study.test.js
```

## Resultado

- `primary_result`: a politica `vip-risk-buffer` e recomendada.
- `delta_risk`: a probabilidade ponderada de esgotamento cai de `0.2948` para
  `0.0657`.
- `delta_cost`: o custo de intervencao aumenta em `90`.
- `delta_loss`: a perda esperada por stockout cai em `247.4309`.
- `decision_cost_delta`: o custo decisorio esperado cai em `157.4309`.
- `cost_per_probability_point_reduced`: `3.9284`.

## Interpretacao

Neste fixture, o Sales identifica o ticket VIP como risco critico de estoque. O
OptiFlow avalia uma politica que adiciona capacidade protegida ao VIP. A
politica custa mais em capacidade, mas reduz o risco de esgotamento o bastante
para diminuir o custo decisorio esperado.

O estudo responde a pergunta de S4.3 em linguagem operacional: reduzir risco
nao e gratuito; neste caso custa `90` unidades de intervencao para reduzir a
probabilidade ponderada de esgotamento em `0.2291`.

## Limitacoes

- A fixture e pequena e sintetica; ela valida o contrato e o raciocinio, nao uma
  politica populacional.
- A penalidade por stockout e declarada, nao estimada empiricamente.
- A aproximacao Poisson e adequada para uma baseline simples, mas estudos
  maiores devem comparar dispersao, sazonalidade e efeitos de campanha.

## Evidencias

- `evidence/summary.json`
