# Backlog dos Projetos do Portfolio

Este documento complementa [portfolio-project-map.md](portfolio-project-map.md).
O mapa explica o estado e a narrativa dos projetos. Este backlog organiza o que
falta entregar em atividades testaveis.

## Como usar

- Cada item deve terminar com uma evidencia executavel, observavel ou
  documentada.
- Um item so deve ser marcado como concluido quando o criterio de aceite e a
  verificacao estiverem satisfeitos.
- Itens ja concluidos permanecem descritos no mapa; aqui ficam as proximas
  entregas.

## Definicao de pronto

Uma atividade deste backlog esta pronta quando:

- O comportamento foi implementado no repositorio correto.
- Existem testes automatizados quando o comportamento puder regredir por codigo.
- Existe evidencia manual quando a entrega depender de dashboard, roteiro,
  telemetria ou demonstracao operacional.
- O README ou documento operacional foi atualizado quando a forma de executar ou
  demonstrar o projeto mudar.
- Os comandos de qualidade do projeto continuam passando.

Comandos base por repositorio:

| Projeto | Verificacao base |
| --- | --- |
| `sales-event-project` | `make test`, `make test-integration`, `make lint` |
| `operational-observability-platform` | `npm run check`, `npm run validate:observability`, `npm run smoke:observability` |
| `OptiFlow` | `npm test`, `npm run scenario:small` |

## Resumo rapido para novas sessoes

Use esta secao como ponto de retomada antes de escolher a proxima tarefa. O
backlog abaixo continua sendo a lista detalhada; este quadro mostra o progresso
ja auditado entre sessoes.

| Item | Estado | Evidencia atual | Proximo cuidado |
| --- | --- | --- | --- |
| P0.1 Convencoes compartilhadas de correlacao | Concluido | `docs/portfolio-correlation-conventions.md` define IDs, HTTP, RabbitMQ, logs, traces, metricas, eventos e jornadas. Os READMEs dos tres projetos apontam para esse contrato. | Manter o documento como fonte de verdade quando novos fluxos surgirem. |
| P0.2 Roteiro principal da narrativa | Documentado, pendente ensaio | `docs/portfolio-demo-runbook.md` define a narrativa executavel, comandos, fluxos e evidencias esperadas dos tres projetos. | Executar o roteiro completo em ambiente local reiniciado e registrar ajustes. |
| P1.2 Correlacao da jornada de venda | Em andamento avancado | `sales-event-project` gera/preserva `X-Request-ID`, `X-Correlation-ID` e `X-Transaction-ID` no `POST /sales`, propaga metadata no evento `SALE_CREATED` e registra campos em logs estruturados. | Validar propagacao completa por pagamento, outbox, ticket, email e check-in. |
| P1.3 Contexto por RabbitMQ | Concluido | `sales-event-project` injeta headers AMQP de correlacao, contexto W3C de trace e preserva metadados de negocio no consumo e em eventos derivados. Evidencia: `/Users/varnerdamasceno/github-varner/evidence/p1.3-rabbitmq-context-2026-09-11`. | Usar este contrato como base para a instrumentacao OpenTelemetry da P1.4. |
| P1.4 OpenTelemetry no `sales-event-project` | Concluido | API e worker exportam traces OTLP opcionais, propagam contexto por HTTP/RabbitMQ/outbox e possuem spans de negocio para venda, pagamento, outbox, ticket, email e check-in. Evidencia: `/Users/varnerdamasceno/github-varner/evidence/p1.4-opentelemetry-sales-2026-09-11`. | Usar os traces como base para P1.5/P1.7 e para a integracao P4.1 com dashboards da plataforma. |
| P1.5 Confiabilidade da publicacao RabbitMQ | Concluido | `sales-event-project` usa publisher confirms, `mandatory=true`, erro explicito para `nack`/mensagem nao roteavel e mantem retry/dead-letter da outbox. Verificacao: `make test` e `make test-integration` em 2026-09-12. | Criar cenarios controlados da P1.6 para demonstrar as falhas em ambiente local. |
| P2.1 PostgreSQL na plataforma operacional | Parcial | `operational-observability-platform` tem primeira migration, runner, camada PostgreSQL, `.env.example` e testes de migrations/config. | Confirmar health/e2e com estado real do PostgreSQL antes de fechar o item. |
| P2.2 IDs e logs na plataforma operacional | Em andamento avancado | Fastify gera/preserva IDs, devolve headers, adiciona `request_id`, `correlation_id` e `transaction_id` aos logs, com testes unitarios/e2e. | Incluir `trace_id` quando a instrumentacao OpenTelemetry da API entrar. |
| P3 OptiFlow deterministico | Parcial | Heuristica, metricas, cenario pequeno, cenario de vendas, metadata de execucao e testes existem. | Fechar formulacao matematica e iniciar benchmarks/solver. |

