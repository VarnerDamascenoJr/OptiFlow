# Comparacao de Estrategias

O OptiFlow compara estrategias executando o mesmo cenario com duas abordagens e
calculando os deltas de custo, distancia, atraso, demandas atendidas e
utilizacao media.

## Uso

Comparar todos os cenarios versionados:

```bash
npm run benchmark:compare
```

Comparar um cenario especifico:

```bash
node scripts/compare-strategies.js data/scenarios/small-delivery.json
```

Gerar JSON:

```bash
OPTIFLOW_OUTPUT_FORMAT=json npm run benchmark:compare
```

Comparar duas estrategias com inferencia pareada:

```bash
npm run scenario:compare:inference
```

Essa analise executa a base e a candidata com a mesma semente e a mesma
sequencia de amostras Monte Carlo. O delta principal e sempre
`candidato - base`, entao valores negativos favorecem a estrategia candidata.

Parametros uteis:

```bash
OPTIFLOW_SIMULATION_ITERATIONS=500 \
OPTIFLOW_SIMULATION_SEED=42 \
OPTIFLOW_BOOTSTRAP_ITERATIONS=1000 \
OPTIFLOW_BASELINE_STRATEGY=nearest-neighbor-capacity \
OPTIFLOW_CANDIDATE_STRATEGY=exact-enumeration \
npm run scenario:compare:inference
```

Tambem e possivel usar priors observados do Sales:

```bash
OPTIFLOW_SALES_PRIORS_PATH=data/sales-event-exports/optiflow-sales-priors.example.json \
npm run scenario:compare:inference
```

## Estrategias Padrao

- Base: `nearest-neighbor-capacity`
- Candidata: `exact-enumeration`

Para comparar as duas heuristicas no mesmo cenario de prazo:

```bash
npm run benchmark:compare:cost-aware
OPTIFLOW_OUTPUT_FORMAT=json npm run benchmark:compare:cost-aware
```

O primeiro comando mostra as metricas lado a lado. O segundo inclui as rotas
completas de cada estrategia. No cenario `benchmark-cost-aware-deadline-v1`,
ambas percorrem 6 unidades de distancia e atendem 2 pedidos. A heuristica por
distancia acumula 4 minutos de atraso e custo 46; a variante por custo evita o
atraso e termina com custo 6. Esse exemplo ilustra a diferenca de criterio,
sem afirmar que a variante vence em todos os cenarios.

As estrategias podem ser alteradas por variaveis de ambiente:

```bash
OPTIFLOW_BASELINE_STRATEGY=nearest-neighbor-capacity \
OPTIFLOW_CANDIDATE_STRATEGY=exact-enumeration \
npm run benchmark:compare
```

## Exemplo de Leitura

Para o `small-delivery-v1`, a comparacao mostra que `exact-enumeration` reduz o
custo total de 792 para 744. Isso e uma melhora de 48 unidades, ou 6.06%, com
12 unidades a menos de distancia e sem alterar demandas atendidas ou atraso.

Essa saida e intencionalmente explicativa: ela registra o trade-off observado em
vez de apenas declarar uma estrategia vencedora.

## Inferencia Pareada

O relatorio `scenario:compare:inference` responde se a diferenca entre
estrategias e maior que o ruido da simulacao. Ele reporta:

- numero de amostras pareadas;
- media do delta de custo total;
- erro padrao e intervalo de confianca de 95% para o delta;
- probabilidade da candidata ter custo menor;
- tamanho de efeito padronizado quando ha variacao observada;
- delta relativo ao custo medio da base;
- delta de CVaR e intervalo bootstrap para o delta de CVaR.

A conclusao segue a incerteza do delta medio:

- `candidate_better`: o intervalo de 95% inteiro fica abaixo de zero;
- `baseline_better`: o intervalo de 95% inteiro fica acima de zero;
- `inconclusive`: o intervalo cruza zero.

Esse criterio evita transformar uma diferenca pontual pequena em recomendacao
forte quando a simulacao ainda nao sustenta essa leitura.
