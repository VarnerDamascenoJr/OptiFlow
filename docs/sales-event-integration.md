# Integracao com Sales Event Project

Este documento define a relacao inicial entre o OptiFlow e o `sales-event-project`.

## Principio

O OptiFlow deve aprender com o dominio do `sales-event-project`, mas nao deve depender diretamente de seu banco, codigo Go ou estruturas internas.

A integracao futura deve acontecer por contrato: snapshot, exportacao, API ou eventos.

## Dados Relevantes do Sales Event Project

| Origem no sales | Uso potencial no OptiFlow |
| --- | --- |
| `sales_events` | Contexto comercial da decisao. |
| `tickets` | Itens vendaveis, preco e estoque disponivel. |
| `sales` | Vendas observadas, status e valor total. |
| `sale_items` | Quantidade vendida por item. |
| `payments` e `payment_intents` | Conversao, falha de pagamento e atraso de confirmacao. |
| `issued_tickets` | Atendimento final da venda. |
| `ticket_check_ins` | No-show, comparecimento e demanda operacional no local. |
| `outbox_events` | Eventos de dominio que podem alimentar snapshots ou streaming futuro. |

## Eventos Observados

O `sales-event-project` possui eventos como:

- `SALE_CREATED`
- `SALE_COMPLETED`
- `SALE_FAILED`

Na primeira versao, o OptiFlow nao precisa consumir RabbitMQ diretamente. O caminho mais simples e gerar snapshots reproduziveis a partir desses fatos.

## Snapshot Candidato

```json
{
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
      "availableQuantity": 100,
      "soldQuantity": 0
    }
  ],
  "salesSummary": {
    "created": 0,
    "pendingPayment": 0,
    "completed": 0,
    "failed": 0
  }
}
```

## Decisao de Fronteira

- OptiFlow nao importa pacotes do `sales-event-project`.
- OptiFlow nao consulta tabelas do `sales-event-project` diretamente no MVP.
- OptiFlow define schemas proprios em JSON.
- Um adapter futuro pode transformar dados do sales nesse contrato.
- O contrato deve ser versionado para preservar reprodutibilidade dos experimentos.

## Primeira Implementacao Recomendada

Criar `SalesDecisionScenario` no OptiFlow com validador, cenario sintetico e metricas deterministicas basicas. A primeira versao esta representada em `data/scenarios/sales-event-capacity.json` e pode ser executada com:

```bash
npm run scenario:sales
```

Metricas iniciais:

- receita potencial, receita esperada e receita perdida;
- demanda atendida;
- demanda perdida;
- estoque ocioso;
- penalidade por ruptura;
- valor da estrategia.
