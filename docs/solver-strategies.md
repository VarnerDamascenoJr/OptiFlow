# Estrategias de Solucao

O OptiFlow agora possui quatro estrategias executaveis sobre o mesmo contrato de
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
menor custo encontrado entre os candidatos gerados. A formulacao e as
garantias estao em [mathematical-formulation.md](mathematical-formulation.md).

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
- Respeita capacidade e os filtros configurados de janela e distancia.
- Permite demanda nao atendida quando isso reduz o custo total.
- Usa custo arredondado a duas casas decimais; empates favorecem menos pedidos
  nao alocados e depois menor distancia arredondada.
- Retorna erro explicavel quando o cenario excede o limite de pedidos ou tempo;
  timeout nao retorna um plano parcial.
- Serve como referencia exata limitada para validar o adaptador OR-Tools.

`requiredOrderIds` apenas identifica pedidos para diagnostico; nao obriga o
solver a atende-los. Com `maxRouteDistance`, a enumeracao verifica a distancia
completa antes de registrar uma rota candidata. Um prefixo cujo retorno direto
exceda o limite ainda pode ser explorado, pois outra parada pode encurtar o
retorno em matrizes sem desigualdade triangular. A poda por distancia usa
apenas o percurso acumulado, que nao pode diminuir com distancias nao negativas.
Rotas vazias tambem precisam respeitar o limite, considerando o valor da diagonal
da matriz. As heuristicas mantem o filtro local de retorno direto a cada
insercao. A garantia de melhor resultado da enumeracao usa os criterios
arredondados do adaptador e exige que a busca termine dentro do prazo.

## Resultado no Cenario Pequeno

No `small-delivery-v1`, a heuristica retorna custo total 792. A enumeracao
exata encontra custo total 744 ao atender:

- `truck-1`: `order-north -> order-east`
- `van-1`: `order-west`

O pedido `order-south` permanece nao atendido porque a demanda total excede a
capacidade total disponivel e esse e o plano selecionado pelo objetivo. A
insuficiencia de capacidade exige deixar algum pedido fora; a funcao de custo
e que determina qual. A distancia cai de 73 para 61, sem atraso, mantendo uma
penalidade de 500 pelo pedido nao alocado: `61 * 4 + 500 = 744`.

## `or-tools`

O adaptador OR-Tools CP-SAT resolve o modelo de entregas por circuitos e
restricoes temporais, com limite de busca e status explicito. Preserva o
contrato de rotas e metricas e adiciona `solverInfo` com `OPTIMAL` ou `FEASIBLE`,
valor do objetivo e limite inferior. A preparacao exige Python e a dependencia
de `requirements-solver.txt`, conforme [or-tools-solver.md](or-tools-solver.md).

```bash
npm run scenario:small:or-tools
npm run benchmark:compare:or-tools
```

No cenario pequeno, o solver encontra custo 744 e comprova otimalidade. O limite
padrao e de 50 pedidos e 1000 ms de busca. Ausencia de plano dentro do prazo
gera erro; um plano apenas viavel e identificado como `FEASIBLE`. O CP-SAT
minimiza o objetivo antes do arredondamento e nao adota os desempates da
enumeracao. Seus limites de precisao e execucao estao no guia do adaptador.

## Evolucao

A enumeracao continua disponivel para cenarios pequenos, junto com as duas
heuristicas. O adaptador OR-Tools permite evoluir a busca sem mudar a entrada,
com status e limites explicitos. Instancias maiores e uso concorrente exigem
medicao e isolamento de workers, pois o contrato atual de execucao e sincrono.
