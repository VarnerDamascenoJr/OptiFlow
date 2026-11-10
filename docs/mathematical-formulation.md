# Formulacao Matematica Inicial

Este documento formaliza o planejamento deterministico de entregas do OptiFlow
e relaciona suas equacoes ao contrato JSON e ao motor implementado. A mesma
funcao de custo permite comparar duas heuristicas, enumeracao exata limitada e
OR-Tools CP-SAT.

## Escopo

O problema inicial e planejamento deterministico de entregas com frota limitada,
matriz de distancia conhecida e janelas de atendimento suaves por padrao. Todos
os dados do cenario sao conhecidos antes da execucao. Por configuracao, janelas
de atendimento e distancia maxima da rota podem se tornar restricoes duras.

O motor oferece `nearest-neighbor-capacity`, `cost-aware-greedy`,
`exact-enumeration` e `or-tools`. As heuristicas produzem linhas de base sem prova de
otimalidade. A enumeracao compara os planos candidatos que consegue gerar,
respeitando limites de tamanho e tempo; suas garantias estao detalhadas abaixo.

A formulacao por sequencias abaixo descreve o problema independentemente da
biblioteca. O adaptador `or-tools` implementa uma formulacao por circuitos,
atribuicoes e precedencias temporais em CP-SAT, detalhada em
[or-tools-solver.md](or-tools-solver.md).

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
| `M_v` | `vehicles[v].maxDistance` | Distancia maxima, obrigatoria quando `constraints.maxRouteDistance` esta ativo. |
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

Capacidade e demanda usam a mesma unidade operacional; tempos usam minutos.
`alpha`, `beta` e `gamma` convertem, respectivamente, distancia, minutos de
atraso e quantidade de pedidos nao atendidos para a mesma unidade de custo.
O JSON nao fixa moeda nem unidade fisica de distancia. Demanda e capacidade
podem ser fracionarias, mas cada pedido e atendido integralmente por um veiculo.

A matriz pode ser assimetrica. O validador exige valores finitos nao negativos,
mas nao exige diagonal zero nem desigualdade triangular. Os exemplos usam
diagonal zero; as consequencias para rotas vazias e para a poda por distancia
estao explicitadas adiante.

## Decisoes Representadas no Plano Atual

Estas decisoes sao representadas no `RoutePlan` gerado pelas quatro estrategias.
Elas descrevem a saida compartilhada pelas heuristicas, pela enumeracao e pelo
adaptador OR-Tools.

| Decisao | Representacao atual | Descricao |
| --- | --- | --- |
| Ordem dos pedidos por veiculo | `routes[].stops[]` | Sequencia em que cada veiculo visita os pedidos escolhidos. |
| Pedido atendido | Parada `type = "order"` | Um pedido aparece em no maximo uma rota. |
| Pedido nao alocado | `unassignedOrderIds[]` | Pedido que ficou fora do plano por capacidade, restricoes ou decisao da estrategia. |
| Chegada | `arrivalTimeMinutes` | Minuto de chegada na parada. |
| Inicio de servico | `serviceStartMinutes` | Maior valor entre chegada e inicio da janela do pedido. |
| Saida | `departureTimeMinutes` | Inicio de servico mais tempo de atendimento. |
| Carga acumulada | `loadAfterStop` | Demanda total carregada apos a parada. |
| Atraso | `lateMinutes` | Excesso sobre o fim da janela de atendimento. |

## Variaveis e Equacoes de Rota

Para cada veiculo `v`, a decisao e uma sequencia finita
`R_v = (o_v1, ..., o_vn_v)` de pedidos distintos. `n_v = 0` representa um
veiculo sem pedidos. Usar pedidos como elementos da sequencia preserva o
atendimento unico mesmo quando pedidos diferentes compartilham um local.

Defina `y_vo = 1` quando `o` pertence a `R_v`, e `0` caso contrario.
Defina `u_o = 1` quando o pedido nao e atendido, e `0` caso contrario.
Essas variaveis binarias sao uma representacao matematica; o motor armazena
sequencias e IDs, sem criar um modelo binario em biblioteca de solver.

Para uma rota, `l_v0 = depot_v`, `l_vk = loc(o_vk)` para `1 <= k <= n_v`
e `l_v(n_v+1) = depot_v`. Os estados sao calculados por recorrencia:

