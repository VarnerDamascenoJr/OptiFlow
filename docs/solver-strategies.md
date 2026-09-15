# Estrategias de Solucao

O OptiFlow agora possui duas estrategias executaveis sobre o mesmo contrato de
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
