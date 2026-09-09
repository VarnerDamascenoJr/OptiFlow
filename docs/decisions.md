# Decisoes do Projeto

Este documento registra somente decisoes confirmadas. Alternativas tecnicas ainda em avaliacao devem ser discutidas na etapa correspondente do checklist.

| Decisao | Status | Justificativa |
| --- | --- | --- |
| Nome do projeto: OptiFlow | Confirmada | Comunica fluxo e otimizacao sem limitar o produto a um unico dominio. |
| Primeiro dominio do MVP: decisao operacional em vendas | Confirmada | O dominio conecta diretamente o OptiFlow ao `sales-event-project`, preserva independencia entre repositorios e cria um recorte adequado para pesquisa com demanda, capacidade, incerteza e risco. |
| `sales-event-project` como estudo de caso inicial | Confirmada | O projeto de vendas fornece fatos de negocio sobre eventos, tickets, estoque, pagamentos e atendimento; o OptiFlow deve consumir snapshots ou contratos derivados, nao depender diretamente do codigo ou banco desse repositorio. |
| Primeira implementacao tecnica: nucleo deterministico sem dependencias externas | Confirmada | O repositorio ainda nao tinha runtime configurado; iniciar com um motor pequeno e testavel reduziu atrito, mas esse nucleo sera reposicionado para o dominio de vendas antes da evolucao do MVP. |
| Estrutura de aplicacoes e servicos | Em aberto | Sera definida apos validar o contrato de cenarios de venda e o modelo matematico inicial. |
| Persistencia, fila e infraestrutura | Em aberto | Sera definida ao iniciar backend e processamento assincrono. |
