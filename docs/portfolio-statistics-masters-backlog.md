# Backlog Estatistico do Portfolio para Mestrado

Este backlog e a proxima fase dos tres projetos do portfolio com foco em
preparacao para um mestrado em Estatistica. O objetivo nao e apenas adicionar
calculos matematicos. O objetivo e demonstrar pensamento estatistico aplicado:
formular perguntas, definir estimandos, coletar dados com vieses conhecidos,
modelar incerteza, validar previsoes, quantificar risco e tomar decisoes
explicaveis.

O documento fica centralizado no `OptiFlow`, mas as entregas envolvem os tres
repositorios:

- `sales-event-project`: sistema gerador de dados observacionais sobre demanda,
  funil, pagamento, estoque, retries, emails e check-ins.
- `operational-observability-platform`: laboratorio de confiabilidade,
  series temporais, SLOs, burn rate, anomalias e investigacao quantitativa.
- `OptiFlow`: camada de simulacao, decisao estatistica, incerteza propagada e
  comparacao de estrategias.

## Tese de Portfolio

Mensagem central da nova fase:

```text
eventos operacionais -> dados estatisticos -> incerteza quantificada ->
previsao e confiabilidade -> decisao sob risco -> validacao empirica
```

O portfolio deve mostrar que voce nao esta apenas construindo sistemas; voce
esta criando um ambiente onde sistemas geram dados, dados sustentam inferencia,
e inferencia melhora decisoes.

## Diagnostico Atual

### `sales-event-project`

O projeto ja simula uma operacao real de venda: API, RabbitMQ, PostgreSQL,
pagamento, outbox, retry, email e check-in. Ele e uma boa fonte de dados
observacionais. Hoje, porem, os dados ainda sao usados principalmente para
auditoria operacional e export deterministico para o `OptiFlow`.

Oportunidade estatistica:

- transformar eventos transacionais em dataset analitico;
- modelar funil de conversao com incerteza;
- estimar tempo ate pagamento, email e check-in;
- prever demanda por janela e tipo de ticket;
- calcular risco de estoque e risco de retry/dead-letter;
- tratar vieses, censura e baixa amostra explicitamente.

### `operational-observability-platform`

A plataforma ja tem SLOs, error budget, dashboards, incidentes e alertas. Hoje
o calculo e correto, mas ainda basico: proporcoes simples, janelas manuais e
limiares demonstrativos.

Oportunidade estatistica:

- estimar SLOs em janelas rolantes com incerteza;
- usar burn rate multi-janela como estatistica sequencial;
- modelar latencia como distribuicao, nao apenas media;
- detectar anomalias por controle estatistico de processo;
- atualizar confianca em hipoteses de incidente com evidencias;
- separar ruido, degradacao sustentada e mudanca estrutural.

### `OptiFlow`

O `OptiFlow` ja possui otimizacao deterministica, comparacao de estrategias,
simulacao Monte Carlo e VaR/CVaR. Para um mestrado em Estatistica, ele deve
deixar claro que a otimizacao e a etapa final de um processo estatistico:
modelos calibrados, incerteza propagada, comparacao com intervalos, validacao
fora da amostra e decisao com funcao de perda explicita.

Oportunidade estatistica:

- calibrar distribuicoes com dados vindos do Sales;
- reportar erro padrao e convergencia de simulacoes;
- comparar estrategias com intervalos de confianca;
- fazer backtesting de previsoes e decisoes;
- usar posterior predictive checks ou bootstrap;
- explicar decisoes em termos de perda esperada e risco de cauda.

## Definicao de Pronto Estatistica

Uma atividade deste backlog so deve ser marcada como concluida quando entregar:

- pergunta estatistica clara;
- estimando definido, por exemplo proporcao, taxa, media, quantil, hazard,
  burn rate, CVaR ou perda esperada;
- dados de entrada e populacao-alvo descritos;
- vieses e limitacoes documentados;
- implementacao executavel no repositorio correto;
- teste automatizado com dataset pequeno e resultado esperado;
- evidencia local com comando, resultado e interpretacao;
- quando aplicavel, intervalo de confianca, posterior, erro padrao, bootstrap,
  convergencia ou analise de sensibilidade.

## S0: Fundacao de Pesquisa Estatistica

Objetivo: transformar os tres projetos em um ambiente de estudo estatistico
reprodutivel.