## Prioridade P0: contrato comum do portfolio

### P0.1 Definir convencoes compartilhadas de correlacao

- [x] Criar documento de convencoes com `correlation_id`, `request_id`,
  `transaction_id`, nomes de servicos, nomes de eventos e labels de metricas.
- [x] Registrar exemplos para HTTP, RabbitMQ, logs, traces e metricas.
- [x] Definir como uma venda do `sales-event-project` vira uma transacao
  rastreavel na `operational-observability-platform`.
- [x] Definir como uma execucao do `OptiFlow` deve expor identificadores e
  metricas.

Criterio de aceite:

- Existe um documento versionado com exemplos de payload, headers e labels.
- Os tres projetos conseguem adotar a convencao sem depender tecnicamente uns
  dos outros.

Verificacao:

- [x] Revisao manual do documento.
- [x] Links adicionados nos READMEs dos tres projetos ou em seus docs operacionais.

Status:

- Concluido. O contrato vive em
  [portfolio-correlation-conventions.md](portfolio-correlation-conventions.md).

### P0.2 Criar roteiro principal da narrativa

- [x] Documentar a historia demonstravel: funcionar, medir, comparar, explicar
  e otimizar.
- [x] Definir qual comando inicia cada projeto.
- [x] Definir qual fluxo sera apresentado em cada etapa da demonstracao.
- [x] Definir quais metricas, logs, traces e resultados serao mostrados.

Criterio de aceite:

- Uma pessoa consegue seguir o roteiro localmente sem conhecer o codigo.
- O roteiro deixa claro o papel independente de cada projeto.

Verificacao:

- Executar o roteiro em maquina limpa ou ambiente local reiniciado.
- Registrar os comandos e resultados esperados no documento.

Status:

- Documentado, pendente ensaio. O roteiro executavel existe em
  [portfolio-demo-runbook.md](portfolio-demo-runbook.md), mas ainda falta
  executar a demonstracao completa em ambiente local reiniciado.

## Prioridade P1: consolidar o `sales-event-project`

Objetivo: transformar o fluxo de venda em uma demonstracao robusta de sistema
assincrono confiavel.

### P1.1 Separar retry de notificacoes em worker proprio

- [ ] Criar processo, comando ou modo dedicado para retry de email.
- [ ] Manter o worker de vendas focado em processamento de eventos de venda.
- [ ] Garantir que o retry respeite backoff, limite de tentativas e
  `DEAD_LETTER`.
- [ ] Atualizar Docker Compose e documentacao de execucao.

Criterio de aceite:

- O retry pode ser iniciado, parado e observado separadamente.
- Uma falha persistente de email nao bloqueia o processamento principal de
  vendas e tickets.

Verificacao:

- Teste unitario para regras de retry e limite de tentativas.
- Teste de integracao ou smoke test simulando email falho e retry.
- `make test`
- `make test-integration`

### P1.2 Fortalecer correlacao da jornada de venda

- [ ] Gerar ou aceitar `correlation_id` no inicio do `POST /sales`.
- [ ] Propagar `correlation_id` por venda, pagamento, outbox, ticket, email e
  check-in.
- [ ] Persistir identificadores necessarios para investigacao historica.
- [ ] Incluir os identificadores nos logs estruturados.

Criterio de aceite:

- Uma venda pode ser investigada de ponta a ponta usando um unico identificador.
- Logs de API e worker possuem campos consistentes para a mesma jornada.

Verificacao:

