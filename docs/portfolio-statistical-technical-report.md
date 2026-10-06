# Relatorio Tecnico de Estatistica Aplicada do Portfolio

## Resumo Executivo

Este relatorio consolida a trilha estatistica dos tres projetos do portfolio:
`sales-event-project`, `operational-observability-platform` e `OptiFlow`.

O objetivo nao e apresentar apenas automacao de software. O objetivo e mostrar
como eventos operacionais viram dados analiticos, como esses dados carregam
incerteza, como previsoes sao avaliadas e como decisoes sao escolhidas por
funcao de perda.

A narrativa tecnica segue quatro camadas:

1. **Inferencia**: estimar funil, tempo ate evento, SLOs, efeitos e intervalos.
2. **Previsao**: projetar demanda, risco de stockout, risco de violacao de SLO
   e erro Monte Carlo.
3. **Decisao**: comparar politicas por perda esperada, CVaR, custo de
   intervencao e robustez.
4. **Rigor operacional**: manter datasets, scripts, estudos e CI
   reproduziveis.

## Problema

Os sistemas do portfolio respondem a perguntas operacionais que nao devem ser
tratadas como booleanos simples:

- Uma venda aceita tem qual chance de virar check-in?
- A latencia ou disponibilidade observada indicam degradacao real ou ruido?
- Qual risco de violar um SLO antes de a janela fechar?
- Qual politica reduz perda esperada sem esconder risco de cauda?
- Uma mudanca operacional melhorou a metrica ou coincidiu com outro fator?

A contribuicao estatistica esta em explicitar **estimando, unidade de analise,
incerteza, pressupostos e criterio decisorio** para cada pergunta.

## Dados

| Dominio | Fonte versionada | Unidade de analise | Uso no relatorio |
| --- | --- | --- | --- |
| Funil e demanda | [`data/sales-event-exports/sales-analytics-priors.example.json`](../data/sales-event-exports/sales-analytics-priors.example.json) | venda, janela e tipo de ticket | priors de conversao, demanda e variacao |
| Priors importados | [`data/sales-event-exports/optiflow-sales-priors.example.json`](../data/sales-event-exports/optiflow-sales-priors.example.json) | sinal analitico exportado | calibracao de simulacao no `OptiFlow` |
| SLO e confiabilidade | [`data/reliability/reliability-decision-study.example.json`](../data/reliability/reliability-decision-study.example.json) | objetivo de SLO por janela | burn rate e mudanca de preferencia decisoria |
| Estoque e risco | [`data/stockout/stockout-risk-study.example.json`](../data/stockout/stockout-risk-study.example.json) | tipo de ticket por evento | probabilidade de stockout e custo de intervencao |
| Quase-experimento | [`data/quasi-experimental/payment-retry-policy.example.json`](../data/quasi-experimental/payment-retry-policy.example.json) | grupo antes/depois | estimativa de efeito de retry |
| Golden datasets | [`data/statistics/golden-datasets.v1.json`](../data/statistics/golden-datasets.v1.json) | fixture estatistica pequena | validacao de formulas centrais |
| Cenario de decisao | [`data/scenarios/small-delivery.json`](../data/scenarios/small-delivery.json) | plano simulado | comparacao de estrategias e perda |

Todos os dados acima sao fixtures pequenas, versionadas e reprodutiveis. Eles
servem para demonstrar contratos e raciocinio estatistico; nao pretendem
representar uma populacao real completa.

## Metodos

### Inferencia

**Proporcao binomial e intervalo de Wilson**

Usado para funil e SLOs quando a unidade observada tem resultado binario.

```text
p_hat = x / n
denominator = 1 + z^2 / n
center = (p_hat + z^2 / (2n)) / denominator
margin = z * sqrt((p_hat(1 - p_hat) + z^2 / (4n)) / n) / denominator
CI = [center - margin, center + margin]
```

Evidencia: golden dataset de funil com `x = 8`, `n = 10` e IC 95%
`[0.4902, 0.9433]`.

**Kaplan-Meier discreto**

Usado para tempo ate evento com censura.

```text
S(t) = product over event times <= t of (1 - d_i / n_i)
```

Onde `d_i` e a quantidade de eventos observados no tempo `i` e `n_i` e a
quantidade ainda em risco antes desse tempo.