### S0.1 Definir perguntas de pesquisa do portfolio

Projetos: todos.

- [x] Escrever 5 a 8 perguntas estatisticas centrais.
- [x] Separar perguntas descritivas, preditivas, causais e decisorias.
- [x] Definir estimando, unidade experimental e janela temporal de cada
  pergunta.
- [x] Mapear qual projeto gera, calcula ou consome cada resposta.

Documento de referencia:

- [Perguntas Estatisticas do Portfolio](portfolio-statistical-research-questions.md).

Exemplos de perguntas:

- Qual a probabilidade de uma venda aceita virar check-in?
- Quanto tempo uma venda leva para sair de aceita para concluida?
- Qual a chance de esgotar um tipo de ticket antes do evento?
- O SLO esta realmente degradado ou a janela tem pouca amostra?
- Qual estrategia reduz CVaR sem aumentar demais o custo esperado?

Criterio de aceite:

- Cada futura entrega estatistica aponta para uma pergunta, nao apenas para uma
  metrica solta.

Verificacao:

- [x] Documento com tabela: pergunta, estimando, dados, metodo, projeto e
  evidencia esperada.

### S0.2 Criar dicionario estatistico compartilhado

Projetos: todos.

- [x] Definir unidades: tempo, dinheiro, distancia, demanda, capacidade,
  probabilidade, taxa, quantil e custo.
- [x] Padronizar termos: evento, janela, coorte, amostra, censura, funil,
  atraso, falha, SLO, burn rate, risco e perda.
- [x] Definir regras de arredondamento e precisao numerica.
- [x] Separar labels de baixa cardinalidade de dimensoes analiticas.

Documento de referencia:

- [Dicionario Estatistico Compartilhado](portfolio-statistical-dictionary.md).

Criterio de aceite:

- Sales, plataforma e `OptiFlow` falam a mesma lingua estatistica.

Verificacao:

- [x] Documento versionado com exemplos e pelo menos uma fixture compartilhada.

### S0.3 Criar formato de estudo reprodutivel

Projetos: todos, centralizado no `OptiFlow`.

- [x] Definir arquivo de estudo com: pergunta, dataset, periodo, filtros,
  modelo, parametros, seed, resultado e conclusao.
- [x] Registrar `git sha` dos tres repositorios usados.
- [x] Guardar evidencias em diretorios versionados por data.
- [x] Incluir template para relatorio curto de analise.

Documentos de referencia:

- [Formato de Estudo Estatistico Reprodutivel](portfolio-reproducible-study-format.md).
- [Template de Estudo Estatistico](templates/statistical-study-template.md).
- [Primeiro estudo reprodutivel](../studies/statistics/2026-09-22-foundation-fixture/study.md).

Criterio de aceite:

- Uma conclusao estatistica pode ser reexecutada por outra pessoa.

Verificacao:

- [x] Primeiro estudo pequeno com dataset fixture e resultado reproduzivel.

## S1: Dados Estatisticos no `sales-event-project`

Objetivo: fazer do Sales a fonte de dados observacionais do portfolio.

### S1.1 Criar export analitico de eventos e janelas

Projeto: `sales-event-project`.

- [x] Criar `cmd/analytics-export` ou evoluir o export atual.
- [x] Exportar eventos individuais com timestamps normalizados.
- [x] Exportar agregados por janela: 1 min, 5 min, 1 h e 1 dia.
- [x] Incluir contagens por status de venda, pagamento, outbox, email e
  check-in.
- [x] Versionar schema `sales-analytics-export.v1`.

Artefatos de referencia no `sales-event-project`:

- `cmd/analytics-export`
- `internal/analytics`
- `docs/analytics-export.md`
- `tests/fixtures/sales-analytics-export.v1.json`

Pergunta estatistica:

- Qual foi a taxa de chegada e conversao em cada janela?

Criterio de aceite:

- O projeto produz dataset pronto para analise, nao apenas registros
  transacionais.

Verificacao:

- [x] Teste com banco pequeno e contagens esperadas.
- [x] Fixture JSON com duas ou mais janelas.

### S1.2 Modelar funil de conversao com incerteza

Projeto: `sales-event-project`.

- [x] Calcular conversoes condicionais:
  aceita -> pendente -> paga -> ticket emitido -> check-in.