```text
departure_v0 = t0
load_v0 = 0

arrival_vk = departure_v(k-1) + dist[l_v(k-1), l_vk]
serviceStart_vk = max(arrival_vk, tw_start_(o_vk))
wait_vk = serviceStart_vk - arrival_vk
late_vk = max(0, serviceStart_vk - tw_end_(o_vk))
departure_vk = serviceStart_vk + svc_(o_vk)
load_vk = load_v(k-1) + d_(o_vk)                 (1 <= k <= n_v)

D_v = sum(k = 0..n_v, dist[l_vk, l_v(k+1)])
returnTime_v = departure_vn_v + dist[l_vn_v, depot_v]
```

Para `n_v = 0`, `departure_vn_v = t0` e `D_v = dist[depot_v, depot_v]`.
Assim, rota vazia tem distancia zero quando a diagonal da matriz e zero.
O motor inclui uma parada de inicio e uma de fim mesmo sem pedidos.

O estado temporal e o mais cedo possivel para a sequencia escolhida. Com tempos
nao negativos e penalidade de atraso nao negativa, espera adicional nao melhora
o objetivo deste modelo. O deadline limita o inicio do servico, nao sua
conclusao. O retorno ao deposito nao tem janela de atendimento nem penalidade
de atraso propria.

## Funcao Objetivo

O problema busca minimizar a soma ponderada sobre planos viaveis:

```text
min F = alpha * sum(v in V, D_v)
      + beta  * sum(v in V, sum(k = 1..n_v, late_vk))
      + gamma * sum(o in O, u_o)
```

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

`gamma` incide por pedido nao atendido, independentemente de sua demanda.
Deixar um pedido fora do plano pode reduzir o custo quando seu atendimento
custa mais que a penalidade. Capacidade total suficiente nao obriga atendimento
total, e penalidade zero pode favorecer rotas vazias na enumeracao.

`nearest-neighbor-capacity` usa distancia como criterio local.
`cost-aware-greedy` estima custo incremental e impacto sobre outros pedidos.
Nenhuma das duas minimiza globalmente `F`. `exact-enumeration` compara planos
completos usando as metricas de `evaluatePlan`.
`or-tools` minimiza a soma ponderada antes do arredondamento e informa
`OPTIMAL` quando comprova otimalidade ou `FEASIBLE` quando encontra apenas um
plano viavel no prazo, sem reproduzir os desempates da enumeracao.

As metricas de custo, distancia e atraso retornadas sao arredondadas a duas
casas decimais. Os componentes de custo sao calculados a partir dos totais
internos antes desse arredondamento; por isso, a soma dos componentes exibidos
pode diferir do custo total exibido por arredondamento.

## Restricoes Duras Atuais

### Atendimento unico ou nao alocacao

Cada pedido deve aparecer em no maximo uma rota. Se nao aparecer em nenhuma
rota, deve constar em `unassignedOrderIds`.

```text
sum(v in V, y_vo) + u_o = 1, for all o in O
y_vo in {0, 1}; u_o in {0, 1}
```

### Capacidade

A soma das demandas atendidas por cada veiculo nao pode exceder sua capacidade:

```text
sum(o in O, d_o * y_vo) <= c_v, for all v in V
```

A heuristica atual tambem respeita esta restricao ao filtrar pedidos que nao
cabem na capacidade restante.

Nao ha recarga, segunda viagem nem fracionamento de pedido. `loadAfterStop`
registra demanda acumulada atendida, e nao estoque fisico restante no veiculo.
O validador rejeita, antes de planejar, um pedido maior que a capacidade de
todos os veiculos, mesmo que a formulacao permita representa-lo como nao
atendido.

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

### Restricoes configuraveis

Sem `constraints`, as janelas sao suaves e nao ha limite de distancia da rota.
As estrategias respeitam as seguintes restricoes:

| Configuracao | Condicao para um pedido inserido na rota |
| --- | --- |
| `hardTimeWindows = true` | `serviceStart_vk <= tw_end_(o_vk)`. Igualdade e permitida. |
| `maxRouteDistance = true` | `D_v <= M_v`, incluindo o retorno ao deposito. |

O limite de distancia inclui o retorno ao deposito; ele nao limita a duracao
da jornada, pois espera e servico nao entram em `D_v`. Quando esta ativo, todos
os veiculos precisam declarar `maxDistance`. Apenas declarar `maxDistance` no
veiculo nao ativa o filtro.

