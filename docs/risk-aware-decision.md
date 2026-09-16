# Decisao Orientada a Risco

A primeira analise de risco do OptiFlow usa custo total como metrica principal
de cauda. O objetivo e mostrar quando a menor media pode divergir da escolha
mais robusta.

## Metricas

| Metrica | Uso |
| --- | --- |
| Custo esperado | Media do custo total nas simulacoes. |
| VaR | Custo no quantil configurado, por padrao 95%. |
| CVaR | Media dos custos iguais ou piores que o VaR. |
| Probabilidade de atraso | Fracao das simulacoes com atraso total maior que zero. |
| Probabilidade de demanda nao atendida | Fracao das simulacoes com demandas nao atendidas. |

## Uso

```bash
npm run scenario:small:risk
```

Parametros:

```bash
OPTIFLOW_RISK_CONFIDENCE_LEVEL=0.95 \
OPTIFLOW_SIMULATION_ITERATIONS=500 \
OPTIFLOW_SIMULATION_SEED=42 \
npm run scenario:small:risk
```

## Interpretacao

Quando a recomendacao por custo esperado e por CVaR apontam para a mesma
estrategia, a decisao e alinhada. Quando divergem, o resultado sinaliza um
trade-off: uma estrategia pode ser mais barata na media, enquanto outra reduz o
custo medio dos piores casos plausiveis.

Esta etapa ainda nao substitui uma otimizacao robusta. Ela torna explicito o
risco observado em simulacoes e prepara a evolucao para objetivos que combinem
eficiencia esperada e protecao contra cauda.