- Testes unitarios para headers/payloads de correlacao.
- Teste de integracao validando propagacao do identificador.
- Consulta LogQL documentada filtrando uma venda pelo identificador.
- `make test`
- `make test-integration`

### P1.3 Propagar contexto por eventos RabbitMQ

- [x] Adicionar metadados de correlacao nas mensagens RabbitMQ.
- [x] Garantir que API, outbox publisher e worker preservem os metadados.
- [x] Documentar o envelope ou headers usados nas mensagens.

Criterio de aceite:

- Eventos `SALE_CREATED` e `SALE_COMPLETED` carregam contexto suficiente para
  correlacao externa.
- O worker registra logs com o mesmo contexto recebido.

Verificacao:

- Teste unitario para publish/consume com metadados.
- Teste de integracao verificando contexto do fluxo assincrono.
- `make test`
- `make test-integration`
- Smoke manual com logs correlacionados em
  `/Users/varnerdamasceno/github-varner/evidence/p1.3-rabbitmq-context-2026-09-11`.

### P1.4 Adicionar OpenTelemetry na API e no worker

- [x] Instrumentar HTTP server da API.
- [x] Instrumentar processamento de mensagens no worker.
- [x] Criar spans para venda, pagamento, outbox, emissao de ticket e email.
- [x] Configurar exportacao OTLP por variaveis de ambiente.
- [x] Manter o projeto executavel sem Collector quando OTLP estiver desativado.

Criterio de aceite:

- A jornada de uma venda aparece como trace distribuido quando o Collector esta
  disponivel.
- A aplicacao continua funcionando em ambiente local basico sem telemetria
  externa.

Verificacao:

- [x] Testes unitarios para configuracao de tracing.
- [x] Smoke test com Collector recebendo traces.
- [x] Evidencia no Tempo/Grafana em
  `/Users/varnerdamasceno/github-varner/evidence/p1.4-opentelemetry-sales-2026-09-11`.
- [x] `make test`
- [x] `make test-integration`

Status:

- Concluido. A execucao manual gerou venda aprovada, pagamento via webhook,
  emissao de ticket, envio de email em modo log e check-in, com trace
  distribuido salvo em `tempo-trace.json`.

### P1.5 Fortalecer confiabilidade da publicacao RabbitMQ

- [x] Avaliar uso de publisher confirms para publicacoes criticas.
- [x] Avaliar uso de `mandatory=true` ou estrategia equivalente para detectar
  mensagem sem rota.
- [x] Garantir que evento sem rota nao seja marcado como `PUBLISHED` na outbox.
- [x] Criar tratamento explicito para routing key desconhecida.
- [x] Documentar o comportamento esperado para falha de broker, fila ausente e
  publicacao sem binding.

Criterio de aceite:

- A outbox so marca evento como publicado quando houver confirmacao suficiente
  de entrega ao broker.
- Uma falha de roteamento vira retry ou `DEAD_LETTER`, nao sucesso silencioso.

Verificacao:

- [x] Testes unitarios para erro de publicacao e routing key desconhecida.
- [x] Teste de integracao ou smoke test com binding ausente.
- [x] `make test`
- [x] `make test-integration`

Status:

- Concluido. `sales-event-project` publica com `mandatory=true`, aguarda
  publisher confirms, trata `basic.return`/`nack` como erro e deixa a outbox em
  fluxo de retry/dead-letter quando a publicacao nao e confirmada. Verificado em
  2026-09-12 com `make test` e `make test-integration`.

### P1.6 Criar cenarios controlados de falha

- [ ] Criar script ou roteiro para pagamento duplicado.
- [ ] Criar script ou roteiro para consumidor atrasado.
- [ ] Criar script ou roteiro para falha persistente de email.
- [ ] Criar script ou roteiro para publicacao da outbox com retry.
- [ ] Registrar resultados esperados, metricas e logs de cada falha.

Criterio de aceite:

- Cada falha pode ser provocada de forma repetivel em ambiente local.
- Cada cenario mostra recuperacao, degradacao controlada ou estado final
  esperado.

Verificacao:

- Scripts documentados executados localmente.
- Evidencia em logs, metricas ou banco.
- `make test-integration` para o fluxo principal continuar estavel.

### P1.7 Preparar dashboard da jornada de negocio