A enumeracao so registra uma rota candidata quando sua distancia completa,
incluindo o retorno, respeita `M_v`. Ela pode continuar uma sequencia cujo
retorno direto ainda ultrapasse o limite: em matrizes sem desigualdade
triangular, visitar outro pedido pode encurtar esse retorno. A poda considera
apenas a distancia ja percorrida, pois distancias nao negativas impedem que
esse acumulado diminua. A rota vazia tambem passa pela verificacao da distancia
final, inclusive quando a diagonal da matriz nao e zero.

As heuristicas, por sua vez, exigem retorno direto viavel a cada insercao.
Esse filtro local pode deixar pedidos fora mesmo quando a enumeracao encontra
uma sequencia final viavel. Usa-se diagonal zero para representar veiculo
ocioso sem distancia consumida.

`constraints.requiredOrderIds` identifica pedidos para diagnostico. Atualmente
nao impoe `u_o = 0`, nao altera pesos e nao impede que um pedido marcado fique
sem atendimento. Nesse caso, `unassignedOrderDetails` inclui `required: true`.
Veja [configurable-constraints.md](configurable-constraints.md).

## Penalidades e Restricoes Suaves

Capacidade, atendimento unico e retorno ao inicio sao restricoes duras.
Com janelas suaves, atraso e nao alocacao entram como penalidade:

- Chegar antes da janela gera espera, nao penalidade.
- Iniciar depois de `tw_end_o` gera `late(o)`.
- Nao atender um pedido gera `u_o = 1` e adiciona `gamma` ao custo.

Com janelas duras, atraso nao e permitido para pedidos atendidos, mesmo quando
`beta = 0`. A nao alocacao permanece permitida, inclusive para IDs marcados em
`requiredOrderIds`.

## Contrato e Garantias do Solver Atual

`exact-enumeration` aceita o mesmo JSON de cenario e devolve o mesmo formato
conceitual de plano: rotas por veiculo, paradas, pedidos nao alocados e metricas
comparaveis. A implementacao esta em `src/exact-solver.js`.

Ela gera sequencias candidatas por veiculo, incluindo a vazia, e combina
rotas sem repetir pedidos. Como cada sequencia parte do deposito e retorna a
ele, nao ha ciclos desconectados que exijam eliminacao de subtours nessa
representacao.

A escolha e lexicografica, usando valores retornados por `evaluatePlan`:

1. Menor `totalCost`, arredondado a duas casas decimais.
2. Menor quantidade de pedidos nao alocados, em caso de empate no custo.
3. Menor `totalDistance`, arredondada a duas casas decimais, se persistir empate.

Empate nos tres criterios preserva o primeiro plano encontrado. Um custo real
ligeiramente maior pode empatar apos arredondamento e vencer pelos demais
criterios; a implementacao nao certifica o minimo de `F` em precisao arbitraria.

Os limites padrao sao oito pedidos e 1000 ms, configuraveis por `maxOrders` e
`timeoutMs` nas opcoes do solver. Exceder tamanho ou tempo gera erro. Timeout
nao devolve o melhor plano parcial nem certifica otimalidade. Uma execucao
concluida seleciona o melhor plano entre os candidatos gerados.

Com `maxRouteDistance`, a enumeracao verifica o limite da rota completa sem
exigir desigualdade triangular. Por exemplo, se `depot -> a = 1`,
`a -> depot = 10`, `a -> b = 1` e `b -> depot = 1`, o prefixo com apenas `a`
teria distancia final 11, mas a rota `depot -> a -> b -> depot` tem distancia
3. Com limite 3, a primeira nao e candidata, mas a segunda continua sendo
explorada e pode ser selecionada. Capacidade e janelas duras continuam sendo
verificadas em cada insercao.

