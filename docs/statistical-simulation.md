# Simulacao Estatistica

A simulacao estatistica do OptiFlow avalia um plano deterministico fixo sob
variacao de demanda, cancelamento e tempo de viagem. Ela nao reotimiza a cada
amostra: o objetivo e medir a robustez do plano escolhido.

Quando houver historico do `sales-event-project`, a simulacao pode ser calibrada
por priors observacionais de conversao, cancelamento e variabilidade de demanda.
Sem esses priors, o modo sintetico continua disponivel para demos e cenarios sem
historico.

## Variaveis Incertas

| Variavel | Padrao | Interpretação |
| --- | --- | --- |
| `travelTimeVariationRate` | `0.15` | Cada distancia/tempo varia uniformemente em torno do valor base. |
| `demandVariationRate` | `0.10` | Demandas selecionadas variam uniformemente em torno do valor base. |
| `demandVariationProbability` | `0.25` | Probabilidade de uma demanda sofrer variacao. |
| `cancellationProbability` | `0.03` | Probabilidade de uma demanda virar zero naquela amostra. |

O gerador usa semente fixa por padrao para manter resultados reproduziveis.

## Calibracao por Priors do Sales

A fixture `data/sales-event-exports/optiflow-sales-priors.example.json` registra:

- origem do dado no `sales-event-project`;
- periodo observado;
- tamanho da amostra;
- estimativas de conversao, cancelamento e demanda;
- parametros de incerteza aplicados a simulacao.

Ela tambem pode ser derivada do export bruto
`data/sales-event-exports/optiflow-sales-history.example.json`.

## Uso

```bash
npm run scenario:small:simulate
```

Parametros por ambiente:

```bash
OPTIFLOW_SIMULATION_ITERATIONS=500 \
OPTIFLOW_SIMULATION_SEED=42 \
OPTIFLOW_TRAVEL_TIME_VARIATION_RATE=0.2 \
OPTIFLOW_DEMAND_VARIATION_RATE=0.15 \
OPTIFLOW_DEMAND_VARIATION_PROBABILITY=0.4 \
OPTIFLOW_CANCELLATION_PROBABILITY=0.05 \
npm run scenario:small:simulate
```

Para usar priors observados:

```bash
OPTIFLOW_SALES_PRIORS_PATH=data/sales-event-exports/optiflow-sales-priors.example.json \
npm run scenario:small:simulate
```

Parametros explicitos por ambiente continuam tendo precedencia sobre o prior
correspondente, o que permite estudos de sensibilidade sem trocar a fixture.

## Saida

A saida preserva as premissas e resume:

- custo total;
- atraso total;
- demandas nao atendidas;
- probabilidade de atraso;
- probabilidade de demanda nao atendida.

O campo `calibration` indica se a simulacao usou modo `synthetic` ou
`sales-event-priors`, alem de registrar origem, periodo e tamanho da amostra.
Cada serie numerica inclui media, mediana, P90, P95 e pior caso observado.
O bloco `summary.monteCarlo` adiciona rigor para decisao sob incerteza:

- erro padrao da media de custo esperado;
- intervalo de confianca de 95% para o custo esperado;
- estabilidade de P90/P95 em checkpoints de 25%, 50%, 75% e 100% das
  iteracoes;
- avisos quando a amostra e pequena demais para conclusoes fortes.

A lista completa de amostras pode ser incluida com
`OPTIFLOW_SIMULATION_INCLUDE_SAMPLES=true`.

Esta etapa prepara a P3.10, que vai comparar decisoes por custo esperado e risco
usando metricas como VaR e CVaR.

## Comparacao Inferencial de Estrategias

Quando a pergunta envolve duas estrategias, o comando
`npm run scenario:compare:inference` usa amostras pareadas: a base e a candidata
sao avaliadas sob a mesma sequencia de cenarios amostrados. Isso reduz ruido na
estimativa do delta porque cada iteracao compara alternativas sob a mesma
realizacao de demanda, cancelamento e tempo de viagem.

O relatorio considera o delta `candidato - base`. Valores negativos indicam que
a candidata teve custo menor. Alem do delta medio, a saida inclui erro padrao,
intervalo de confianca de 95%, probabilidade da candidata ser melhor, tamanho de
efeito e bootstrap para o delta de CVaR.

## Perda de Decisao

A etapa seguinte explicita a funcao de perda usada para tomar uma decisao:

```bash
npm run scenario:compare:loss
```

Esse comando reaproveita a simulacao pareada e calcula, para cada perfil de
decisor, perda esperada e risco de cauda da perda. A perda nao substitui as
metricas observadas; ela as consome. Custo, atraso e demanda nao atendida
continuam reportados como medidas do que aconteceu. A funcao de perda registra
como um decisor prefere trocar custo medio, atraso, falta de atendimento, risco
de cauda e violacao de SLO.

## Backtesting de Decisao

O comando `npm run scenario:decision:backtest` valida a decisao fora da amostra.
Ele separa vendas historicas antes e depois de um corte temporal: o periodo de
treino calibra priors e sustenta a decisao prevista; o periodo de teste fornece
a realizacao observada usada para medir erro de previsao e arrependimento de
decisao.

Essa etapa responde se a decisao que parecia melhor em `t` teria sido boa depois
que os eventos posteriores ficaram observaveis.