- [x] Calcular intervalo de confianca para proporcoes.
- [x] Implementar alternativa Bayesiana simples com prior Beta.
- [x] Separar resultado por evento, ticket, provider e janela.

Artefatos de referencia no `sales-event-project`:

- `internal/analytics/funnel.go`
- `internal/analytics/funnel_test.go`
- `docs/funnel-conversion.md`
- campo `funnels` no export `sales-analytics-export.v1`

Pergunta estatistica:

- Qual a probabilidade de uma venda aceita virar demanda realizada?

Criterio de aceite:

- O funil informa incerteza, nao apenas percentual pontual.

Verificacao:

- [x] Testes com contagens pequenas, incluindo zero eventos.
- [x] Documento explicando binomial/Beta-Binomial em linguagem simples.

### S1.3 Medir tempo ate eventos com analise de sobrevivencia

Projeto: `sales-event-project`.

- [x] Calcular tempo ate pagamento.
- [x] Calcular tempo ate email enviado.
- [x] Calcular tempo ate check-in.
- [x] Tratar vendas ainda nao concluidas como observacoes censuradas.
- [x] Produzir curva simples de sobrevivencia ou tabela de hazard por faixa.

Artefatos de referencia no `sales-event-project`:

- `internal/analytics/survival.go`
- `internal/analytics/survival_test.go`
- `docs/survival-analysis.md`
- campo `survivalAnalyses` no export `sales-analytics-export.v1`

Pergunta estatistica:

- Quanto tempo normalmente leva para uma venda avancar de etapa?

Criterio de aceite:

- O sistema distingue "ainda nao aconteceu" de "nunca acontecera".

Verificacao:

- [x] Teste com observacoes completas e censuradas.
- [x] Relatorio com mediana ou percentis de tempo ate evento.

### S1.4 Prever demanda por janela e tipo de ticket

Projeto: `sales-event-project`.

- [ ] Criar serie temporal de vendas por ticket.
- [ ] Implementar baseline ingenuo: media movel ou sazonal simples.
- [ ] Medir erro com MAE e RMSE.
- [ ] Separar treino/teste por tempo, sem embaralhar.

Pergunta estatistica:

- Quanta demanda esperamos na proxima janela?

Criterio de aceite:

- Existe uma previsao baseline com erro medido fora da amostra.

Verificacao:

- [ ] Teste com serie sintetica conhecida.
- [ ] Comando gerando previsao e metricas de erro.

### S1.5 Estimar risco de esgotamento de estoque

Projeto: `sales-event-project`.

- [ ] Combinar estoque atual, taxa de venda e incerteza da demanda.
- [ ] Calcular probabilidade de esgotar antes de um horizonte.
- [ ] Reportar intervalo ou distribuicao de tempo ate esgotamento.
- [ ] Expor JSON ou metrica para dashboard.

Pergunta estatistica:

- Qual a probabilidade de um ticket esgotar antes do evento?

Criterio de aceite:

- Estoque passa a ser tratado como risco probabilistico.

Verificacao:

- [ ] Teste com consumo constante e com consumo variavel.
- [ ] Roteiro local mostrando mudanca de risco apos novas vendas.

### S1.6 Exportar priors para simulacao do `OptiFlow`

Projetos: `sales-event-project`, `OptiFlow`.

- [ ] Exportar probabilidade de conversao por etapa.
- [ ] Exportar distribuicao empirica ou parametros de demanda por janela.
- [ ] Exportar incerteza de tempo operacional quando disponivel.
- [ ] Criar fixture consumida pelo `OptiFlow`.

Pergunta estatistica:

- Quais parametros de incerteza o historico operacional justifica?

Criterio de aceite:

- O `OptiFlow` consegue simular usando parametros estimados, nao apenas
  constantes manuais.

Verificacao:

- [ ] Teste de compatibilidade Sales -> OptiFlow.

## S2: Confiabilidade Estatistica na Plataforma

Objetivo: fazer da plataforma o lugar onde saude operacional e inferencia se
encontram.

### S2.1 Avaliar SLOs com janelas rolantes

Projeto: `operational-observability-platform`.

- [x] Conectar SLOs a fixtures temporais reproduziveis.
- [x] Suportar leitura historica de janelas rolantes avaliadas.
- [x] Calcular disponibilidade e latencia por janela.
- [x] Persistir fonte, consulta e periodo usado.