A enumeracao nao usa OR-Tools. O adaptador separado `or-tools` preserva as
equacoes e restricoes com escalas inteiras para dados com ate seis casas
decimais, limites numericos explicitos e status de solucao. Suas garantias e
precisao estao em [or-tools-solver.md](or-tools-solver.md); a comparacao das
estrategias esta em [solver-strategies.md](solver-strategies.md).

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
| `vehicles[].maxDistance` | Define `M_v` quando o limite esta ativo. |
| `vehicles[].startLocationId` | Define `depot_v`. |
| `orders[].id` | Define o conjunto `O`. |
| `orders[].locationId` | Define `loc(o)`. |
| `orders[].demand` | Define `d_o`. |
| `orders[].serviceTimeMinutes` | Define `svc_o`. |
| `orders[].timeWindow.startMinutes` | Define `tw_start_o`. |
| `orders[].timeWindow.endMinutes` | Define `tw_end_o`. |
| `distanceMatrix[from][to]` | Define `dist_ij`. |
| `constraints.hardTimeWindows` | Ativa janela de inicio de servico como restricao dura. |
| `constraints.maxRouteDistance` | Ativa o filtro de distancia com retorno por prefixo. |
| `constraints.requiredOrderIds` | Anota pedidos prioritarios para diagnostico, sem forcar atendimento. |

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

### Comparacao com enumeracao

No mesmo cenario, `exact-enumeration` seleciona:

| Veiculo | Sequencia | Distancia | Carga | Atraso |
| --- | --- | ---: | ---: | ---: |
| `truck-1` | `depot -> north -> east -> depot` | `12 + 11 + 18 = 41` | 9/10 | 0 |
| `van-1` | `depot -> west -> depot` | `10 + 10 = 20` | 3/6 | 0 |

`order-south` permanece nao alocado. O custo e `4 * 61 + 2 * 0 + 500 * 1 = 744`.
O ganho sobre a referencia e `792 - 744 = 48`, ou `6,06%`. Esse resultado
compara o mesmo cenario, os mesmos pesos e as mesmas restricoes.

Para auditar os tempos da rota do `truck-1`:

| Parada | Chegada | Inicio do servico | Saida | Espera | Atraso |
| --- | ---: | ---: | ---: | ---: | ---: |
| `north` | `480 + 12 = 492` | 510 | 525 | 18 | 0 |
| `east` | `525 + 11 = 536` | 540 | 560 | 4 | 0 |
| Retorno ao deposito | `560 + 18 = 578` | 578 | 578 | 0 | 0 |

O exemplo e reproduzivel com:

```bash
OPTIFLOW_STRATEGY=exact-enumeration npm run scenario:small
npm run benchmark:compare
```

## Limitacoes Conhecidas

- As heuristicas usam decisoes locais e nao provam otimalidade global.
- Enumeracao cresce combinatoriamente e serve a cenarios pequenos. OR-Tools
  esta integrado, mas tambem depende de limites de tamanho e tempo; apenas
  status `OPTIMAL` comprova otimalidade do seu modelo inteiro representado.
- Arredondamento limita a interpretacao de otimalidade conforme descrito no
  contrato do solver. As heuristicas tambem usam o filtro local de retorno
  direto por prefixo, que pode descartar rotas em matrizes nao metricas.
- Janelas sao suaves por padrao; apenas `hardTimeWindows` impede atraso.
- Pedidos marcados em `requiredOrderIds` podem ficar sem atendimento.
- Cada veiculo retorna ao seu local inicial.
- Pedidos nao sao fracionados entre veiculos.
- Distancia e tempo de viagem usam o mesmo valor da matriz.
- Nao ha incerteza, cancelamento, demanda aleatoria ou trafego variavel nesta
  formulacao deterministica. Simulacao e decisao orientada a risco sao camadas
  separadas ja documentadas em [statistical-simulation.md](statistical-simulation.md)
  e [risk-aware-decision.md](risk-aware-decision.md).
- Persistencia, API, fila e interface existentes nao alteram estas equacoes.

## Evidencias e Evolucao

Os benchmarks, o adaptador por enumeracao, a comparacao e as restricoes
configuraveis ja estao implementados. As evidencias executaveis estao em
`test/route-planner.test.js`, `test/exact-solver.test.js` e
`test/strategy-comparison.test.js`, com cenarios descritos em
[benchmark-scenarios.md](benchmark-scenarios.md). Os testes do solver cobrem
retorno intermediario acima do limite, distancia final, capacidade, janelas
duras, desativacao do limite e rotas vazias com diagonal nao nula.

Os testes em `test/or-tools-solver.test.js` demonstram a compatibilidade do
adaptador OR-Tools com entrada, saida, restricoes e custo nesses mesmos cenarios.
Mudancas como tempo de viagem separado da distancia, atendimento realmente
obrigatorio ou varias viagens por veiculo exigem evolucao explicita do modelo.