- [ ] Criar painel de vendas criadas, pendentes, concluidas e falhas.
- [ ] Criar painel de pagamentos aprovados, recusados e duplicados.
- [ ] Criar painel de outbox por estado e tentativas.
- [ ] Criar painel de tickets emitidos, emails enviados e check-ins.
- [ ] Criar filtros por evento, status e janela de tempo.

Criterio de aceite:

- O dashboard permite explicar a jornada de venda sem consultar o codigo.
- O dashboard evidencia gargalos e falhas relevantes.

Verificacao:

- Dashboard provisionado no Grafana.
- Smoke manual apos gerar uma venda aprovada e uma falha.
- Screenshot ou roteiro de demonstracao documentado.

## Prioridade P2: observar o sistema real

Projeto principal: `operational-observability-platform`.

Objetivo: conectar a plataforma de observabilidade a um fluxo real antes de
expandir funcionalidades de produto.

### P2.1 Criar primeira migration e camada PostgreSQL

- [ ] Definir schema inicial para projetos, servicos e configuracoes
  operacionais.
- [ ] Criar runner de migration ou escolher ferramenta simples para migrations.
- [ ] Implementar camada de acesso ao PostgreSQL.
- [ ] Adicionar `.env.example` com variaveis necessarias.

Criterio de aceite:

- A aplicacao sobe localmente, aplica ou valida migrations e acessa o banco.
- O health check consegue informar estado basico da API e do PostgreSQL.

Verificacao:

- Testes unitarios para camada de acesso.
- Teste e2e cobrindo health com banco disponivel.
- `npm run check`

### P2.2 Implementar convencoes de logs e IDs

- [ ] Criar middleware para `request_id`.
- [ ] Aceitar `correlation_id` recebido por header.
- [ ] Emitir logs JSON com `trace_id`, `request_id` e `transaction_id` quando
  aplicavel.
- [ ] Documentar headers e campos de log.

Criterio de aceite:

- Toda requisicao HTTP tem identificador rastreavel.
- Logs da API permitem correlacao com trace e transacao.

Verificacao:

- Testes unitarios para middleware.
- Teste e2e validando headers de resposta.
- Consulta Loki documentada.
- `npm run check`

### P2.3 Criar API demonstradora instrumentada

- [ ] Criar fluxo HTTP que simule uma transacao operacional.
- [ ] Adicionar uma etapa assincrona demonstravel.
- [ ] Simular dependencia lenta ou indisponivel.
- [ ] Emitir metricas RED: rate, errors e duration.
- [ ] Exportar traces para o Collector.

Criterio de aceite:

- Uma unica requisicao gera metrica, log e trace correlacionados.
- O fluxo inclui sucesso, erro e latencia controlada.

Verificacao:

- Testes unitarios para handlers e simulacao.
- Teste e2e para sucesso e erro.
- `npm run check`
- `npm run smoke:observability`

### P2.4 Criar dashboards tecnicos e de negocio

- [ ] Criar dashboard tecnico por servico com throughput, erros e latencia.
- [ ] Criar dashboard de negocio com transacoes, sucesso, falha e degradacao.
- [ ] Adicionar filtros por servico, ambiente e periodo.
- [ ] Criar links do Grafana para traces no Tempo.
- [ ] Criar links de traces para logs no Loki.

Criterio de aceite:

- O dashboard permite sair de um aumento de erro para traces e logs relevantes.
- O dashboard mostra tanto sintomas tecnicos quanto impacto operacional.

Verificacao:

- Dashboards provisionados.
- `npm run validate:observability`
- `npm run smoke:observability`
- Roteiro manual de investigacao documentado.

### P2.5 Modelar SLO, SLI e error budget

- [ ] Criar tabelas de SLOs, SLIs e janelas de avaliacao.
- [ ] Criar API para cadastrar e consultar SLOs.
- [ ] Calcular disponibilidade simples.
- [ ] Calcular SLI de latencia.
- [ ] Calcular consumo e saldo de error budget.
- [ ] Expor estado do SLO por endpoint ou dashboard.

Criterio de aceite:

- Um servico demonstrador tem SLO configurado e estado calculado.
- Os calculos sao reproduziveis por testes.

Verificacao:

