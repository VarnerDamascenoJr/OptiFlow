# Notas de Tecnologia

Tecnologias citadas durante a exploracao do projeto. Estas notas nao representam decisoes de arquitetura; cada item deve ser validado na etapa em que se tornar relevante.

## NestJS Observe

**Status:** em avaliacao para a fase de backend e processamento assincrono.

Em 25 de agosto de 2026, foi compartilhado um anuncio da equipe NestJS sobre o NestJS Observe. Segundo o anuncio, o produto oferece observabilidade auto-instrumentada para aplicacoes NestJS, cobrindo requisicoes HTTP e GraphQL, microservicos/RPC, jobs BullMQ, tarefas agendadas, traces, metricas de runtime, logs, erros e perfis de CPU. O anuncio tambem menciona uma faixa gratuita de ate 300 mil eventos por mes.

No OptiFlow, ele pode ser avaliado quando existirem uma API NestJS e workers para execucoes de otimizacao. A avaliacao deve usar um cenario com requisicao de criacao de execucao, enfileiramento, processamento pelo worker e consulta do resultado.

### Pontos a validar antes da adocao

- Documentacao, maturidade e limites atuais do produto.
- Instrumentacao real de API, BullMQ e tarefas de longa duracao.
- Correlacao de trace entre requisicao, job e resultado da otimizacao.
- Retencao, volume de eventos e custo alem da faixa gratuita.
- Politica para dados operacionais ou identificaveis enviados pela telemetria.
- Exportacao ou interoperabilidade com OpenTelemetry e a plataforma de observabilidade do portfolio.
- Comparacao com instrumentacao manual baseada em OpenTelemetry.

### Criterio de decisao

Adotar somente se a configuracao simplificar a observabilidade do fluxo completo sem limitar a correlacao, o controle dos dados ou a integracao futura com o projeto de observabilidade operacional.
