# OptiFlow

Motor de decisao operacional para simular, comparar e recomendar estrategias em fluxos de venda sob capacidade limitada, demanda incerta e restricoes configuraveis.

> Status: reposicionamento de dominio. O projeto esta sendo alinhado a um recorte de pesquisa de mestrado: decisao operacional em vendas sob incerteza.

## Objetivo

Construir uma aplicacao full-stack que permita modelar cenarios de venda, estimar impacto operacional, simular incerteza e comparar estrategias por receita esperada, risco, capacidade, nivel de atendimento e robustez.

## Papel no Portfolio

O OptiFlow e o projeto de decisao operacional de um conjunto de tres projetos complementares. Cada repositorio deve permanecer utilizavel de forma independente; futuras integracoes servem para demonstrar um fluxo de dados real, nao para criar dependencia prematura entre eles.

| Projeto | Papel principal | Relacao futura com o OptiFlow |
| --- | --- | --- |
| [sales-event-project](https://github.com/VarnerDamascenoJr/sales-event-project) | processamento confiavel de eventos de negocio | pode fornecer pedidos, eventos e dados historicos para cenarios de planejamento |
| [operational-observability-platform](https://github.com/VarnerDamascenoJr/operational-observability-platform) | visibilidade tecnica e operacional de sistemas distribuidos | pode correlacionar execucoes de otimizacao, eventos de negocio e suas metricas |
| OptiFlow | recomendacao de decisoes operacionais sob restricoes e incerteza | pode consumir snapshots ou eventos dos demais e devolver recomendacoes ou metricas de decisao |

Essa composicao demonstra tres competencias diferentes: processar operacoes com resiliencia, opera-las com observabilidade e tomar decisoes melhores a partir de seus dados.

## Direcao do MVP

O primeiro dominio do OptiFlow e venda em sentido amplo. O `sales-event-project` usa venda de ingressos como estudo de caso concreto, mas o OptiFlow deve manter o modelo independente o suficiente para representar outros fluxos de venda com itens, estoque, capacidade, pagamento e atendimento.

O produto responde a perguntas complementares:

1. Qual estrategia de venda maximiza resultado esperado sob restricoes de estoque, capacidade e nivel de servico?
2. Qual e o risco de ruptura, perda de receita, fila operacional ou atendimento insuficiente quando a demanda varia?
3. Como uma decisao muda quando o criterio deixa de ser apenas media esperada e passa a considerar percentis, pior caso plausivel ou CVaR?

Essa direcao esta documentada em [docs/research-direction.md](docs/research-direction.md), [docs/domain-model.md](docs/domain-model.md) e [docs/sales-event-integration.md](docs/sales-event-integration.md).

## Como Executar a Primeira Fatia

O nucleo atual usa Node.js 24 LTS e nao depende de pacotes externos. Use `nvm` para ativar a versao do projeto:

```bash
nvm use
npm test
npm run scenario:sales
npm run scenario:small
```

O caminho principal atual e `scenario:sales`, que avalia um cenario deterministico de capacidade e demanda em vendas. O motor de rotas permanece como uma fatia tecnica inicial, mas sera substituido ou isolado por um modelo de decisao em vendas antes da evolucao do MVP.

## Caminho de Aprendizado

| Fase | Conceitos para estudar | Aplicacao no OptiFlow | Marco de conclusao |
| --- | --- | --- | --- |
| Fundamentos | funcao objetivo, restricoes, estoque, capacidade e demanda | representar eventos de venda, itens, capacidade e estrategias | cenario pequeno calculado e validado manualmente |
| Otimizacao deterministica | programacao linear, inteira e por restricoes | comparar alocacoes de estoque/capacidade e regras de atendimento | solucao valida com metricas de receita, perda e utilizacao |
| Medicao | estatistica descritiva, media, mediana, variancia e percentis | resumir vendas, ruptura, receita e ocupacao | painel com comparacao entre estrategias |
| Incerteza | variaveis aleatorias, distribuicoes, estimacao e intervalo de confianca | modelar demanda, pagamento, cancelamento e no-show | cenarios simulados com parametros documentados |
| Simulacao | metodo de Monte Carlo, amostragem e analise de sensibilidade | executar estrategias sob muitos cenarios possiveis | distribuicao de receita, ruptura e nivel de servico |
| Decisao robusta | risco, quantis, CVaR e otimizacao robusta ou estocastica | favorecer estrategias que resistem a picos de demanda e falhas operacionais | recomendacao baseada em resultado esperado e nivel de risco |
| Predicao | regressao, series temporais e validacao de modelos | prever demanda por item, canal ou janela temporal | previsao avaliada com MAE e RMSE antes de orientar decisoes |

## Trilha Matematica Detalhada

O objetivo nao e apenas usar uma biblioteca de solver. E entender o modelo que ela resolve, reconhecer suas limitacoes e justificar uma recomendacao com dados. A ordem abaixo prioriza o que sera aplicado no projeto.

| Ordem | Tema | O que entender na pratica | Aplicacao direta |
| --- | --- | --- | --- |
| 1 | Matematica discreta e combinatoria | conjuntos, logica, regras de alocacao, estados e decisoes discretas | representar vendas, itens, estoque, capacidade e estrategias |
| 2 | Algebra linear e funcoes | vetores, matrizes, somatorios, produto escalar e funcoes lineares ou por partes | calcular receita, custos, penalidades, capacidade usada e perda esperada |
| 3 | Otimizacao linear | variaveis de decisao, funcao objetivo, restricoes, regiao viavel e relaxacao linear | formular a primeira versao matematica do problema |
| 4 | Otimizacao inteira e por restricoes | variaveis binarias e inteiras, factibilidade, branch-and-bound e constraint programming | impedir violacao de estoque, capacidade, regras de item e atendimento duplicado |
| 5 | Algoritmos de otimizacao combinatoria | heuristicas, busca local, programacao dinamica e metaheuristicas | construir uma heuristica justa e interpretar o resultado do solver |
| 6 | Probabilidade | variavel aleatoria, distribuicoes, independencia, esperanca, variancia, covariancia e lei dos grandes numeros | tratar demanda e tempo de viagem como grandezas incertas |
| 7 | Estatistica inferencial | amostragem, estimacao, intervalo de confianca, testes de hipotese e tamanho de efeito | avaliar se um ganho sobre a heuristica e consistente ou fruto do acaso |
| 8 | Simulacao e risco | Monte Carlo, bootstrap, quantis, VaR, CVaR e analise de sensibilidade | medir custo esperado, pior caso plausivel e probabilidade de atraso |
| 9 | Regressao e series temporais | regressao, sazonalidade, validacao temporal, MAE, RMSE e calibracao | prever demanda antes de orientar uma estrategia de venda |
| 10 | Teoria de filas, opcional | taxa de chegada e atendimento, utilizacao, tempo de espera e gargalos | evoluir para check-in, suporte, processamento de pagamentos ou atendimento operacional |

### Ordem de estudo sugerida

1. Concluir os temas 1 a 5 durante a implementacao do motor deterministico.
2. Estudar os temas 6 e 7 enquanto o projeto passa a registrar resultados e comparar estrategias.
3. Aplicar o tema 8 para transformar resultados pontuais em analise de risco.
4. Introduzir o tema 9 apenas quando houver dados ou um gerador sintetico com premissas bem definidas.
5. Estudar teoria de filas se o dominio evoluir para filas de atendimento, check-in, suporte ou processamento de pagamentos.

### Criterio para conclusoes confiaveis

Uma conclusao do projeto deve sempre informar o cenario testado, a funcao objetivo, as restricoes, a heuristica de referencia e as metricas usadas. Quando houver incerteza, deve informar tambem as distribuicoes assumidas, o numero de simulacoes e a variabilidade do resultado.

Nao basta concluir que uma estrategia e "melhor" porque teve o menor custo medio. A analise deve mostrar o ganho em relacao a uma base, o impacto em atrasos, a sensibilidade dos resultados aos parametros e o risco de resultados ruins. Uma solucao otima para o modelo ainda pode ser inadequada para a operacao se suas premissas nao representarem a realidade.

## Progressao do Produto

### Versao 1: planejamento deterministico

Todos os dados sao conhecidos antes da execucao: itens, estoque, capacidade operacional, preco, demanda assumida e penalidades. Esta versao permite concentrar o estudo no modelo de decisao e cria uma linha de base confiavel.

### Versao 2: simulacao de incerteza

O plano da Versao 1 e avaliado em centenas ou milhares de cenarios amostrados. Por exemplo, demanda, aprovacao de pagamento, cancelamento, no-show ou velocidade de atendimento podem variar conforme distribuicoes estimadas.

O resultado deixa de ser apenas "a melhor estrategia media" e passa a incluir receita esperada, probabilidade de ruptura, perda esperada, utilizacao de capacidade e percentis de pior caso.

### Versao 3: planejamento orientado a risco

Em vez de otimizar somente o cenario medio, o motor considera o risco operacional. Uma estrategia um pouco menos agressiva pode ser preferivel se reduzir muito a chance de ruptura, perda de receita ou sobrecarga operacional.

## Checklist Geral

### 1. Definicao do problema

- [x] Confirmar vendas como primeiro dominio do MVP.
- [x] Definir entidades, dados de entrada e resultado esperado.
- [x] Definir a funcao objetivo inicial: custo, tempo, distancia ou combinacao ponderada.
- [x] Definir as restricoes obrigatorias e as desejaveis.
- [x] Criar cenarios de exemplo reproduziveis.

### 2. Modelagem e motor de otimizacao

- [ ] Modelar o problema matematicamente.
- [x] Implementar uma solucao heuristica de referencia.
- [ ] Integrar um solver adequado ao modelo escolhido.
- [ ] Implementar as restricoes configuraveis.
- [x] Medir custo, tempo de execucao e qualidade das solucoes.
- [ ] Comparar heuristica e solucao otimizada.

### 2.1 Evolucao estatistica

- [ ] Definir quais variaveis sao incertas: demanda, pagamento, cancelamento, no-show ou capacidade.
- [ ] Criar dados sinteticos e explicitar suas distribuicoes e parametros.
- [ ] Calcular metricas descritivas para cada execucao.
- [ ] Implementar simulacao de Monte Carlo para avaliar os planos.
- [ ] Exibir custo esperado, percentis e probabilidade de atraso.
- [ ] Realizar analise de sensibilidade dos parametros do modelo.
- [ ] Avaliar otimizacao orientada a risco com uma metrica como CVaR.
- [ ] Adicionar previsao de demanda somente apos validar a base deterministica.

### 3. Backend e processamento

- [ ] Definir a arquitetura do backend NestJS.
- [ ] Modelar persistencia de cenarios, execucoes e resultados.
- [ ] Criar API para criar, validar e consultar cenarios.
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

### 5. Qualidade e publicacao

- [x] Cobrir regras de dominio e motor com testes.
- [ ] Adicionar testes de API e fluxos principais da interface.
- [ ] Documentar modelo, decisoes e limitacoes do solver.
- [ ] Preparar ambiente local com Docker.
- [ ] Configurar CI.
- [ ] Publicar uma demonstracao e documentar o projeto para portfolio.

## Decisoes em aberto

- Contrato final entre `sales-event-project` e OptiFlow.
- Arquitetura de repositorio e ferramentas de persistencia/fila.
- Formato de importacao e visualizacao dos dados.
- Criterios de comparacao entre as estrategias.

Cada decisao sera fechada junto com a respectiva etapa, para manter o projeto focado e evolutivo.

## Metricas do Projeto

| Categoria | Metricas iniciais | Evolucao estatistica |
| --- | --- | --- |
| Operacao | demanda atendida, vendas perdidas, estoque ocioso e utilizacao de capacidade | distribuicao de utilizacao e ruptura |
| Nivel de servico | vendas nao atendidas, tempo de confirmacao e gargalos operacionais | probabilidade de ruptura e percentis P90/P95 |
| Qualidade da solucao | ganho sobre a estrategia de referencia e tempo de execucao do solver | ganho ajustado por risco e estabilidade entre simulacoes |
| Predicao | nao se aplica na primeira versao | MAE, RMSE e cobertura do intervalo de previsao |

## Principio de Evolucao

Cada camada precisa gerar uma evidencia antes da proxima: primeiro um cenario valido, depois uma estrategia de referencia, depois uma comparacao mensuravel e, por fim, uma decisao que considera incerteza. Assim, a estatistica se torna parte do motor de decisao e nao apenas uma visualizacao adicional.

## Convencoes Iniciais

- Arquivos de configuracao seguem indentacao de dois espacos e finais de linha LF.
- O codigo usara Prettier quando as aplicacoes forem inicializadas.
- Segredos e arquivos locais nao devem ser versionados; use `.env.example` quando houver variaveis de ambiente.
- Decisoes confirmadas ficam registradas em [docs/decisions.md](docs/decisions.md).
- Tecnologias em avaliacao ficam registradas em [docs/technology-notes.md](docs/technology-notes.md).
