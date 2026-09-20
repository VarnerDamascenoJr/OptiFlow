# Estrategias de Solucao

O OptiFlow agora possui tres estrategias executaveis sobre o mesmo contrato de
cenario.

## `nearest-neighbor-capacity`

E a estrategia padrao. Ela percorre os recursos na ordem do cenario e escolhe,
para cada recurso, a demanda viavel mais proxima enquanto houver capacidade.

Uso:

```bash
npm run scenario:small
```

Caracteristicas:

- Deterministica.
- Rapida e simples de auditar.
- Respeita capacidade.
- Usa distancia como criterio local.
- Nao garante melhor plano global.

## `cost-aware-greedy`

E uma variante da heuristica gulosa. Mantem os mesmos filtros de capacidade e
restricoes, mas pontua cada proximo pedido por:

```text
distancia adicional da rota * distanceUnitCost
+ atraso previsto do pedido * lateMinutePenalty
+ aumento estimado do atraso dos outros pedidos * lateMinutePenalty
```

A distancia adicional inclui a mudanca no percurso de retorno ao deposito. Se
uma janela de tempo rigida tornaria outro pedido inviavel apos a escolha, a
estimativa acrescenta `unassignedOrderPenalty`. O efeito nos outros pedidos e
uma estimativa local: nao representa uma reotimizacao completa nem garante
melhora em todos os cenarios. Empates de custo usam a menor distancia e depois
o menor ID do pedido.

Para executar em um cenario:

```bash
OPTIFLOW_STRATEGY=cost-aware-greedy npm run scenario:small
```

Para comparar com a heuristica original em um cenario que mostra a diferenca:

```bash
npm run benchmark:compare:cost-aware
```

## `exact-enumeration`

E o primeiro adaptador de solver. Ele enumera planos viaveis para cenarios
pequenos, mede cada plano com a mesma funcao de custo do motor e seleciona o
menor custo encontrado.

Uso:

```bash
OPTIFLOW_STRATEGY=exact-enumeration npm run scenario:small
```

Limites configuraveis:

```bash
OPTIFLOW_STRATEGY=exact-enumeration \
OPTIFLOW_SOLVER_MAX_ORDERS=8 \
OPTIFLOW_SOLVER_TIMEOUT_MS=1000 \
npm run scenario:small
```

Caracteristicas:

- Preserva o formato de saida `RoutePlan`.
- Respeita capacidade.
- Permite demanda nao atendida quando isso reduz o custo total.
- Retorna erro explicavel quando o cenario excede o limite configurado.
- Serve como ponte antes de integrar OR-Tools ou outro solver de producao.

## Resultado no Cenario Pequeno

No `small-delivery-v1`, a heuristica retorna custo total 792. A enumeracao
exata encontra custo total 744 ao atender:

- `truck-1`: `order-north -> order-east`
- `van-1`: `order-west`

O pedido `order-south` permanece nao atendido porque a demanda total excede a
capacidade total disponivel.

## Proxima Evolucao

Esta estrategia ainda nao e uma substituta para um solver escalavel. Ela existe
para provar o contrato, testar a comparacao entre estrategias e manter as falhas
controladas antes de integrar uma biblioteca especializada.
