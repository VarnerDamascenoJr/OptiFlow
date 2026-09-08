# Decisoes do Projeto

Este documento registra somente decisoes confirmadas. Alternativas tecnicas ainda em avaliacao devem ser discutidas na etapa correspondente do checklist.

| Decisao | Status | Justificativa |
| --- | --- | --- |
| Nome do projeto: OptiFlow | Confirmada | Comunica fluxo e otimizacao sem limitar o produto a um unico dominio. |
| Primeiro dominio do MVP: distribuicao de entregas | Confirmada | O dominio permite evoluir de rotas deterministicas para incerteza, simulacao e decisao orientada a risco sem trocar o problema principal. |
| Primeira entrega tecnica: nucleo deterministico sem dependencias externas | Confirmada | O repositorio ainda nao tinha runtime configurado; iniciar com um motor pequeno e testavel reduz atrito e cria uma linha de base antes de NestJS, persistencia, fila ou OR-Tools. |
| Estrutura de aplicacoes e servicos | Em aberto | Sera definida apos validar o nucleo deterministico e a integracao com solver. |
| Persistencia, fila e infraestrutura | Em aberto | Sera definida ao iniciar backend e processamento assincrono. |
