# OptiFlow

Motor de otimizacao operacional para comparar cenarios de distribuicao e alocacao, equilibrando custo, tempo e distancia sob restricoes configuraveis.

> Status: fundacao do projeto. O dominio do primeiro MVP e as escolhas de implementacao ainda serao definidos em conjunto.

## Objetivo

Construir uma aplicacao full-stack que permita modelar um cenario operacional, gerar uma solucao heuristica e compara-la com uma solucao otimizada usando OR-Tools.

## Checklist Geral

### 1. Definicao do problema

- [ ] Escolher o primeiro dominio do MVP: entregas, equipes ou estoque.
- [ ] Definir entidades, dados de entrada e resultado esperado.
- [ ] Definir a funcao objetivo inicial: custo, tempo, distancia ou combinacao ponderada.
- [ ] Definir as restricoes obrigatorias e as desejaveis.
- [ ] Criar cenarios de exemplo reproduziveis.

### 2. Modelagem e motor de otimizacao

- [ ] Modelar o problema matematicamente.
- [ ] Implementar uma solucao heuristica de referencia.
- [ ] Integrar o solver OR-Tools.
- [ ] Implementar as restricoes configuraveis.
- [ ] Medir custo, tempo de execucao e qualidade das solucoes.
- [ ] Comparar heuristica e solucao otimizada.

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

### 5. Qualidade e entrega

- [ ] Cobrir regras de dominio e motor com testes.
- [ ] Adicionar testes de API e fluxos principais da interface.
- [ ] Documentar modelo, decisoes e limitacoes do solver.
- [ ] Preparar ambiente local com Docker.
- [ ] Configurar CI.
- [ ] Publicar uma demonstracao e documentar o projeto para portfolio.

## Decisoes em aberto

- Dominio do primeiro MVP.
- Arquitetura de repositorio e ferramentas de persistencia/fila.
- Formato de importacao e visualizacao dos dados.
- Criterios de comparacao entre as estrategias.

Cada decisao sera fechada junto com a respectiva etapa, para manter o projeto focado e evolutivo.

## Convencoes Iniciais

- Arquivos de configuracao seguem indentacao de dois espacos e finais de linha LF.
- O codigo usara Prettier quando as aplicacoes forem inicializadas.
- Segredos e arquivos locais nao devem ser versionados; use `.env.example` quando houver variaveis de ambiente.
- Decisoes confirmadas ficam registradas em [docs/decisions.md](docs/decisions.md).
