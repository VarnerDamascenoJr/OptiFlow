# Solver OR-Tools

A estrategia `or-tools` resolve o planejamento deterministico de entregas com
OR-Tools CP-SAT 9.15.6755. Ela recebe o mesmo cenario das heuristicas e devolve
rotas, paradas, pedidos nao alocados e metricas no contrato existente.

## Preparacao e Execucao

Use Node.js conforme `.nvmrc` e Python 3.10 ou superior (3.12 no CI):

```bash
nvm use
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-solver.txt
npm test
npm run scenario:small:or-tools
npm run benchmark:compare:or-tools
```

Se o Python do sistema for antigo, um ambiente equivalente pode ser criado com
`uv venv --python 3.12 .venv` e
`uv pip install --python .venv/bin/python -r requirements-solver.txt`.
No Windows, o executavel do ambiente fica em `.venv/Scripts/python.exe`.
O adaptador usa `OPTIFLOW_PYTHON`, quando definido, depois o Python da `.venv`
do projeto e, por ultimo, `python3`. O caminho do executavel e configuracao de
ambiente; ele nao e recebido da requisicao HTTP.

Exemplo com limites explicitos:

```bash
OPTIFLOW_STRATEGY=or-tools \
OPTIFLOW_SOLVER_MAX_ORDERS=50 \
OPTIFLOW_SOLVER_TIMEOUT_MS=3000 \
npm run scenario:small
```

`solveScenario(scenario, { strategy: "or-tools", solver: { timeoutMs: 3000 } })`
e a entrada equivalente em JavaScript. Na API, envie `strategy: "or-tools"`,
`solver: { timeoutMs: 3000 }` e `timeoutMs: 15000` para o job. O limite do job
inclui inicializacao do processo Python, montagem do modelo e busca; o limite
do solver controla apenas a busca. O historico preserva `routePlan.solverInfo`.

## Modelo Implementado

- Cada veiculo possui um circuito opcional com deposito e nos por pedido.
  Pedidos diferentes no mesmo local continuam sendo decisoes distintas.
- Um laco em um no representa sua exclusao; o laco do deposito representa
  rota vazia. Uma rota com pedidos necessariamente inclui seu deposito.
- A soma de atribuicoes de cada pedido mais sua nao alocacao e igual a um.
- A demanda total atribuida a cada veiculo respeita sua capacidade.
- Arcos selecionados impõem precedencia temporal, tempo de servico e viagem.
  O inicio do servico respeita o inicio da janela. Com janela dura, tambem
  respeita seu fim; com janela suave, atraso entra no objetivo.
- `maxRouteDistance` limita a distancia final, incluindo retorno ao deposito
  e a diagonal da matriz em rotas vazias. Nao exige desigualdade triangular.
- O objetivo minimiza distancia ponderada, atraso ponderado e penalidade por
  pedido nao atendido, conforme a [formulacao](mathematical-formulation.md).
- `requiredOrderIds` continua sendo uma anotacao de diagnostico.

O CP-SAT exige inteiros. O adaptador transforma valores decimais em inteiros
por escalas separadas para tempo/distancia, demanda/capacidade e pesos de custo.
Aceita ate seis casas decimais significativas apos remover zeros finais;
precisao maior gera erro em vez de arredondamento silencioso. Valores escalados
e horizonte temporal sao limitados a `10^12`. O validador do CP-SAT tambem
rejeita modelos cujas expressoes possam exceder seus limites numericos.

O objetivo do CP-SAT usa a soma ponderada antes do arredondamento de exibicao.
Ele nao reproduz os desempates por custo arredondado da enumeracao. Planos com
mesmo custo podem ter sequencias ou distribuicoes entre veiculos diferentes.

## Contrato e Garantias

O Node chama `solver/ortools_solver.py` por processo, com JSON em stdin/stdout,
sem shell. O Python devolve sequencias de IDs, as escalas inteiras aplicadas e
informacoes da busca. O Node reconstroi as paradas com o mesmo calculador de
rotas da enumeracao, usando os horarios mais cedo possiveis. Essa reconstrucao
e a validacao de capacidade, distancia e janelas duras usam os inteiros do
modelo; somente depois os valores sao convertidos para as unidades originais
e as metricas sao calculadas com `evaluatePlan`. Assim, somas como
`1000000000 + 0.1 + 0.1 + 0.1` nao criam atraso artificial nem fazem uma rota
na fronteira de uma restricao ser rejeitada por erro de ponto flutuante.

`solverInfo` inclui motor, versao, status, valor do objetivo sem arredondamento,
limite inferior (`bestObjectiveBound`) e tempo de busca (`wallTimeMs`):

| Status | Significado |
| --- | --- |
| `OPTIMAL` | Otimalidade comprovada para o modelo inteiro representado. |
| `FEASIBLE` | Plano valido encontrado, sem prova de otimalidade dentro do prazo. |
| `UNKNOWN` | Nenhum plano encontrado antes de parar; gera erro explicavel. |
| `INFEASIBLE` | Modelo sem plano viavel; gera erro explicavel. |

Um plano `FEASIBLE` pode ter esperas adicionais no modelo. Ao reconstruir os
horarios mais cedo, o Node pode melhorar seu custo; `objectiveValue` informa o
custo dessa rota reconstruida, mantendo o limite inferior da busca. As metricas
publicas continuam arredondadas a duas casas decimais.

Os limites padrao sao 50 pedidos e 1000 ms de busca, configuraveis. O processo
Python tem um limite adicional de `timeoutMs + 5000` ms para incluir montagem e
inicializacao. Falta de Python/OR-Tools, limite de pedidos, precisao nao suportada,
modelo invalido e ausencia de plano retornam erro; nao ha fallback silencioso.

O adaptador e sincrono para preservar o contrato atual. Uma chamada bloqueia a
thread do Node durante sua execucao, como a enumeracao existente. Uso com maior
carga exige isolamento real de workers; a fila local atual nao oferece esse
isolamento. A complexidade do modelo cresce com `veiculos * pedidos^2`, e
instancias maiores podem terminar apenas como `FEASIBLE` ou `UNKNOWN`.

## Evidencia e Entrega

No cenario pequeno, a heuristica tem custo 792 e OR-Tools encontra custo 744
com status `OPTIMAL` e limite inferior 744. Os testes comparam o solver real
com a enumeracao em todos os cenarios versionados e cobrem restricoes,
fracionarios, multiplos depositos, mais de oito pedidos, timeout e erros.

Docker instala Python e OR-Tools e configura `OPTIFLOW_PYTHON`. O CI instala
a dependencia, executa a suite completa e roda o benchmark OR-Tools.

Referencias oficiais: [instalacao](https://developers.google.com/optimization/install),
[CP-SAT e status](https://developers.google.com/optimization/cp/cp_solver),
[limites de busca](https://developers.google.com/optimization/cp/cp_tasks) e
[pacote versionado](https://pypi.org/project/ortools/9.15.6755/).