Entrega implementada:

- `operational-observability-platform` adiciona
  `GET /slos/:sloId/rolling-windows?limit=<n>` para consultar as ultimas
  janelas avaliadas por SLI em ordem cronologica.
- Cada janela retorna origem reproduzivel (`manual`, `fixture` ou `prometheus`),
  consulta/referencia e periodo usado.
- O resumo por SLI inclui media observada, pior percentual observado, maior
  consumo de error budget, janelas violadas, janelas sem dados e contagens
  acumuladas.

Pergunta estatistica:

- O servico cumpriu o objetivo na janela relevante?

Criterio de aceite:

- A avaliacao de SLO deixa de depender apenas de contagens manuais anonimas e
  passa a preservar a fonte reproduzivel das janelas avaliadas.

Verificacao:

- [x] Teste e2e com serie pequena de fixtures temporais e duas janelas
  consecutivas.

### S2.2 Implementar burn rate multi-janela

Projeto: `operational-observability-platform`.

- [ ] Calcular burn rate curto e longo.
- [ ] Definir severidade por combinacao de janelas.
- [ ] Documentar interpretacao estatistica do alerta.
- [ ] Atualizar dashboard e regra Prometheus ou avaliacao interna.

Pergunta estatistica:

- Estamos consumindo o error budget rapido demais para o horizonte do SLO?

Criterio de aceite:

- Alerta passa a representar velocidade de degradacao, nao apenas violacao
  acumulada.

Verificacao:

- [ ] Testes com degradacao curta, lenta e sustentada.

### S2.3 Modelar latencia como distribuicao

Projeto: `operational-observability-platform`.

- [ ] Migrar metricas de duracao para histogramas Prometheus.
- [ ] Calcular p50, p90, p95 e p99.
- [ ] Comparar media versus quantis.
- [ ] Atualizar dashboards de latencia.

Pergunta estatistica:

- A experiencia de cauda piorou mesmo quando a media parece aceitavel?

Criterio de aceite:

- A plataforma consegue detectar cauda de latencia.

Verificacao:

- [ ] Smoke com trafego lento afetando p95.

### S2.4 Adicionar controle estatistico de processo

Projeto: `operational-observability-platform`.

- [ ] Implementar EWMA ou CUSUM para erro/latencia.
- [ ] Definir baseline e limites de controle.
- [ ] Diferenciar pico isolado de mudanca sustentada.
- [ ] Registrar anomalias como evidencias de incidente.

Pergunta estatistica:

- Uma metrica fugiu do comportamento esperado?

Criterio de aceite:

- Alertas conseguem apontar anomalia relativa ao historico, nao so ao limiar.

Verificacao:

- [ ] Teste com serie normal, spike e mudanca de nivel.

### S2.5 Atualizar confianca em hipoteses de incidente

Projeto: `operational-observability-platform`.

- [ ] Adicionar score numerico de confianca para hipoteses.
- [ ] Definir como evidencia aumenta ou reduz confianca.
- [ ] Registrar historico de mudanca de confianca.
- [ ] Exibir hipotese mais provavel e incerteza restante.

Pergunta estatistica:

- Qual causa e mais plausivel dado o conjunto de evidencias?

Criterio de aceite:

- Investigacao passa a explicitar incerteza, nao apenas notas textuais.

Verificacao:

- [ ] Teste com evidencias que mudam o ranking de hipoteses.

### S2.6 Prever risco operacional proximo

Projeto: `operational-observability-platform`.

- [ ] Prever probabilidade de violar SLO na proxima janela.
- [ ] Usar baseline simples antes de modelo sofisticado.
- [ ] Medir calibracao: quando o modelo diz 70%, acontece perto disso?
- [ ] Registrar falsos positivos e falsos negativos.

Pergunta estatistica:

- Qual o risco de violacao antes que o SLO seja quebrado?

Criterio de aceite:

- A plataforma tem previsao avaliavel, nao apenas alerta reativo.

Verificacao:

- [ ] Backtest com historico sintetico e metricas de calibracao.

## S3: Decisao Estatistica no `OptiFlow`

Objetivo: transformar o `OptiFlow` em camada de decisao sob incerteza, nao
apenas motor de rota.

### S3.1 Calibrar simulacao com priors do Sales

Projetos: `sales-event-project`, `OptiFlow`.

