# Decisoes do Projeto

Este documento registra somente decisoes confirmadas. Alternativas tecnicas ainda em avaliacao devem ser discutidas na etapa correspondente do checklist.

| Decisao | Status | Justificativa |
| --- | --- | --- |
| Nome do projeto: OptiFlow | Confirmada | Comunica fluxo e otimizacao sem limitar o produto a um unico dominio. |
| Primeiro dominio do MVP: distribuicao de entregas | Confirmada | O dominio permite evoluir de rotas deterministicas para incerteza, simulacao e decisao orientada a risco sem trocar o problema principal. |
| Primeira entrega tecnica: nucleo deterministico sem dependencias externas | Confirmada | O repositorio ainda nao tinha runtime configurado; iniciar com um motor pequeno e testavel reduz atrito e cria uma linha de base antes de NestJS, persistencia, fila ou OR-Tools. |
| Solver especializado: OR-Tools CP-SAT com ponte JSON em Python | Confirmada | Implementa circuitos, capacidade e tempo sem enumerar previamente todas as rotas. Mantem o contrato Node.js e informa status, objetivo e limite inferior; a enumeracao pequena permanece como referencia de validacao. Dependencia, precisao e limites estao em [or-tools-solver.md](or-tools-solver.md). |
| Primeira previsao operacional: ingenua e media movel por local/janela | Confirmada | Baselines auditaveis com MAE/RMSE por origem movel medem erro antes de orientar rotas. O contrato independente de historico, as premissas sinteticas e a separacao entre previsao e pedidos confirmados estao em [demand-forecasting.md](demand-forecasting.md). |
| Estrutura de aplicacoes e servicos | Confirmada | Monolito modular NestJS 12 com Express, controllers de cenarios, execucoes e operacao, e providers compartilhados por aplicacao. O nucleo JavaScript e a ponte Python permanecem independentes do framework. Build, fronteiras e limites estao em [backend-architecture.md](backend-architecture.md). |
| Persistencia, fila e infraestrutura do MVP local | Confirmada | Repositorio JSON com um unico escritor e fila em memoria, injetados no runtime NestJS. Sao suficientes para a demonstracao local; banco transacional, fila duravel e isolamento em worker ficam para uma evolucao com recuperacao de jobs. |
