# Modelo de Dominio do MVP

Este documento define a primeira fronteira funcional do OptiFlow: decisao operacional em vendas sob restricoes de estoque, capacidade, demanda e risco.

## Escopo Confirmado

O MVP inicial usa venda como dominio amplo. O caso de venda de ingressos do `sales-event-project` sera usado como estudo de caso inicial, mas o OptiFlow nao deve ficar limitado a ingressos nem acoplado ao banco ou ao codigo daquele repositorio.

O papel do OptiFlow e receber um snapshot operacional, transformar esse snapshot em um cenario de decisao, comparar estrategias e devolver recomendacoes com metricas auditaveis.

## Entidades

| Entidade | Papel |
| --- | --- |
| `SalesScenario` | Conjunto versionado de entradas, premissas e objetivos para uma decisao. |
| `SalesContext` | Contexto comercial da venda: campanha, evento, lancamento, janela ou operacao. |
| `SalesItem` | Item vendavel com preco, estoque, capacidade e regras de atendimento. |
| `DemandAssumption` | Premissa deterministica ou probabilistica sobre demanda por item e janela temporal. |
| `CapacityConstraint` | Limite operacional de estoque, processamento ou atendimento. |
| `DecisionStrategy` | Regra ou plano que sera avaliado: conservador, agressivo, balanceado ou otimizado. |
| `DecisionResult` | Saida comparavel com receita, perda, utilizacao, risco e alertas. |

## Contrato Inicial de Cenario

```json
{
  "id": "sales-event-capacity-v1",
  "source": {
    "system": "sales-event-project",
    "snapshotAt": "2026-09-08T21:00:00Z"
  },
  "salesContext": {
    "id": "11111111-1111-1111-1111-111111111111",
    "name": "Backend Moderno Conference",
    "startsAt": "2026-10-08T19:00:00Z"
  },
  "items": [
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "name": "General Admission",
      "unitPrice": 10000,
      "availableQuantity": 100
    }
  ],
  "demandAssumptions": [
    {
      "itemId": "22222222-2222-2222-2222-222222222222",
      "expectedDemand": 120
    }
  ],
  "constraints": {
    "oversellAllowed": false
  },
  "objective": {
    "maximize": "expectedRevenue",
    "penalties": {
      "stockoutPenalty": 5000,
      "unusedCapacityPenalty": 100
    }
  }
}
```

## Saidas Esperadas

- Estrategia recomendada.
- Receita potencial, receita esperada e receita perdida.
- Demanda atendida e demanda perdida.
- Estoque ou capacidade ociosa.
- Probabilidade de ruptura quando houver simulacao.
- Percentis de resultado e metricas de risco em versoes posteriores.
- Alertas sobre premissas, restricoes violadas ou sensibilidade do resultado.

## Funcao Objetivo Inicial

A primeira funcao objetivo deve ser simples e auditavel:

```text
valor_da_estrategia =
  receita_atendida
  - perda_por_ruptura
  - penalidade_por_capacidade_ociosa
  - penalidades_operacionais
```

Na versao deterministica, os valores de demanda sao conhecidos ou assumidos. Na versao estatistica, a mesma funcao sera avaliada sobre muitas amostras de demanda e capacidade.

## Relacao com o `sales-event-project`

O `sales-event-project` e fonte futura de fatos transacionais: evento de venda, tickets, estoque disponivel, vendas confirmadas, pagamentos, emissao e check-in. O OptiFlow deve consumir esses dados por snapshot, exportacao, API ou eventos, mantendo o contrato proprio.

Isso evita dependencia prematura e permite que o mesmo modelo seja aplicado a outros tipos de venda.

## Primeira Implementacao

O primeiro avaliador implementado e `deterministic-capacity-baseline`.

Ele recebe demanda esperada por item, limita o atendimento pela capacidade disponivel e calcula:

- receita esperada;
- receita potencial;
- receita perdida;
- demanda aceita;
- demanda perdida;
- capacidade ociosa;
- penalidade por ruptura;
- penalidade por capacidade ociosa;
- valor da estrategia;
- taxa de atendimento;
- taxa de utilizacao;
- taxa de ruptura.

## Fora do Escopo Desta Versao

- Ler diretamente o banco do `sales-event-project`.
- Importar codigo Go ou tipos internos de outro repositorio.
- Criar backend/API.
- Criar interface.
- Integrar solver antes de formalizar o modelo matematico.
- Usar dados reais sem explicitar origem, tratamento e limites.