Evidencia: golden dataset de sobrevivencia com `S(1) = 0.75`, `S(3) = 0.375`
e mediana `3`.

**Diferencas-em-diferencas**

Usado para separar melhora associada a intervencao de uma tendencia temporal
comum.

```text
effect = (treatment_after - treatment_before)
       - (control_after - control_before)
```

No estudo de retry de pagamento, o efeito estimado foi `0.045`, erro padrao
`0.0181` e IC 95% `[0.0095, 0.0805]`.

### Previsao

**Demanda e stockout**

O Sales exporta demanda esperada e risco por tipo de ticket. O `OptiFlow`
consome esse risco em politicas de capacidade. Para capacidade candidata, o
risco residual usa uma cauda Poisson simples:

```text
P(stockout) = P(D > capacity)
```

onde `D` e a demanda futura esperada no horizonte.

**Risco operacional de SLO**

A plataforma de observabilidade adiciona uma previsao baseline para a proxima
janela, usando frequencia suavizada de violacoes recentes:

```text
P(next_violation) = (violations + 1) / (windows + 2)
```

O backtest walk-forward compara previsao historica com resultado observado e
reporta Brier score, calibracao, falso positivo e falso negativo:

```text
Brier = mean((p_i - y_i)^2)
calibration_error = abs(mean(p_i) - mean(y_i))
```

Evidencia implementada no `operational-observability-platform`, PR #31.

**Monte Carlo e erro de simulacao**

O `OptiFlow` executa simulacoes por seed para estimar distribuicao de custo,
atraso, violacao e risco de cauda:

```text
mean_cost = mean(cost_i)
standard_error = sample_sd(cost_i) / sqrt(n)
CVaR_alpha = mean(loss_i | loss_i in upper alpha tail)
```

### Decisao

**Funcao de perda**

A decisao e avaliada por uma perda explicita que pondera custo, atraso,
violacao de SLO, stockout e risco de cauda:

```text
expected_loss(strategy) = mean(loss(strategy, scenario_i))
delta_loss = candidate_loss - baseline_loss
```

Uma politica e recomendada quando reduz a perda esperada sob os pesos e
pressupostos declarados. Quando ha risco de cauda, o relatorio tambem compara
CVaR.

**Sensibilidade e robustez**

As conclusoes sao classificadas como robustas quando variacoes controladas dos
priors nao mudam a recomendacao. No estudo S4.1, a recomendacao permaneceu
`exact-enumeration` e a classificacao foi `robust`.

## Resultados

| Estudo | Tipo | Resultado principal | Evidencia |
| --- | --- | --- | --- |
| Funil e planejamento | Inferencia + decisao | `exact-enumeration` continuou recomendado; perda esperada `1097.7195`; delta de perda `-47.6227`; robustez `robust` | [`studies/statistics/2026-09-29-funnel-planning/evidence/summary.json`](../studies/statistics/2026-09-29-funnel-planning/evidence/summary.json) |
| Confiabilidade e decisao | SLO + decisao | burn rate `page` muda decisao para `exact-enumeration`; delta de perda ajustado por confiabilidade `-804.1944` | [`data/reliability/reliability-decision-study.example.json`](../data/reliability/reliability-decision-study.example.json), [`docs/reliability-decision-study.md`](reliability-decision-study.md) |
| Estoque e risco | Previsao + decisao | politica `vip-risk-buffer` reduz probabilidade ponderada de stockout de `0.2948` para `0.0657`; custo decisorio cai `157.4309` | [`studies/statistics/2026-10-01-stockout-risk/evidence/summary.json`](../studies/statistics/2026-10-01-stockout-risk/evidence/summary.json) |
| Quase-experimental | Inferencia causal cautelosa | efeito DiD `0.045`, IC 95% `[0.0095, 0.0805]`, conclusao `cautious_positive_association` | [`studies/statistics/2026-10-02-quasi-experimental/evidence/summary.json`](../studies/statistics/2026-10-02-quasi-experimental/evidence/summary.json) |
| Golden datasets | Validacao estatistica | formulas de funil, sobrevivencia, burn rate e simulacao passam em fixtures com resultados conhecidos | [`data/statistics/golden-datasets.v1.json`](../data/statistics/golden-datasets.v1.json) |

## Interpretacao Operacional

### Inferencia

