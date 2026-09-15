# Formulacao Matematica Inicial

Este documento fecha a formulacao deterministica inicial do OptiFlow para
distribuicao de entregas. Ele descreve o problema que a heuristica atual mede e
o contrato de entrada e saida que um solver devera preservar nas proximas
etapas.

## Escopo

O problema inicial e planejamento deterministico de entregas com frota limitada,
matriz de distancia conhecida e janelas de atendimento suaves. Todos os dados do
cenario sao conhecidos antes da execucao.

O motor atual usa a estrategia `nearest-neighbor-capacity`. Ela nao prova
otimalidade; ela gera uma linha de base deterministica para comparar com solver.

Esta versao trata veiculos, capacidade e distancia, mas ainda nao implementa uma
formulacao completa de VRP em solver. O solver entra em P3.3.

## Conjuntos

| Simbolo | Origem no JSON | Descricao |
| --- | --- | --- |
| `L` | `locations` | Locais conhecidos, incluindo deposito e clientes. |
| `V` | `vehicles` | Veiculos disponiveis. |
| `O` | `orders` | Pedidos candidatos a atendimento. |

Cada pedido `o in O` referencia exatamente um local `loc(o) in L`. Nesta
versao, todos os veiculos podem visitar o mesmo conjunto de locais `L`; o que
muda por veiculo e o local inicial e final `depot_v`.

## Parametros

| Parametro | Origem no JSON | Descricao |
| --- | --- | --- |
| `t0` | `operation.startTimeMinutes` | Minuto inicial do planejamento. |
| `c_v` | `vehicles[v].capacity` | Capacidade do veiculo `v`. |
| `depot_v` | `vehicles[v].startLocationId` | Local inicial e final do veiculo `v` nesta versao. |
| `d_o` | `orders[o].demand` | Demanda do pedido `o`. |
| `svc_o` | `orders[o].serviceTimeMinutes` | Tempo de servico do pedido `o`. |
| `tw_start_o` | `orders[o].timeWindow.startMinutes` | Inicio da janela de atendimento do pedido `o`. |
| `tw_end_o` | `orders[o].timeWindow.endMinutes` | Fim da janela de atendimento do pedido `o`. |
| `dist_ij` | `distanceMatrix[i][j]` | Distancia ou tempo de viagem entre locais `i` e `j`. |
| `alpha` | `costs.distanceUnitCost` | Custo por unidade de distancia. |
| `beta` | `costs.lateMinutePenalty` | Penalidade por minuto de atraso. |
| `gamma` | `costs.unassignedOrderPenalty` | Penalidade por pedido nao atendido. |

Na primeira versao, `dist_ij` tambem e usado como tempo de viagem. Se distancia
e tempo forem separados no futuro, a formulacao deve introduzir outro parametro
para tempo de viagem.

## Decisoes Representadas no Plano Atual

Estas decisoes sao representadas no `RoutePlan` gerado pela heuristica atual.
Elas descrevem a saida que deve continuar estavel quando um solver for
introduzido.

| Decisao | Representacao atual | Descricao |
| --- | --- | --- |
| Ordem dos pedidos por veiculo | `routes[].stops[]` | Sequencia em que cada veiculo visita os pedidos escolhidos. |
| Pedido atendido | Parada `type = "order"` | Um pedido aparece em no maximo uma rota. |
| Pedido nao alocado | `unassignedOrderIds[]` | Pedido que a heuristica nao conseguiu inserir respeitando capacidade. |
| Chegada | `arrivalTimeMinutes` | Minuto de chegada na parada. |
| Inicio de servico | `serviceStartMinutes` | Maior valor entre chegada e inicio da janela do pedido. |
| Saida | `departureTimeMinutes` | Inicio de servico mais tempo de atendimento. |
| Carga acumulada | `loadAfterStop` | Demanda total carregada apos a parada. |
| Atraso | `lateMinutes` | Excesso sobre o fim da janela de atendimento. |

## Funcao Objetivo

O custo total usado hoje mede a qualidade do plano produzido:

```text
totalCost =
  alpha * totalDistance
+ beta  * totalLateMinutes
+ gamma * unassignedOrders
```

Ela corresponde as metricas atuais:

- `distanceCost = totalDistance * costs.distanceUnitCost`
- `latenessCost = totalLateMinutes * costs.lateMinutePenalty`
- `unassignedCost = unassignedOrderIds.length * costs.unassignedOrderPenalty`
- `totalCost = distanceCost + latenessCost + unassignedCost`

Qualquer peso pode ser zero. Peso zero nao remove a grandeza do plano; apenas
desativa seu impacto na funcao objetivo.

Importante: a heuristica atual usa distancia para escolher o proximo pedido
viavel mais proximo. Ela nao resolve uma minimizacao global desta funcao
objetivo; o custo e calculado depois para comparar planos.

## Restricoes Duras Atuais

### Atendimento unico ou nao alocacao

Cada pedido deve aparecer em no maximo uma rota. Se nao aparecer em nenhuma
rota, deve constar em `unassignedOrderIds`.

```text
servedOnce(o) + unassigned(o) = 1, for all o in O
```

### Capacidade

A soma das demandas atendidas por cada veiculo nao pode exceder sua capacidade:

