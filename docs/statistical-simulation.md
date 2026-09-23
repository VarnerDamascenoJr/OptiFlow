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
