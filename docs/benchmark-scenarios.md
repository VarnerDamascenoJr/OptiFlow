# Cenarios Deterministicos de Benchmark

Estes cenarios tornam o comportamento atual do OptiFlow reproduzivel antes da
integracao com solver. Eles usam o contrato executavel atual
`vehicles`/`orders`/`distanceMatrix`, mas devem ser lidos como instancias de
otimizacao operacional:

- `vehicles` representam recursos com capacidade limitada.
- `orders` representam demandas ou cargas de trabalho.
- `distanceMatrix` representa custo operacional ou tempo de transicao entre
  estados.
- `timeWindow` representa deadline ou janela de nivel de servico.

O objetivo destes benchmarks nao e provar otimalidade. Eles isolam propriedades
do motor atual para que uma estrategia futura de solver possa ser comparada com
as mesmas entradas e metricas.

## Matriz de Benchmarks

| Cenario | Propriedade isolada | Resultado esperado |
| --- | --- | --- |
| `benchmark-minimal-obvious-v1` | Caso minimo com uma demanda e um recurso. | Atende 1 demanda, distancia 8, custo 16. |
| `benchmark-capacity-insufficient-v1` | Capacidade insuficiente para atender tudo. | Atende 1 demanda, rejeita 1, distancia 6, custo 206. |
| `benchmark-deadline-latency-v1` | Deadline apertado que gera atraso mensuravel. | Atende 1 demanda, atraso 3, distancia 10, custo 160. |
| `benchmark-multi-resource-tradeoff-v1` | Uso de multiplos recursos para evitar demanda nao atendida. | Atende 2 demandas, distancia 26, custo 52. |

## Cenario Minimo Obvio

Arquivo: `data/scenarios/benchmark-minimal-obvious.json`

Este cenario tem um recurso, uma demanda e uma transicao simetrica de custo 4.
Ele confirma o caso mais simples do motor:

```text
resource-pool -> workload-a -> resource-pool
```

Calculo esperado:

```text
totalDistance = 4 + 4 = 8
distanceCost = 8 * 2 = 16
totalCost = 16
```

## Capacidade Insuficiente

Arquivo: `data/scenarios/benchmark-capacity-insufficient.json`

O recurso tem capacidade 5, mas existem duas demandas de tamanho 4. A heuristica
seleciona a demanda mais proxima e deixa a segunda nao atendida.

Calculo esperado:

```text
totalDistance = 3 + 3 = 6
unassignedOrders = 1
distanceCost = 6 * 1 = 6
unassignedCost = 1 * 200 = 200
totalCost = 206
```

## Deadline e Latencia

Arquivo: `data/scenarios/benchmark-deadline-latency.json`

A demanda critica tem deadline no minuto 482, mas o recurso so chega no minuto
485. Isso produz atraso deterministico de 3 minutos. A janela e suave nesta
versao: o atraso penaliza o custo, mas nao torna o plano inviavel.

Calculo esperado:

```text
totalDistance = 5 + 5 = 10
totalLateMinutes = 485 - 482 = 3
distanceCost = 10 * 1 = 10
latenessCost = 3 * 50 = 150
totalCost = 160
```

## Multiplos Recursos e Trade-off

Arquivo: `data/scenarios/benchmark-multi-resource-tradeoff.json`

Cada recurso tem capacidade 5 e cada demanda exige 4. Um unico recurso nao
consegue atender as duas demandas, entao o segundo recurso evita a penalidade de
demanda nao atendida ao custo de mais deslocamento.

Calculo esperado:

```text
resource-a distance = 4 + 4 = 8
resource-b distance = 9 + 9 = 18
totalDistance = 26
distanceCost = 26 * 2 = 52
totalCost = 52
```

## Uso nas Proximas Etapas

- P3.3 deve executar o solver contra estes mesmos arquivos.
- P3.4 deve comparar a heuristica e o solver usando custo total, atraso,
  demandas atendidas e utilizacao.
- P3.5 deve transformar alguns desses cenarios em casos com restricoes duras
  configuraveis, como deadline obrigatorio ou demanda obrigatoria.