```text
routeDemand(v) <= c_v, for all v in V
```

A heuristica atual tambem respeita esta restricao ao filtrar pedidos que nao
cabem na capacidade restante.

### Inicio e retorno

Cada rota comeca em `vehicles[v].startLocationId` e termina no mesmo local.

### Tempo e atendimento

Para cada parada de pedido, o servico nao pode iniciar antes da chegada nem
antes do inicio da janela:

```text
serviceStart(o) = max(arrival(o), tw_start_o)
```

O atraso e medido como excesso sobre o fim da janela:

```text
late(o) = max(0, serviceStart(o) - tw_end_o)
```

## Penalidades e Restricoes Suaves

Na versao inicial, capacidade, atendimento unico e retorno ao inicio sao
restricoes duras. Janela de atendimento e nao alocacao entram como penalidade:

- Chegar antes da janela gera espera, nao penalidade.
- Iniciar depois de `tw_end_o` gera `late_vo`.
- Nao atender um pedido gera `u_o = 1` e adiciona `gamma` ao custo.

Em P3.5, janelas de tempo e pedidos obrigatorios podem virar restricoes duras
configuraveis por cenario.

## Contrato para o Solver Futuro

Quando P3.3 integrar um solver, ele devera aceitar o mesmo JSON de cenario e
devolver o mesmo formato conceitual de plano: rotas por veiculo, paradas,
pedidos nao alocados e metricas comparaveis.

Esse solver provavelmente tera variaveis binarias para arcos visitados,
atribuicao de pedidos a veiculos, ordem das visitas e eliminacao de subtours.
Esses detalhes ainda nao fazem parte da implementacao atual e devem ser
documentados junto com a escolha do solver.

## Mapeamento do JSON

| Campo | Uso na formulacao |
| --- | --- |
| `id` | Identificador do cenario e rastreabilidade da execucao. |
| `operation.startTimeMinutes` | Define `t0`, o inicio de todas as rotas. |
| `costs.distanceUnitCost` | Define `alpha`. |
| `costs.lateMinutePenalty` | Define `beta`. |
| `costs.unassignedOrderPenalty` | Define `gamma`. |
| `locations[].id` | Define o conjunto `L`. |
| `vehicles[].id` | Define o conjunto `V`. |
| `vehicles[].capacity` | Define `c_v`. |
| `vehicles[].startLocationId` | Define `depot_v`. |
| `orders[].id` | Define o conjunto `O`. |
| `orders[].locationId` | Define `loc(o)`. |
| `orders[].demand` | Define `d_o`. |
| `orders[].serviceTimeMinutes` | Define `svc_o`. |
| `orders[].timeWindow.startMinutes` | Define `tw_start_o`. |
| `orders[].timeWindow.endMinutes` | Define `tw_end_o`. |
| `distanceMatrix[from][to]` | Define `dist_ij`. |

## Exemplo Calculado: `small-delivery-v1`

Entrada principal:

- `t0 = 480`
- `alpha = 4`
- `beta = 2`
- `gamma = 500`
- Veiculos: `truck-1` com capacidade 10 e `van-1` com capacidade 6.
- Pedidos: `order-west` demanda 3, `order-north` demanda 4,
  `order-east` demanda 5 e `order-south` demanda 6.

Plano gerado pela heuristica atual:

| Veiculo | Sequencia | Distancia | Carga | Atraso |
| --- | --- | ---: | ---: | ---: |
| `truck-1` | `depot -> west -> north -> depot` | `10 + 15 + 12 = 37` | 7/10 | 0 |
| `van-1` | `depot -> east -> depot` | `18 + 18 = 36` | 5/6 | 0 |

Pedido nao alocado:

- `order-south`

Calculo do custo:

```text
totalDistance = 37 + 36 = 73
totalLateMinutes = 0
unassignedOrders = 1

distanceCost = 73 * 4 = 292
latenessCost = 0 * 2 = 0
unassignedCost = 1 * 500 = 500

totalCost = 292 + 0 + 500 = 792
```

Este resultado corresponde ao comando:

```bash
npm run scenario:small
```

## Limitacoes Conhecidas

- A heuristica atual decide apenas pela menor distancia entre pedidos viaveis
  por capacidade.
- O modelo ainda nao integra OR-Tools nem outro solver.
- Janelas de tempo sao suaves; atraso e penalizado, mas nao torna a rota
  inviavel.
- Cada veiculo retorna ao seu local inicial.
- Pedidos nao sao fracionados entre veiculos.
- Distancia e tempo de viagem usam o mesmo valor da matriz.
- Nao ha incerteza, cancelamento, demanda aleatoria ou trafego variavel nesta
  formulacao.
- Nao ha persistencia de cenarios, execucoes ou resultados.

## Implicacoes para as Proximas Etapas

- P3.2 deve criar cenarios que isolem propriedades do modelo: capacidade,
  atraso, custo e inviabilidade.
- P3.3 deve implementar um adaptador de solver que aceite o mesmo JSON e
  devolva o mesmo formato `RoutePlan`.
- P3.4 deve comparar heuristica e solver usando `totalCost`, `totalDistance`,
  `totalLateMinutes`, pedidos atendidos e utilizacao.
- P3.5 deve decidir, por configuracao, quais penalidades viram restricoes duras.