Inferencia responde "o que aprendemos com os dados observados?". No portfolio,
ela aparece em funil, sobrevivencia, SLOs e quase-experimentos. O ponto central
e nao confundir estimativa pontual com certeza: cada resultado carrega intervalo,
amostra, censura ou ameaca a validade.

### Previsao

Previsao responde "o que esperamos na proxima janela?". Demanda, stockout,
risco operacional e Monte Carlo nao sao verdades futuras; sao distribuicoes ou
probabilidades que precisam de backtest e calibracao.

### Decisao

Decisao responde "o que devemos fazer dado risco, custo e preferencia?". O
`OptiFlow` separa metrica observada de preferencia decisoria: um burn rate nao
muda o que aconteceu, mas muda a penalidade de aceitar atraso quando o error
budget ja esta sob pressao.

## Limitacoes

- As fixtures sao pequenas e sinteticas. Elas validam contratos, formulas e
  raciocinio, mas nao sustentam inferencia populacional ampla.
- Alguns priors sao declarados ou exportados de exemplos controlados; em
  producao, eles exigiriam coleta historica continua e monitoramento de drift.
- A conclusao causal do estudo quase-experimental depende de tendencias
  paralelas, ausencia de confundidores nao observados e estabilidade de mix.
- O custo decisorio depende de pesos de perda escolhidos; mudancas nesses pesos
  podem alterar a recomendacao.
- O backtest atual demonstra mecanismo e metricas; bases maiores devem avaliar
  calibracao por faixas de probabilidade e por segmento.

## Proximos Passos

- Ampliar os estudos para dados maiores e janelas reais quando houver historico
  operacional suficiente.
- Versionar evidencias de S2.5/S2.6 no backlog central sempre que PRs de outros
  repositorios concluirem itens estatisticos.
- Adicionar relatorios comparaveis por periodo para acompanhar drift de funil,
  demanda, SLO e perda.
- Transformar este relatorio em roteiro gravavel na S5.3, priorizando uma demo
  curta de inferencia, previsao e decisao.

## Reproducao

Comandos principais:

```bash
npm run statistics:golden-datasets
npm run study:funnel-planning
npm run study:reliability-decision
npm run study:stockout-risk
npm run study:quasi-experimental
npm run scenario:decision:backtest
npm run scenario:decision:sensitivity
npm test
```

Scripts:

- [`scripts/validate-golden-datasets.js`](../scripts/validate-golden-datasets.js)
- [`scripts/run-funnel-planning-study.js`](../scripts/run-funnel-planning-study.js)
- [`scripts/run-reliability-decision-study.js`](../scripts/run-reliability-decision-study.js)
- [`scripts/run-stockout-risk-study.js`](../scripts/run-stockout-risk-study.js)
- [`scripts/run-quasi-experimental-study.js`](../scripts/run-quasi-experimental-study.js)
- [`scripts/run-decision-backtest.js`](../scripts/run-decision-backtest.js)
- [`scripts/run-sensitivity-analysis.js`](../scripts/run-sensitivity-analysis.js)

CI:

- `OptiFlow`: [CI workflow](https://github.com/VarnerDamascenoJr/OptiFlow/actions/workflows/ci.yml)
- `sales-event-project`: [CI workflow](https://github.com/VarnerDamascenoJr/sales-event-project/actions/workflows/ci.yml)
- `operational-observability-platform`: [CI workflow](https://github.com/VarnerDamascenoJr/operational-observability-platform/actions/workflows/ci.yml)

PRs recentes que sustentam a leitura do backlog:

- `operational-observability-platform`
  [PR #28](https://github.com/VarnerDamascenoJr/operational-observability-platform/pull/28):
  confidence scoring de hipoteses de incidente, cobrindo S2.5.
- `operational-observability-platform`
  [PR #31](https://github.com/VarnerDamascenoJr/operational-observability-platform/pull/31):
  previsao de risco operacional, cobrindo S2.6.
- `OptiFlow`
  [PR #56](https://github.com/VarnerDamascenoJr/OptiFlow/pull/56):
  golden datasets estatisticos, cobrindo S5.1.

## Checklist de Revisao Manual

- [x] Problema, dados, metodo, resultados, limitacoes e proximos passos
  presentes.
- [x] Formulas essenciais incluidas.
- [x] Interpretacao operacional separa inferencia, previsao e decisao.
- [x] Links para datasets, scripts, evidencias e CI incluidos.
