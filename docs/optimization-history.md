# Historico de Otimizacao

A primeira persistencia do OptiFlow usa um arquivo JSON local versionado em
`.optiflow/optimization-history.json`. A escolha mantem o projeto sem
dependencias externas nesta fase e isola a persistencia em um repositorio que
pode ser substituido por SQLite ou PostgreSQL quando a API for criada.

O formato separa quatro colecoes, espelhando as entidades do backend futuro:

| Colecao | Conteudo |
| --- | --- |
| `scenarios` | Snapshot completo da entrada, `scenarioId`, nome, origem e hash do conteudo. |
| `optimizationRuns` | Status, inicio, fim, estrategia, erro, duracao e metadata de correlacao. |
| `routePlans` | Rotas, demandas nao atendidas e motivos preservados para execucoes concluidas. |
| `metrics` | Metricas calculadas da execucao, como custo, distancia, atraso e utilizacao. |

As gravacoes sao atomicas: o repositorio escreve um arquivo temporario e depois
renomeia para o caminho final. Isso reduz o risco de historico parcial durante
smokes locais interrompidos.

## Uso

```bash
npm run scenario:small:history
```

O script executa o cenario pequeno, grava o historico e consulta a execucao
recem-persistida. O caminho pode ser alterado com:

```bash
OPTIFLOW_HISTORY_FILE=/tmp/optiflow-history.json npm run scenario:small:history
```

Tambem e possivel trocar a estrategia e preservar identificadores externos:

```bash
OPTIFLOW_STRATEGY=exact-enumeration \
OPTIFLOW_OPTIMIZATION_RUN_ID=run-demo-history \
npm run scenario:small:history
```

O arquivo `.optiflow/optimization-history.json` e dado local de runtime e nao
deve ser versionado.
