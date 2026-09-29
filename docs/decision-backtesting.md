# Backtesting de Decisao

O backtest de decisao valida uma escolha feita com informacao disponivel ate um
corte temporal contra eventos observados depois desse corte.

## Uso

```bash
npm run scenario:decision:backtest
```

Para gerar JSON:

```bash
OPTIFLOW_OUTPUT_FORMAT=json npm run scenario:decision:backtest
```

## Formato

A fixture `data/backtests/sales-decision-backtest.example.json` separa:

- `trainingSalesExport`: vendas observadas antes de `cutoffAt`;
- `testSalesExport`: vendas observadas depois de `cutoffAt`;
- `planningScenario`: cenario disponivel no momento da decisao;
- `realizedScenario`: cenario usado para avaliar o que aconteceu depois.

O treino gera priors com `deriveSalesEventPriors`. Esses priors alimentam a
comparacao por perda de decisao no `planningScenario`. Depois, as mesmas
estrategias sao avaliadas no `realizedScenario`.

## Metricas

O relatorio mostra:

- erro de previsao de demanda media;
- erro de previsao da probabilidade de cancelamento;
- decisao prevista por perfil;
- perda realizada da decisao escolhida;
- melhor estrategia observada depois do corte;
- arrependimento de decisao, calculado como perda escolhida menos perda da
  melhor alternativa observada.

Na fixture S3.5, o perfil agressivo continua alinhado com a decisao prevista. O
perfil conservador mostra arrependimento positivo: a estrategia candidata
economizou distancia, mas aceitou atraso suficiente para que a base fosse melhor
quando avaliada pela funcao de perda conservadora.
