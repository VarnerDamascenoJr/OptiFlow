# Modelo de Dominio do MVP

Este documento fecha a primeira fronteira funcional do OptiFlow: planejamento deterministico de entregas com frota limitada, matriz de distancia conhecida e uma heuristica de referencia.

## Escopo Confirmado

O MVP inicial usa distribuicao de entregas como dominio. A primeira versao nao tenta prever demanda, simular incerteza ou provar otimalidade. Ela cria uma base confiavel para comparar uma heuristica simples com um solver em uma etapa seguinte.

## Entidades

| Entidade | Papel |
| --- | --- |
| `Location` | Ponto operacional identificado por `id`, incluindo deposito e clientes. |
| `Vehicle` | Recurso de entrega com capacidade e local inicial. |
| `Order` | Demanda a ser entregue em uma localidade, com tempo de servico e janela de atendimento. |
| `DistanceMatrix` | Distancia ou tempo entre cada par de localidades. |
| `Scenario` | Conjunto completo de entradas, custos e parametros operacionais. |
| `RoutePlan` | Resultado gerado por uma estrategia de planejamento. |

## Entradas Obrigatorias

- `operation.startTimeMinutes`: minuto inicial do planejamento.
- `costs.distanceUnitCost`: custo por unidade de distancia.
- `costs.lateMinutePenalty`: penalidade por minuto de atraso.
- `costs.unassignedOrderPenalty`: penalidade por pedido nao atendido.
- `locations`: localidades conhecidas pelo cenario.
- `vehicles`: frota disponivel, com capacidade e local inicial.
- `orders`: pedidos com demanda, localidade, tempo de servico e janela de atendimento.
- `distanceMatrix`: matriz completa entre todas as localidades.

## Saidas do Primeiro Motor

- Rotas por veiculo.
- Sequencia de paradas com chegada, inicio de servico, saida, carga acumulada e atraso.
- Pedidos nao alocados.
- Metricas: pedidos atendidos, distancia total, atraso total, custo total e utilizacao por veiculo.

## Funcao Objetivo Inicial

O custo total do primeiro motor e uma soma ponderada:

```text
custo_total =
  distancia_total * distanceUnitCost +
  atraso_total_em_minutos * lateMinutePenalty +
  pedidos_nao_alocados * unassignedOrderPenalty
```

Cada peso pode ser zero para desativar uma dimensao da funcao objetivo durante experimentos. A heuristica atual ainda decide pela menor distancia viavel; a funcao objetivo e usada para medir e comparar planos.

## Heuristica de Referencia

A estrategia inicial e `nearest-neighbor-capacity`.

Para cada veiculo, o algoritmo parte do local inicial e escolhe repetidamente o pedido viavel mais proximo, respeitando apenas capacidade restante. Janelas de atendimento entram na avaliacao por atraso e espera, nao como filtro de factibilidade. Quando nenhum pedido restante cabe no veiculo, a rota retorna ao ponto inicial e o proximo veiculo continua.

Essa heuristica e propositalmente simples. Ela serve como linha de base auditavel para comparar contra OR-Tools, nao como recomendacao final de produto.

## Fora do Escopo Desta Versao

- Otimizacao global com solver.
- Restricoes de jornada maxima, habilidades de veiculo ou zonas.
- Pedidos fracionados entre veiculos.
- Incerteza, Monte Carlo, CVaR ou previsao.
- Persistencia, API, fila e interface.
