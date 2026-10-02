# Estudo Quase-Experimental

## Identificacao

- `question_id`: RQ8
- `question`: A intervencao parece melhorar a metrica ou apenas coincidiu com
  outro fator?
- `study_date`: 2026-10-02
- `owner_project`: `OptiFlow`
- `related_projects`: `sales-event-project`,
  `operational-observability-platform`

## Dados

- `dataset`: `data/quasi-experimental/payment-retry-policy.example.json`
- `schema_version`: `optiflow-quasi-experimental-study.v1`
- `unit_of_analysis`: pagamento observado por provider e periodo
- `population_target`: mudancas operacionais futuras em provider, retry, fila
  ou estrategia que possam afetar conversao ou confiabilidade

## Intervencao

- `name`: `payment-retry-policy-v2`
- `type`: nova regra de retry
- `started_at`: 2026-09-15T00:00:00.000Z
- `washout`: 2026-09-15 ficou fora da janela antes/depois
- `metric`: `payment_success_rate`

## Metodo

- `estimand`: efeito medio da intervencao sobre a diferenca de taxa de sucesso
- `model_or_method`: diferencas-em-diferencas simples com grupo tratado
  `primary-provider` e controle `secondary-provider`
- `confidence_level`: 0.95
- `assumptions`:
  - o controle captura mudancas temporais comuns;
  - o mix de trafego nao mudou simultaneamente entre providers;
  - nao houve outra mudanca de checkout confundindo o periodo pos-intervencao.

## Comandos de Reproducao

```bash
npm run study:quasi-experimental
node --test test/quasi-experimental-study.test.js
```

## Resultado

- `treatment_change`: taxa do grupo tratado subiu de `0.9` para `0.96`,
  delta `0.06`.
- `control_change`: taxa do controle subiu de `0.88` para `0.895`, delta
  `0.015`.
- `difference_in_differences_effect`: `0.045`.
- `standard_error`: `0.0181`.
- `confidence_interval_95`: `[0.0095, 0.0805]`.
- `conclusion`: `cautious_positive_association`.

## Interpretacao

O grupo tratado melhorou mais do que o controle apos a intervencao simulada. O
efeito estimado de `0.045` sugere associacao positiva alem de uma melhora
temporal comum capturada pelo controle.

A conclusao e deliberadamente cautelosa. O estudo demonstra maturidade causal:
ha grupo controle, janela de washout e intervalo de incerteza, mas ainda nao ha
prova de tendencias paralelas nem garantia de que confundidores nao observados
foram removidos.

## Ameacas a Validade

- Sazonalidade entre os periodos antes e depois.
- Baixa amostra quando a analise for estratificada por evento, ticket ou
  provider.
- Confundidores nao observados, como campanha comercial ou mudanca de mix de
  clientes.
- Selecao de trafego por provider.
- Mudancas simultaneas no checkout.

## Evidencias

- `evidence/summary.json`