- Testes unitarios para disponibilidade, latencia e error budget.
- Teste e2e para cadastro e consulta de SLO.
- `npm run check`

### P2.6 Criar alertas baseados em sintomas

- [ ] Configurar regras Prometheus para erro alto.
- [ ] Configurar regras Prometheus para latencia alta.
- [ ] Configurar regra para consumo acelerado de error budget.
- [ ] Documentar severidade, causa provavel e primeira acao de resposta.
- [ ] Evitar alertas duplicados para o mesmo sintoma.

Criterio de aceite:

- Um erro controlado dispara alerta esperado.
- O alerta aponta para dashboard, trace ou runbook de investigacao.

Verificacao:

- Regras validadas no Prometheus.
- Smoke manual provocando erro ou latencia.
- Roteiro de incidente documentado.

### P2.7 Modelar incidentes e investigacao guiada

- [ ] Criar tabelas para incidentes, evidencias, hipoteses e linha do tempo.
- [ ] Criar API para abrir, atualizar e encerrar incidentes.
- [ ] Associar incidentes a alertas, servicos e SLOs afetados.
- [ ] Registrar evidencias com links para dashboard, trace e logs.
- [ ] Criar runbooks para erro alto, latencia alta e dependencia indisponivel.
- [ ] Registrar causa raiz e acoes preventivas no encerramento.

Criterio de aceite:

- Um alerta pode virar incidente investigavel dentro da plataforma.
- A investigacao preserva sintomas, evidencias, hipoteses e decisao final.

Verificacao:

- Testes unitarios para regras de estado do incidente.
- Teste e2e para abrir, atualizar e encerrar incidente.
- Roteiro manual de investigacao usando um alerta simulado.
- `npm run check`

## Prioridade P3: fortalecer o `OptiFlow`

Objetivo: sair de heuristica isolada para comparacao justificavel entre
estrategias.

### P3.1 Fechar formulacao matematica

- [ ] Documentar conjuntos, parametros, variaveis de decisao, funcao objetivo e
  restricoes.
- [ ] Explicar diferenca entre restricoes duras e penalidades.
- [ ] Mapear cada campo do JSON de cenario para a formulacao.
- [ ] Registrar limitacoes conhecidas da primeira versao.

Criterio de aceite:

- A formulacao permite implementar um solver sem ambiguidade.
- Um cenario pequeno pode ser resolvido manualmente ou conferido por tabela.

Verificacao:

- Revisao manual do documento.
- Exemplo calculado usando `data/scenarios/small-delivery.json`.
- `npm test`
- `npm run scenario:small`

### P3.2 Criar cenarios deterministicos de benchmark

- [ ] Adicionar cenario minimo com solucao obvia.
- [ ] Adicionar cenario com capacidade insuficiente.
- [ ] Adicionar cenario com janelas de tempo que geram atraso.
- [ ] Adicionar cenario com multiplos veiculos e trade-off de custo.
- [ ] Documentar resultado esperado de cada cenario.

Criterio de aceite:

- Cada cenario testa uma propriedade especifica do motor.
- Os resultados sao estaveis e reproduziveis.

Verificacao:

- Testes automatizados carregando todos os cenarios.
- `npm test`
- `npm run scenario:small`

### P3.3 Integrar solver para comparacao

- [ ] Escolher integracao com OR-Tools ou solver alternativo justificado.
- [ ] Implementar estrategia de solver com a mesma entrada da heuristica.
- [ ] Garantir timeout e resultado parcial ou erro controlado.
- [ ] Preservar saida comum de `RoutePlan`.

Criterio de aceite:

- A heuristica e o solver rodam sobre o mesmo cenario.
- O solver respeita capacidade e estrutura basica das rotas.
- Falhas de solver retornam erro explicavel.

Verificacao:

- Testes unitarios para adaptador do solver.
- Testes de comparacao em cenario pequeno.
- `npm test`
- `npm run scenario:small`

### P3.4 Comparar heuristica versus solver

- [ ] Criar funcao de comparacao entre planos.
- [ ] Calcular ganho de custo, distancia, atraso, pedidos atendidos e utilizacao.
- [ ] Criar script para rodar benchmark em cenarios versionados.
- [ ] Exibir resultado em formato legivel para portfolio.