- [ ] Importar priors de conversao, demanda e cancelamento.
- [ ] Substituir parametros sinteticos por parametros estimados quando
  disponiveis.
- [ ] Registrar origem, periodo e tamanho da amostra.
- [ ] Manter modo sintetico para demo sem historico.

Pergunta estatistica:

- Como a incerteza historica muda a distribuicao de custo do plano?

Criterio de aceite:

- Simulacao passa a ser calibrada por dados observados.

Verificacao:

- [ ] Fixture com priors e resultado reproduzivel.

### S3.2 Medir erro Monte Carlo e convergencia

Projeto: `OptiFlow`.

- [ ] Reportar erro padrao da media simulada.
- [ ] Reportar intervalo de confianca para custo esperado.
- [ ] Medir estabilidade de quantis conforme numero de iteracoes.
- [ ] Avisar quando amostra for insuficiente para conclusao.

Pergunta estatistica:

- O resultado da simulacao e estavel o bastante para sustentar decisao?

Criterio de aceite:

- A saida nao mostra apenas media/P95; mostra incerteza da estimativa.

Verificacao:

- [ ] Testes com seed fixa e valores esperados.

### S3.3 Comparar estrategias com inferencia

Projeto: `OptiFlow`.

- [ ] Usar amostras pareadas para comparar estrategias sob os mesmos cenarios.
- [ ] Calcular intervalo de confianca para delta de custo.
- [ ] Aplicar bootstrap para CVaR ou quantis.
- [ ] Reportar tamanho de efeito.

Pergunta estatistica:

- A estrategia candidata e realmente melhor ou a diferenca pode ser ruido?

Criterio de aceite:

- Comparacao de estrategias inclui incerteza e conclusao cautelosa.

Verificacao:

- [ ] Relatorio `scenario:compare:inference` com delta, intervalo e conclusao.

### S3.4 Formalizar funcao de perda de decisao

Projeto: `OptiFlow`.

- [ ] Definir perda por custo, atraso, demanda nao atendida, risco e violacao
  de SLO.
- [ ] Permitir perfis de decisor: conservador, balanceado e agressivo.
- [ ] Mostrar perda esperada e risco de cauda por estrategia.
- [ ] Documentar diferenca entre metrica observada e funcao de decisao.

Pergunta estatistica:

- Qual decisao minimiza perda esperada para um perfil de risco dado?

Criterio de aceite:

- O projeto explicita preferencias, em vez de esconder tudo em pesos arbitrarios.

Verificacao:

- [ ] Cenario onde perfis diferentes escolhem estrategias diferentes.

### S3.5 Fazer backtesting de previsoes e decisoes

Projeto: `OptiFlow`.

- [ ] Separar periodos de treino e teste em datasets historicos.
- [ ] Gerar plano com informacao disponivel ate `t`.
- [ ] Avaliar resultado contra eventos posteriores.
- [ ] Medir erro de previsao e arrependimento de decisao.

Pergunta estatistica:

- Se tivessemos usado o modelo antes, ele teria ajudado?

Criterio de aceite:

- O portfolio mostra validacao fora da amostra.

Verificacao:

- [ ] Backtest pequeno com fixture temporal.

### S3.6 Sensibilidade e robustez de conclusoes

Projeto: `OptiFlow`.

- [ ] Variar priors, penalidades e distribuicoes.
- [ ] Medir quando a recomendacao muda.
- [ ] Identificar parametros mais influentes.
- [ ] Reportar conclusoes robustas e fragilidades.

Pergunta estatistica:

- A decisao depende demais de uma premissa?

Criterio de aceite:

- Recomendacao inclui analise de sensibilidade.

Verificacao:

- [ ] Relatorio com tornado chart textual ou tabela de sensibilidade.

## S4: Estudos Integrados nos Tres Projetos

Objetivo: criar estudos que parecam trabalho de mestrado aplicado, nao apenas
features isoladas.

### S4.1 Estudo de funil e planejamento

Projetos: todos.

- [ ] Sales estima funil e demanda.
- [ ] Plataforma confirma qualidade e completude dos sinais.
- [ ] OptiFlow usa a distribuicao estimada para simular planos.
- [ ] Relatorio compara plano deterministico versus plano sob incerteza.

Pergunta estatistica:

- Incorporar incerteza de conversao muda a decisao operacional?

