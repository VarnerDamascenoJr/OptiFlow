# Formato de Estudo Estatistico Reprodutivel

Este documento define a atividade S0.3 do backlog estatistico do portfolio. O
objetivo e garantir que uma conclusao estatistica possa ser reexecutada por
outra pessoa, com os mesmos dados, filtros, parametros e versoes dos tres
repositorios.

## Localizacao

Estudos estatisticos devem ficar em:

- `studies/statistics/YYYY-MM-DD-short-name/study.md`

Evidencias geradas ou copiadas para revisao devem ficar no mesmo diretorio:

- `studies/statistics/YYYY-MM-DD-short-name/evidence/`

O diretorio do estudo deve ser versionado quando a evidencia for pequena,
deterministica e adequada para o repositorio. Evidencias grandes, sensiveis ou
geradas por sistemas externos devem ser substituidas por fixtures pequenas,
sumarios e instrucoes de reproducao.

## Campos Obrigatorios

Cada estudo deve conter:

- `question_id`: pergunta de pesquisa, por exemplo `RQ1`.
- `question`: texto da pergunta respondida.
- `estimand`: quantidade estatistica alvo.
- `dataset`: caminho, versao e descricao dos dados usados.
- `period`: janela temporal analisada.
- `filters`: filtros aplicados e exclusoes.
- `model_or_method`: modelo, metodo estatistico ou regra de calculo.
- `parameters`: parametros relevantes, incluindo priors quando houver.
- `seed`: seed usada em simulacoes ou `not_applicable`.
- `repository_versions`: `git sha` dos tres repositorios.
- `commands`: comandos necessarios para reproduzir a analise.
- `result`: resultado numerico ou qualitativo.
- `interpretation`: conclusao escrita em linguagem operacional.
- `limitations`: vieses, censura, baixa amostra e ameacas a validade.
- `evidence`: arquivos versionados que sustentam a conclusao.

## Regras de Reprodutibilidade

- Sempre registrar o `git sha` de `OptiFlow`, `sales-event-project` e
  `operational-observability-platform`.
- Quando o repositorio estiver com mudancas locais relevantes, registrar isso
  em `working_tree_notes`.
- Declarar o periodo analisado mesmo quando a fixture for sintetica.
- Declarar filtros vazios como `none`, em vez de omitir o campo.
- Declarar `seed` em toda simulacao, bootstrap ou Monte Carlo.
- Armazenar evidencias com data no caminho do estudo.
- Resultados devem apontar para uma pergunta `RQ`, nao apenas para uma metrica.

## Template

Um template copiavel esta em:

- `docs/templates/statistical-study-template.md`

## Primeiro Estudo

O primeiro estudo pequeno, baseado na fixture compartilhada da S0.2, esta em:

- `studies/statistics/2026-09-22-foundation-fixture/study.md`

Ele nao pretende provar uma conclusao operacional real. Sua funcao e validar o
formato: pergunta, dataset, periodo, filtros, metodo, parametros, seed,
resultado, conclusao, SHAs e evidencia.