Criterio de aceite:

- A comparacao mostra quando o solver melhora, empata ou piora metricas.
- A saida explica trade-offs em vez de apenas declarar um vencedor.

Verificacao:

- Testes unitarios para calculo de ganho e regressao de metricas.
- Snapshot ou fixture textual do benchmark.
- `npm test`

### P3.5 Implementar restricoes configuraveis

- [ ] Definir schema para habilitar restricoes por cenario.
- [ ] Implementar jornada maxima por veiculo.
- [ ] Implementar janela de tempo como restricao dura opcional.
- [ ] Implementar pedidos obrigatorios versus opcionais.
- [ ] Garantir mensagens de validacao claras para restricoes invalidas.

Criterio de aceite:

- O mesmo cenario pode ser executado com restricoes diferentes.
- O resultado mostra quais pedidos ficaram inviaveis e por que.

Verificacao:

- Testes de validacao de schema.
- Testes de rotas com restricoes ligadas e desligadas.
- `npm test`

### P3.6 Persistir cenarios, execucoes e resultados

- [ ] Escolher persistencia inicial alinhada ao backend futuro.
- [ ] Modelar `scenario`, `optimization_run`, `route_plan` e metricas.
- [ ] Registrar status, inicio, fim, estrategia, erro e duracao.
- [ ] Criar fixtures ou migrations iniciais.

Criterio de aceite:

- Uma execucao pode ser recuperada depois de concluida.
- O historico preserva entrada, estrategia usada e resultado.

Verificacao:

- Testes de repositorio ou integracao com banco local.
- Script demonstrando criar, executar e consultar historico.

### P3.7 Criar API de cenarios e execucoes

- [ ] Criar endpoint para criar cenario.
- [ ] Criar endpoint para validar cenario.
- [ ] Criar endpoint para iniciar execucao.
- [ ] Criar endpoint para consultar status e resultado.
- [ ] Padronizar erros de validacao.

Criterio de aceite:

- Um cliente HTTP consegue criar, validar, executar e consultar um cenario.
- A API nao bloqueia indefinidamente em execucoes longas.

Verificacao:

- Testes unitarios de handlers.
- Testes e2e do fluxo principal.
- Documentacao com exemplos `curl`.

### P3.8 Criar processamento assincrono de otimizacao

- [ ] Escolher fila ou mecanismo local inicial.
- [ ] Executar otimizacoes fora do request HTTP.
- [ ] Implementar status `QUEUED`, `RUNNING`, `SUCCEEDED` e `FAILED`.
- [ ] Implementar tentativas, timeout e limite de concorrencia.
- [ ] Registrar erro explicavel quando a execucao falhar.

Criterio de aceite:

- Uma execucao longa nao derruba nem bloqueia a API.
- Falhas sao persistidas e consultaveis.

Verificacao:

- Testes unitarios para maquina de estados.
- Teste de integracao com job bem-sucedido e job falho.

### P3.9 Preparar simulacao estatistica

- [ ] Definir variaveis incertas iniciais: tempo de viagem, demanda,
  cancelamento ou capacidade.
- [ ] Criar gerador sintetico com distribuicoes e parametros documentados.
- [ ] Implementar estatisticas descritivas por plano.
- [ ] Implementar Monte Carlo para avaliar plano fixo.
- [ ] Calcular media, mediana, P90/P95, pior caso observado e probabilidade de
  atraso.

Criterio de aceite:

- Um plano deterministico pode ser avaliado contra muitos cenarios amostrados.
- As premissas estatisticas ficam explicitas no resultado.

Verificacao:

- Testes unitarios com semente fixa.
- Testes de percentis e estatisticas descritivas.
- Script de simulacao reproduzivel.

### P3.10 Avaliar decisao orientada a risco com CVaR

- [ ] Definir metrica de risco inicial para custo, atraso ou pedidos nao
  atendidos.
- [ ] Implementar calculo de VaR e CVaR sobre resultados simulados.
- [ ] Comparar decisao por menor custo medio versus decisao por risco.
- [ ] Documentar quando uma solucao mais cara pode ser operacionalmente melhor.

Criterio de aceite:

