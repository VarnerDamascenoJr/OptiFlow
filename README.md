# OptiFlow

Motor de otimizacao operacional para comparar cenarios de distribuicao e alocacao, equilibrando custo, tempo e distancia sob restricoes configuraveis.

> Status: MVP deterministico iniciado. O primeiro dominio confirmado e distribuicao de entregas, com uma heuristica de referencia implementada para comparar contra solver em uma etapa posterior.

## Objetivo

Construir uma aplicacao full-stack que permita modelar um cenario operacional, gerar uma solucao heuristica e compara-la com uma solucao otimizada usando OR-Tools.

## Papel no Portfolio

O OptiFlow e o projeto de decisao operacional de um conjunto de tres projetos complementares. Cada repositorio deve permanecer utilizavel de forma independente; futuras integracoes servem para demonstrar um fluxo de dados real, nao para criar dependencia prematura entre eles.

| Projeto | Papel principal | Relacao futura com o OptiFlow |
| --- | --- | --- |
| [sales-event-project](https://github.com/VarnerDamascenoJr/sales-event-project) | processamento confiavel de eventos de negocio | pode fornecer pedidos, eventos e dados historicos para cenarios de planejamento |
| [operational-observability-platform](https://github.com/VarnerDamascenoJr/operational-observability-platform) | visibilidade tecnica e operacional de sistemas distribuidos | pode correlacionar execucoes de otimizacao, eventos de negocio e suas metricas |
| OptiFlow | recomendacao de planos sob restricoes e incerteza | pode consumir dados dos demais e devolver recomendacoes ou metricas de decisao |

Essa composicao demonstra tres competencias diferentes: processar operacoes com resiliencia, opera-las com observabilidade e tomar decisoes melhores a partir de seus dados.

O roteiro executavel da narrativa do portfolio esta em
[docs/portfolio-demo-runbook.md](docs/portfolio-demo-runbook.md).

## Direcao Recomendada do MVP

O primeiro dominio recomendado e distribuicao de entregas. O problema comeca com otimizacao deterministica de rotas e evolui de forma natural para um projeto de Estatistica: tempos de viagem, demanda e cancelamentos deixam de ser numeros fixos e passam a ser variaveis aleatorias.

O produto responde a duas perguntas complementares:

1. Qual plano de entregas minimiza custo, distancia e atrasos sob restricoes conhecidas?
2. Quao confiavel e esse plano quando demanda e tempo de viagem variam?

Essa direcao foi confirmada como a primeira fronteira do MVP. A modelagem inicial
esta documentada em [docs/domain-model.md](docs/domain-model.md) e a formulacao
matematica deterministica esta em
[docs/mathematical-formulation.md](docs/mathematical-formulation.md).

## Como Executar a Primeira Fatia

O nucleo atual usa Node.js 24 LTS e nao depende de pacotes externos. Use `nvm` para ativar a versao do projeto:

```bash
nvm use
npm test
npm run scenario:small
```

O resultado atual usa a estrategia `nearest-neighbor-capacity`: uma heuristica gulosa que escolhe o pedido viavel mais proximo para cada veiculo, respeitando capacidade e registrando atraso como metrica.

Cenarios deterministicos de benchmark estao documentados em
[docs/benchmark-scenarios.md](docs/benchmark-scenarios.md). Eles usam entregas
como instancia executavel, mas isolam propriedades gerais de otimizacao
operacional: capacidade, deadline/latencia, custo e demanda nao atendida.

A primeira estrategia alternativa de solver esta documentada em
[docs/solver-strategies.md](docs/solver-strategies.md). Ela usa enumeracao
exata limitada para cenarios pequenos e preserva o mesmo formato de saida do
motor heuristico.

A comparacao entre estrategias esta documentada em
[docs/strategy-comparison.md](docs/strategy-comparison.md) e pode ser executada
com `npm run benchmark:compare`.

Restricoes configuraveis por cenario estao documentadas em
[docs/configurable-constraints.md](docs/configurable-constraints.md). Elas
permitem alternar deadlines duros, jornada maxima por recurso e demandas
obrigatorias sem mudar o motor.

Historico local de cenarios, execucoes e resultados esta documentado em
[docs/optimization-history.md](docs/optimization-history.md). A demonstracao
persiste uma execucao e consulta o resultado recuperado com:

```bash
npm run scenario:small:history
```

A primeira API HTTP local para criar, validar, executar e consultar cenarios
esta documentada em [docs/scenario-run-api.md](docs/scenario-run-api.md):

```bash
npm run api
```

Simulacao estatistica para avaliar um plano fixo sob incerteza sintetica esta
documentada em [docs/statistical-simulation.md](docs/statistical-simulation.md):

```bash
npm run scenario:small:simulate
```

A decisao orientada a risco com VaR/CVaR esta documentada em
[docs/risk-aware-decision.md](docs/risk-aware-decision.md):

```bash
npm run scenario:small:risk
```

A interface local para editar cenarios e comparar estrategias esta documentada
em [docs/scenario-interface.md](docs/scenario-interface.md). Ela e servida pelo
comando da API:

```bash
npm run api
```

Importacao de historico operacional do `sales-event-project` esta documentada
em [docs/sales-event-import.md](docs/sales-event-import.md). A fixture
versionada pode ser regenerada como cenario e executada com:

```bash
npm run sales-event:import
npm run scenario:sales-event
```

Metricas Prometheus e logs JSON das execucoes da API estao documentados em
[docs/execution-observability.md](docs/execution-observability.md). Depois de
subir a API, o scrape local fica em:

```bash
curl http://127.0.0.1:3000/metrics
```

Entrega local, Docker e CI estao documentados em
[docs/local-delivery.md](docs/local-delivery.md). O smoke independente do
projeto roda com:

```bash
npm run demo:local
```

## Caminho de Aprendizado

| Fase | Conceitos para estudar | Aplicacao no OptiFlow | Marco de conclusao |
| --- | --- | --- | --- |
| Fundamentos | grafos, matrizes de distancia, funcao objetivo e restricoes | representar locais, veiculos, pedidos e custos | cenario pequeno calculado e validado manualmente |
| Otimizacao deterministica | VRP, TSP, programacao inteira, busca local e heuristicas | construir a primeira rota e compara-la com OR-Tools | solucao valida com metricas de custo e distancia |
| Medicao | estatistica descritiva, media, mediana, variancia e percentis | resumir atrasos, ocupacao e custo das execucoes | painel com comparacao entre heuristica e solver |
| Incerteza | variaveis aleatorias, distribuicoes, estimacao e intervalo de confianca | modelar demanda e tempos de viagem nao deterministas | cenarios simulados com parametros documentados |
| Simulacao | metodo de Monte Carlo, amostragem e analise de sensibilidade | executar um plano sob muitos cenarios possiveis | distribuicao de custo e atrasos para cada estrategia |
| Decisao robusta | risco, quantis, CVaR e otimizacao robusta ou estocastica | favorecer planos que resistem a atrasos e picos de demanda | recomendacao baseada em custo esperado e nivel de risco |
| Predicao | regressao, series temporais e validacao de modelos | prever demanda por regiao e faixa de horario | previsao avaliada com MAE e RMSE antes de entrar no solver |

## Trilha Matematica Detalhada

O objetivo nao e apenas usar uma biblioteca de solver. E entender o modelo que ela resolve, reconhecer suas limitacoes e justificar uma recomendacao com dados. A ordem abaixo prioriza o que sera aplicado no projeto.

| Ordem | Tema | O que entender na pratica | Aplicacao direta |
| --- | --- | --- | --- |
| 1 | Matematica discreta e teoria dos grafos | conjuntos, logica, combinatoria, grafos ponderados, caminhos e ciclos | representar entregas, veiculos, rotas e matriz de distancia |
| 2 | Algebra linear e funcoes | vetores, matrizes, somatorios, produto escalar e funcoes lineares ou por partes | calcular custos, distancias, capacidades e penalidades |
| 3 | Otimizacao linear | variaveis de decisao, funcao objetivo, restricoes, regiao viavel e relaxacao linear | formular a primeira versao matematica do problema |
| 4 | Otimizacao inteira e por restricoes | variaveis binarias e inteiras, factibilidade, branch-and-bound e constraint programming | impedir violacao de capacidade, janelas de tempo e atendimento duplicado |
| 5 | Algoritmos de otimizacao combinatoria | TSP, VRP, NP-dificuldade, greedy, busca local e metaheuristicas | construir uma heuristica justa e interpretar o resultado do OR-Tools |
| 6 | Probabilidade | variavel aleatoria, distribuicoes, independencia, esperanca, variancia, covariancia e lei dos grandes numeros | tratar demanda e tempo de viagem como grandezas incertas |
| 7 | Estatistica inferencial | amostragem, estimacao, intervalo de confianca, testes de hipotese e tamanho de efeito | avaliar se um ganho sobre a heuristica e consistente ou fruto do acaso |
| 8 | Simulacao e risco | Monte Carlo, bootstrap, quantis, VaR, CVaR e analise de sensibilidade | medir custo esperado, pior caso plausivel e probabilidade de atraso |
| 9 | Regressao e series temporais | regressao, sazonalidade, validacao temporal, MAE, RMSE e calibracao | prever demanda antes de gerar um plano de entrega |
| 10 | Teoria de filas, opcional | taxa de chegada e atendimento, utilizacao, tempo de espera e gargalos | evoluir para capacidade de hubs, equipes ou docas |

### Ordem de estudo sugerida

1. Concluir os temas 1 a 5 antes de implementar o motor deterministico.
2. Estudar os temas 6 e 7 enquanto o projeto passa a registrar resultados e comparar estrategias.
3. Aplicar o tema 8 para transformar resultados pontuais em analise de risco.
4. Introduzir o tema 9 apenas quando houver dados ou um gerador sintetico com premissas bem definidas.
5. Estudar teoria de filas se o dominio evoluir para filas de atendimento, capacidade de centros de distribuicao ou alocacao de equipes.

### Criterio para conclusoes confiaveis

Uma conclusao do projeto deve sempre informar o cenario testado, a funcao objetivo, as restricoes, a heuristica de referencia e as metricas usadas. Quando houver incerteza, deve informar tambem as distribuicoes assumidas, o numero de simulacoes e a variabilidade do resultado.

Nao basta concluir que uma estrategia e "melhor" porque teve o menor custo medio. A analise deve mostrar o ganho em relacao a uma base, o impacto em atrasos, a sensibilidade dos resultados aos parametros e o risco de resultados ruins. Uma solucao otima para o modelo ainda pode ser inadequada para a operacao se suas premissas nao representarem a realidade.

## Progressao do Produto

### Versao 1: planejamento deterministico

Todos os dados sao conhecidos antes da execucao: pedidos, capacidade dos veiculos, custo por distancia e tempo de viagem. Esta versao permite concentrar o estudo no modelo de otimizacao e cria uma linha de base confiavel.

### Versao 2: simulacao de incerteza

O plano da Versao 1 e avaliado em centenas ou milhares de cenarios amostrados. Por exemplo, o tempo de uma rota pode variar conforme uma distribuicao estimada e a demanda pode sofrer picos por regiao.

O resultado deixa de ser apenas "a melhor rota" e passa a incluir custo esperado, probabilidade de atraso e percentis de pior caso.

### Versao 3: planejamento orientado a risco

Em vez de otimizar somente o cenario medio, o motor considera o risco operacional. Uma rota um pouco mais cara pode ser preferivel se reduzir muito a chance de atrasos graves ou de pedidos nao atendidos.

## Checklist Geral

### 0. Portfolio e rastreabilidade

- [x] Definir contrato compartilhado de correlacao entre os tres projetos.
- [x] Linkar as convencoes de correlacao nos READMEs dos tres projetos.
- [x] Adicionar metadata de execucao ao resultado do OptiFlow.
- [x] Permitir que `scenario:small` receba IDs por variaveis de ambiente.
- [ ] Expor metricas de execucao do OptiFlow para observabilidade externa.
- [ ] Validar uma demonstracao integrada com `sales-event-project` e
  `operational-observability-platform`.

### 1. Definicao do problema

- [x] Confirmar distribuicao de entregas como primeiro dominio do MVP.
- [x] Definir entidades, dados de entrada e resultado esperado.
- [x] Definir a funcao objetivo inicial: custo, tempo, distancia ou combinacao ponderada.
- [x] Definir as restricoes obrigatorias e as desejaveis.
- [x] Criar cenarios de exemplo reproduziveis.

### 2. Modelagem e motor de otimizacao

- [x] Modelar o problema matematicamente.
- [x] Implementar uma solucao heuristica de referencia.
- [ ] Integrar o solver OR-Tools.
- [ ] Implementar as restricoes configuraveis.
- [x] Medir custo, tempo de execucao e qualidade das solucoes.
- [ ] Comparar heuristica e solucao otimizada.

### 2.1 Evolucao estatistica

- [ ] Definir quais variaveis sao incertas: demanda, tempo de viagem, cancelamento ou capacidade.
- [ ] Criar dados sinteticos e explicitar suas distribuicoes e parametros.
- [ ] Calcular metricas descritivas para cada execucao.
- [ ] Implementar simulacao de Monte Carlo para avaliar os planos.
- [ ] Exibir custo esperado, percentis e probabilidade de atraso.
- [ ] Realizar analise de sensibilidade dos parametros do modelo.
- [ ] Avaliar otimizacao orientada a risco com uma metrica como CVaR.
- [ ] Adicionar previsao de demanda somente apos validar a base deterministica.

### 3. Backend e processamento

- [ ] Definir a arquitetura do backend NestJS.
- [x] Modelar persistencia de cenarios, execucoes e resultados.
- [x] Criar API para criar, validar e consultar cenarios.
- [ ] Criar fila para execucoes assincronas de otimizacao.
- [ ] Expor acompanhamento de status e resultados.
- [ ] Adicionar tratamento de falhas, tentativas e limites de execucao.

### 4. Interface de cenarios

- [ ] Definir a experiencia principal da aplicacao.
- [ ] Criar formulario ou editor para dados e restricoes do cenario.
- [ ] Exibir status das execucoes.
- [ ] Visualizar a solucao heuristica e a otimizada.
- [ ] Destacar metricas e ganhos obtidos.
- [ ] Permitir duplicar e comparar cenarios.

### 5. Qualidade e entrega

- [x] Cobrir regras de dominio e motor com testes.
- [ ] Adicionar testes de API e fluxos principais da interface.
- [ ] Documentar modelo, decisoes e limitacoes do solver.
- [x] Preparar ambiente local com Docker.
- [x] Configurar CI.
- [x] Publicar uma demonstracao e documentar o projeto para portfolio.

## Decisoes em aberto

- Dominio do primeiro MVP.
- Arquitetura de repositorio e ferramentas de persistencia/fila.
- Formato de importacao e visualizacao dos dados.
- Criterios de comparacao entre as estrategias.

Cada decisao sera fechada junto com a respectiva etapa, para manter o projeto focado e evolutivo.

## Metricas do Projeto

| Categoria | Metricas iniciais | Evolucao estatistica |
| --- | --- | --- |
| Operacao | distancia total, custo total, pedidos atendidos e utilizacao dos veiculos | custo esperado e distribuicao de utilizacao |
| Nivel de servico | quantidade e tempo de atraso | probabilidade de atraso e percentis P90/P95 |
| Qualidade da solucao | ganho sobre a heuristica e tempo de execucao do solver | ganho ajustado por risco e estabilidade entre simulacoes |
| Predicao | nao se aplica na primeira versao | MAE, RMSE e cobertura do intervalo de previsao |

## Principio de Evolucao

Cada camada precisa gerar uma evidencia antes da proxima: primeiro uma rota valida, depois uma rota melhor, depois uma comparacao mensuravel e, por fim, uma decisao que considera incerteza. Assim, a estatistica se torna parte do motor de decisao e nao apenas uma visualizacao adicional.

## Convencoes Iniciais

- Arquivos de configuracao seguem indentacao de dois espacos e finais de linha LF.
- O codigo usara Prettier quando as aplicacoes forem inicializadas.
- Segredos e arquivos locais nao devem ser versionados; use `.env.example` quando houver variaveis de ambiente.
- Decisoes confirmadas ficam registradas em [docs/decisions.md](docs/decisions.md).
- Tecnologias em avaliacao ficam registradas em [docs/technology-notes.md](docs/technology-notes.md).
