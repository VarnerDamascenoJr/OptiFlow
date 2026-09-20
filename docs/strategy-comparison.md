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
