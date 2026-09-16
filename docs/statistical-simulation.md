# Simulacao Estatistica

A primeira simulacao estatistica do OptiFlow avalia um plano deterministico fixo
sob variacao sintetica de demanda, cancelamento e tempo de viagem. Ela nao
reotimiza a cada amostra: o objetivo e medir a robustez do plano escolhido.

## Variaveis Incertas

| Variavel | Padrao | Interpretação |
| --- | --- | --- |
| `travelTimeVariationRate` | `0.15` | Cada distancia/tempo varia uniformemente em torno do valor base. |
| `demandVariationRate` | `0.10` | Demandas selecionadas variam uniformemente em torno do valor base. |
| `demandVariationProbability` | `0.25` | Probabilidade de uma demanda sofrer variacao. |
| `cancellationProbability` | `0.03` | Probabilidade de uma demanda virar zero naquela amostra. |

O gerador usa semente fixa por padrao para manter resultados reproduziveis.

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

## Saida

A saida preserva as premissas e resume:

- custo total;
- atraso total;
- demandas nao atendidas;
- probabilidade de atraso;
- probabilidade de demanda nao atendida.

Cada serie numerica inclui media, mediana, P90, P95 e pior caso observado.
A lista completa de amostras pode ser incluida com
`OPTIFLOW_SIMULATION_INCLUDE_SAMPLES=true`.

Esta etapa prepara a P3.10, que vai comparar decisoes por custo esperado e risco
usando metricas como VaR e CVaR.