Verificacao:

- [ ] Estudo reproduzivel em `evidence/`.

### S4.2 Estudo de confiabilidade e decisao

Projetos: `operational-observability-platform`, `OptiFlow`.

- [ ] Plataforma detecta burn rate ou cauda de latencia.
- [ ] OptiFlow traduz risco em funcao de perda ou restricao.
- [ ] Comparar plano anterior e plano recomendado.

Pergunta estatistica:

- Um sinal de confiabilidade deve mudar a decisao de alocacao?

Verificacao:

- [ ] Demo controlada com SLO degradado e decisao alterada.

### S4.3 Estudo de estoque e risco

Projetos: `sales-event-project`, `OptiFlow`.

- [ ] Sales estima risco de esgotamento por ticket.
- [ ] OptiFlow prioriza demandas ou recursos com base nesse risco.
- [ ] Relatorio mede trade-off entre custo e reducao de risco.

Pergunta estatistica:

- Quanto custa reduzir a probabilidade de esgotamento?

Verificacao:

- [ ] Cenario com delta de risco e delta de custo.

### S4.4 Estudo quase-experimental

Projetos: todos.

- [ ] Definir uma intervencao simulada: novo provider, novo retry, nova regra de
  fila ou nova estrategia do `OptiFlow`.
- [ ] Comparar antes/depois com controle sintetico ou diferencas simples quando
  cabivel.
- [ ] Documentar ameacas a validade: sazonalidade, baixa amostra, confundidores
  e selecao.

Pergunta estatistica:

- A intervencao parece melhorar a metrica ou apenas coincidiu com outro fator?

Verificacao:

- [ ] Relatorio com cautelas, nao apenas conclusao positiva.

## S5: Comunicacao e Rigor de Mestrado

Objetivo: empacotar a profundidade estatistica de forma defensavel.

### S5.1 Criar golden datasets estatisticos

Projetos: todos.

- [ ] Dataset de funil com proporcoes conhecidas.
- [ ] Dataset de sobrevivencia com censura conhecida.
- [ ] Dataset de SLO/burn rate com janelas conhecidas.
- [ ] Dataset de simulacao com seed e resultado esperado.

Criterio de aceite:

- Cada formula importante tem exemplo pequeno auditavel.

Verificacao:

- [ ] Testes automatizados nos tres repositorios.

### S5.2 Criar relatorio tecnico de estatistica aplicada

Projetos: todos, centralizado no `OptiFlow`.

- [ ] Escrever problema, dados, metodo, resultados, limitacoes e proximos
  passos.
- [ ] Incluir formulas essenciais.
- [ ] Incluir interpretacao operacional.
- [ ] Separar claramente inferencia, previsao e decisao.

Criterio de aceite:

- O portfolio comunica maturidade estatistica, nao apenas engenharia.

Verificacao:

- [ ] Revisao manual do relatorio.
- [ ] Links para datasets, scripts, evidencia e CI.

### S5.3 Criar roteiro gravavel da trilha estatistica

Projetos: todos.

- [ ] Cena 1: Sales gera dataset e funil com incerteza.
- [ ] Cena 2: Plataforma calcula SLO, burn rate ou anomalia.
- [ ] Cena 3: OptiFlow simula decisao com priors calibrados.
- [ ] Cena 4: Resultado mostra intervalo, risco e trade-off.

Criterio de aceite:

- A demo parece uma defesa curta de projeto estatistico aplicado.

Verificacao:

- [ ] Ensaio local.
- [ ] Evidencias em `evidence/`.

## Primeira Sequencia Recomendada

Para alinhar com foco de mestrado em Estatistica, a ordem mais forte e:

1. S0.1, S0.2 e S0.3: perguntas, dicionario e estudo reprodutivel.
2. S1.1, S1.2 e S1.3: transformar Sales em dataset estatistico.
3. S2.1 e S2.2: confiabilidade com janelas e burn rate.
4. S3.1, S3.2 e S3.3: simulacao calibrada e comparacao inferencial.
5. S4.1: primeiro estudo integrado dos tres projetos.
6. S5.2 e S5.3: relatorio e demo com linguagem de mestrado.

Essa ordem cria uma progressao coerente:

```text
pergunta -> dado -> estimacao -> incerteza -> previsao -> decisao -> validacao
```