- O `OptiFlow` consegue explicar uma recomendacao usando media e risco.
- O resultado mostra o trade-off entre eficiencia esperada e pior caso
  plausivel.

Verificacao:

- Testes unitarios para VaR e CVaR com dataset pequeno conhecido.
- Teste de comparacao entre duas estrategias simuladas.
- Script de simulacao reproduzivel.
- `npm test`

### P3.11 Criar interface para editar e comparar cenarios

- [ ] Definir experiencia principal para criar, editar e duplicar cenarios.
- [ ] Criar tela ou prototipo funcional para visualizar entradas do cenario.
- [ ] Exibir status de execucao e resultado do plano.
- [ ] Exibir comparacao entre heuristica e solver.
- [ ] Destacar custo, distancia, atraso, pedidos atendidos e utilizacao.

Criterio de aceite:

- Uma pessoa consegue entender e comparar dois cenarios sem ler JSON bruto.
- A interface mostra claramente entradas, resultado e trade-offs.

Verificacao:

- Testes de componentes ou fluxo principal da interface.
- Smoke manual criando ou carregando cenario e comparando resultados.
- Screenshot ou roteiro de demonstracao documentado.

### P3.12 Preparar Docker, CI e demonstracao do `OptiFlow`

- [ ] Criar Dockerfile ou Compose local para API, worker e banco quando essas
  camadas existirem.
- [ ] Configurar CI com testes e checks do projeto.
- [ ] Adicionar comando unico de demonstracao local.
- [ ] Documentar variaveis de ambiente, portas e problemas conhecidos.
- [ ] Garantir que a demo rode sem depender dos outros repositorios.

Criterio de aceite:

- O `OptiFlow` pode ser executado e validado por outra pessoa como projeto
  independente.
- O CI verifica o nucleo de otimizacao e os fluxos principais adicionados.

Verificacao:

- `npm test`
- `npm run scenario:small`
- Execucao local via Docker quando disponivel.
- Ultima execucao verde do CI.

## Prioridade P4: integracao entre os projetos

Objetivo: mostrar a narrativa completa sem transformar os repositorios em um
monolito.

### P4.1 Conectar traces do `sales-event-project` na plataforma

- [ ] Configurar `sales-event-project` para exportar OTLP para o Collector da
  plataforma.
- [ ] Garantir nomes de servico distintos para API e worker.
- [ ] Preservar correlacao entre HTTP, RabbitMQ e worker.
- [ ] Documentar setup local com os dois repositorios.

Criterio de aceite:

- Uma venda real aparece no Tempo/Grafana com spans de API e worker.
- Logs e metricas podem ser filtrados pelo mesmo identificador.

Verificacao:

- `make test-integration` no `sales-event-project`.
- `npm run smoke:observability` na plataforma.
- Roteiro manual com evidencia no Grafana.

### P4.2 Criar dashboard da jornada de venda na plataforma

- [ ] Criar dashboard consolidado para venda, pagamento, outbox, ticket, email e
  check-in.
- [ ] Adicionar links para logs e traces.
- [ ] Adicionar paineis para falhas controladas.
- [ ] Documentar investigacao de uma venda com problema.

Criterio de aceite:

- O dashboard permite responder onde a venda parou e qual sintoma ocorreu.
- O roteiro de incidente usa metricas, logs e traces.

Verificacao:

- Smoke manual com venda aprovada.
- Smoke manual com falha de email ou pagamento duplicado.
- Evidencia documentada no roteiro de demo.

### P4.3 Gerar dados do `sales-event-project` para o `OptiFlow`

- [ ] Definir formato de exportacao de pedidos ou historico operacional.
- [ ] Criar script de exportacao no `sales-event-project` ou fixture
  compartilhavel.
- [ ] Criar importador no `OptiFlow` para transformar dados em `Scenario`.
- [ ] Validar o cenario importado com o validador existente.

Criterio de aceite:

- Dados de vendas/pedidos podem virar um cenario reproduzivel no `OptiFlow`.
- O importador falha com mensagens claras quando o dado de origem estiver
  incompleto.

Verificacao:

- Teste unitario do mapeamento.
- Fixture de exportacao versionada.
- `npm test`
- `npm run scenario:small` ou script equivalente do cenario importado.

