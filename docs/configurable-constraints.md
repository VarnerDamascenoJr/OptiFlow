# Restricoes Configuraveis

O OptiFlow permite ativar restricoes por cenario usando o campo opcional
`constraints`. Cenarios antigos continuam validos sem esse campo.

## Schema

```json
{
  "constraints": {
    "hardTimeWindows": true,
    "maxRouteDistance": true,
    "requiredOrderIds": ["critical-demand"]
  }
}
```

Campos:

| Campo | Tipo | Comportamento |
| --- | --- | --- |
| `hardTimeWindows` | boolean | Quando `true`, uma demanda nao pode ser atendida se o servico comecar depois do fim da janela. |
| `maxRouteDistance` | boolean | Quando `true`, cada recurso precisa definir `maxDistance`, e a rota nao pode ultrapassar esse limite. |
| `requiredOrderIds` | string[] | Marca demandas obrigatorias para investigacao do resultado. Se ficarem nao atendidas, aparecem como obrigatorias nos detalhes. |

## Resultado de Inviabilidade

O resultado preserva `unassignedOrderIds` e adiciona `unassignedOrderDetails`:

```json
{
  "unassignedOrderIds": ["critical-demand"],
  "unassignedOrderDetails": [
    {
      "orderId": "critical-demand",
      "reason": "hard_time_window_unreachable",
      "required": true
    }
  ]
}
```

Razoes iniciais:

| Razao | Significado |
| --- | --- |
| `hard_time_window_unreachable` | Nenhum recurso consegue chegar dentro da janela quando `hardTimeWindows` esta ativo. |
| `max_route_distance_exceeded` | Nenhum recurso consegue fazer ida e volta dentro de `maxDistance` quando `maxRouteDistance` esta ativo. |
| `required_order_unassigned` | Demanda obrigatoria ficou nao atendida por decisao da estrategia ou capacidade disponivel. |
| `not_selected_by_strategy_or_capacity` | Demanda opcional ficou fora do plano por capacidade, custo ou criterio da estrategia. |

## Exemplos

Janela como penalidade, comportamento padrao:

```json
{
  "timeWindow": {
    "startMinutes": 480,
    "endMinutes": 482
  }
}
```

Nesse modo, atraso aumenta o custo, mas a demanda ainda pode ser atendida.

Janela como restricao dura:

```json
{
  "constraints": {
    "hardTimeWindows": true
  }
}
```

Nesse modo, se o servico comecar depois de `endMinutes`, a demanda fica
inviavel para aquela rota.

Jornada maxima por recurso:

```json
{
  "vehicles": [
    {
      "id": "resource-a",
      "capacity": 5,
      "startLocationId": "gateway",
      "maxDistance": 8
    }
  ],
  "constraints": {
    "maxRouteDistance": true
  }
}
```

Quando `maxRouteDistance` esta ativo, todos os recursos precisam declarar
`maxDistance`.