### P4.4 Expor metricas de execucao do `OptiFlow`

- [ ] Definir metricas de otimizacao: duracao, status, estrategia, custo,
  atraso, distancia e pedidos nao alocados.
- [ ] Expor metricas Prometheus ou OTLP.
- [ ] Incluir `optimization_run_id` e `correlation_id` nos logs.
- [ ] Criar painel inicial na plataforma.

Criterio de aceite:

- Uma execucao do `OptiFlow` pode ser observada como operacao.
- O resultado da otimizacao aparece junto de metricas tecnicas de execucao.

Verificacao:

- Testes de serializacao/exportacao de metricas.
- Smoke manual consultando metricas ou visualizando no Grafana.
- `npm test`

## Prioridade P5: entrega de portfolio

Objetivo: tornar os tres projetos demonstraveis por outra pessoa.

### P5.1 Criar documentacao final de execucao local

- [ ] Criar guia de setup por projeto.
- [ ] Criar guia de demonstracao integrada.
- [ ] Documentar portas, variaveis, comandos e problemas conhecidos.
- [ ] Indicar tempo esperado de subida da stack.

Criterio de aceite:

- Uma pessoa consegue rodar cada projeto isoladamente.
- Uma pessoa consegue rodar a demonstracao integrada seguindo o guia.

Verificacao:

- Execucao do guia em ambiente local reiniciado.
- Comandos base dos tres projetos passando.

### P5.2 Criar diagramas finais

- [ ] Criar diagrama de arquitetura por projeto.
- [ ] Criar diagrama da jornada de venda observavel.
- [ ] Criar diagrama de dados entre venda, observabilidade e otimizacao.
- [ ] Criar diagrama do fluxo de execucao do `OptiFlow`.

Criterio de aceite:

- Os diagramas explicam responsabilidades sem exigir leitura do codigo.
- Os diagramas estao linkados nos READMEs ou docs principais.

Verificacao:

- Revisao manual dos diagramas.
- Renderizacao local quando usar Mermaid ou ferramenta equivalente.

### P5.3 Criar roteiro de demo gravavel

- [ ] Escrever roteiro de 5 a 10 minutos.
- [ ] Incluir uma venda bem-sucedida.
- [ ] Incluir uma falha investigada com observabilidade.
- [ ] Incluir uma comparacao de otimizacao no `OptiFlow`.
- [ ] Incluir conclusao sobre decisoes melhores a partir dos dados.

Criterio de aceite:

- O roteiro demonstra competencias de backend, observabilidade e decisao
  operacional.
- Cada passo tem comando, tela ou evidencia esperada.

Verificacao:

- Ensaio local completo.
- Ajustes registrados apos o primeiro ensaio.

### P5.4 Preparar CI e badges consistentes

- [ ] Garantir CI do `sales-event-project`.
- [ ] Garantir CI da `operational-observability-platform`.
- [ ] Garantir CI do `OptiFlow`.
- [ ] Adicionar badges apenas quando refletirem checks reais.
- [ ] Padronizar comandos de qualidade nos READMEs.

Criterio de aceite:

- Cada repositorio tem validacao automatica minima.
- O README nao promete qualidade que o CI nao verifica.

Verificacao:

- Ultima execucao verde nos tres repositorios.
- Links dos workflows nos READMEs ou na pagina do repositorio.

## Ordem recomendada de ataque

1. P0.1 e P0.2 para fechar a linguagem comum do portfolio.
2. P1.2 e P1.3 antes de OpenTelemetry, porque tracing sem correlacao clara fica
   fragil.
3. P1.4 a P1.7 para consolidar a demonstracao de negocio real.
4. P2.1 a P2.4 para observar o fluxo real com metricas, logs e traces.
5. P2.5 a P2.7 para transformar observacao em SLO, alerta e investigacao.
6. P3.1 a P3.4 para provar valor do `OptiFlow` com comparacao mensuravel.
7. P3.5 a P3.12 para evoluir restricoes, persistencia, API, simulacao,
   interface e entrega independente.
8. P4.1 a P4.4 para costurar a narrativa entre repositorios.
9. P5.1 a P5.4 para transformar tudo em material de portfolio.
