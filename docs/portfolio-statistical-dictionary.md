# Dicionario Estatistico Compartilhado

Este documento define a atividade S0.2 do backlog estatistico do portfolio. Ele
padroniza unidades, termos, precisao numerica e dimensoes analiticas para que
`sales-event-project`, `operational-observability-platform` e `OptiFlow`
produzam e consumam dados estatisticos com a mesma linguagem.

## Fixture de Referencia

A fixture compartilhada inicial esta em:

- `data/statistics/shared-statistical-fixture.v1.json`

Ela nao representa um schema final de todos os exports. Ela e um exemplo
minimo, versionado, para alinhar nomes de campos, unidades, dimensoes e
arredondamento antes das implementacoes S1, S2 e S3.

## Unidades Padrao

| Conceito | Unidade canonica | Campo sugerido | Precisao para armazenamento | Precisao para relatorio | Observacao |
| --- | --- | --- | --- | --- | --- |
| Tempo absoluto | ISO 8601 UTC | `occurred_at`, `window_start`, `window_end` | Milissegundos quando disponivel | ISO 8601 UTC | Nao usar horario local em datasets analiticos |
| Duracao | Segundos | `duration_seconds` | 3 casas decimais | 1 a 3 casas decimais | Tempos ate evento, latencia e atraso |
| Dinheiro | Centavos inteiros | `amount_cents`, `cost_cents`, `loss_cents` | Inteiro | Duas casas quando exibido como moeda | Evita erro de ponto flutuante em valores monetarios |
| Distancia | Metros | `distance_meters` | Inteiro | Quilometros com 2 casas quando exibido | `OptiFlow` pode converter para km apenas em relatorios |
| Demanda | Contagem inteira | `demand_count` | Inteiro | Inteiro | Vendas, pedidos, check-ins ou requisicoes |
| Capacidade | Contagem inteira | `capacity_count` | Inteiro | Inteiro | Tickets, veiculos, slots, workers ou limite operacional |
| Probabilidade | Proporcao entre 0 e 1 | `probability`, `conversion_probability` | 6 casas decimais | 3 casas decimais ou percentual com 1 casa | Nunca armazenar como `42%`; armazenar `0.42` |
| Taxa | Eventos por unidade de tempo | `rate_per_minute`, `rate_per_hour` | 6 casas decimais | 3 casas decimais | Declarar sempre o denominador temporal |
| Quantil | Proporcao entre 0 e 1 | `quantile`, `p95_seconds` | 6 casas decimais para o nivel; unidade do valor para o resultado | Nivel como p50, p90, p95 ou p99 | `p95_seconds` e o valor do percentil, nao o nivel 0.95 |
| Custo | Centavos ou unidade de perda | `expected_cost_cents`, `cvar_cost_cents` | Inteiro para dinheiro; 6 casas para scores | Duas casas se moeda | A funcao de perda deve explicar o que o custo representa |

## Termos Padronizados

| Termo | Definicao operacional | Exemplo |
| --- | --- | --- |
| Evento | Registro imutavel de algo que aconteceu em um instante observavel | Venda aceita, pagamento aprovado, email enviado, requisicao falhou |
| Janela | Intervalo fechado-aberto `[start, end)` usado para agregacao | 2026-09-01T10:00:00Z ate 2026-09-01T10:05:00Z |
| Coorte | Grupo definido por um criterio comum no inicio da observacao | Vendas aceitas na mesma hora para o mesmo evento |
| Amostra | Observacoes realmente disponiveis para estimacao | 120 vendas com status conhecido |
| Populacao-alvo | Conjunto sobre o qual a conclusao pretende falar | Todas as vendas aceitas de um evento futuro semelhante |
| Censura | Observacao cujo evento final ainda nao ocorreu ate o fim da janela | Venda aceita que ainda nao virou check-in |
| Funil | Sequencia de etapas condicionais de conversao | aceita -> pendente -> paga -> ticket emitido -> check-in |
| Atraso | Excesso de tempo em relacao a um limite ou expectativa definida | Check-in 90s depois do SLA |
| Falha | Evento que viola uma regra operacional ou tecnica | Pagamento recusado, requisicao 5xx, email em dead-letter |
| SLO | Objetivo mensuravel de nivel de servico | 99.5% de requisicoes bem-sucedidas em 30 dias |
| Burn rate | Velocidade de consumo do error budget em relacao ao permitido | Burn rate 4.0 consome budget 4 vezes mais rapido que o alvo |
| Risco | Probabilidade e impacto de um resultado indesejado | Chance de stockout, atraso grave ou violacao de SLO |
| Perda | Penalidade numerica associada a uma decisao sob incerteza | Custo de sobra, falta, atraso ou incidente |
| Estimando | Quantidade estatistica que se deseja aprender | Probabilidade de conversao, mediana de tempo, CVaR |
| Estimativa | Valor calculado a partir da amostra para aproximar o estimando | Conversao observada de 0.81 |
| Intervalo de incerteza | Faixa plausivel para o estimando sob o metodo escolhido | IC 95%, intervalo posterior ou bootstrap |

## Regras de Arredondamento e Precisao

- Armazenar valores monetarios em centavos inteiros.
- Armazenar probabilidades como proporcoes entre `0` e `1`, com ate 6 casas
  decimais.
- Armazenar duracoes em segundos, com ate 3 casas decimais.
- Armazenar timestamps em UTC, no formato ISO 8601.
- Relatorios podem exibir percentuais, moeda local e quilometros, mas o dataset
  analitico deve preservar a unidade canonica.
- Calculos intermediarios nao devem arredondar antes do resultado final.
- Intervalos devem declarar nivel e metodo, por exemplo `confidence_level:
  0.95` e `method: "wilson"`.
- Comparacoes entre estrategias devem declarar seed, numero de simulacoes e
  erro padrao quando usarem Monte Carlo.

## Labels e Dimensoes Analiticas

Labels de baixa cardinalidade servem para filtros, agrupamentos e dashboards.
Elas devem ter vocabulario controlado e poucos valores possiveis.

Exemplos:

- `project`: `sales-event-project`, `operational-observability-platform`,
  `OptiFlow`.
- `event_type`: `sale.accepted`, `payment.approved`, `checkin.completed`,
  `http.request`.
- `service`: nome estavel do servico.
- `status`: `success`, `failure`, `censored`.
- `ticket_type`: categoria versionada do ticket.
- `strategy`: nome estavel da estrategia de decisao.

Dimensoes analiticas podem ter cardinalidade maior, mas devem ser usadas com
cuidado em agregacoes e exports.

Exemplos:

- `event_id`: identifica o evento de negocio.
- `sale_id`: identifica a venda individual.
- `scenario_id`: identifica um cenario do `OptiFlow`.
- `window_start` e `window_end`: identificam a janela temporal.
- `cohort_id`: identifica a regra de agrupamento de uma coorte.

Campos livres de alta cardinalidade, como mensagem de erro bruta ou payload
inteiro, nao devem entrar como label. Quando forem necessarios para auditoria,
devem ficar em campos separados e fora das chaves de agregacao estatistica.

## Contrato Minimo de Registro Analitico

Todo registro analitico compartilhado deve deixar claro:

- `schema_version`: versao do contrato do registro.
- `project`: repositorio que gerou o dado.
- `unit_of_analysis`: unidade experimental ou observacional.
- `window`: periodo de observacao, quando aplicavel.
- `dimensions`: dimensoes usadas para agrupar ou filtrar.
- `measurements`: medidas numericas com unidades canonicas.
- `uncertainty`: metodo, nivel e limites, quando aplicavel.
- `limitations`: vieses, censura, baixa amostra ou outras restricoes.

## Exemplos de Uso

### Funil de Conversao

- Pergunta: RQ1.
- Unidade experimental: venda aceita.
- Estimando: probabilidade de virar check-in.
- Medida: `conversion_probability`.
- Incerteza: intervalo Wilson ou posterior Beta.
- Limitacao comum: vendas recentes podem estar censuradas porque ainda nao
  tiveram tempo suficiente para check-in.

### SLO em Janela Rolante

- Pergunta: RQ5.
- Unidade experimental: requisicao observada.
- Estimando: taxa de sucesso na janela.
- Medida: `success_probability`.
- Incerteza: intervalo binomial ou Beta-Binomial.
- Limitacao comum: janelas com pouco trafego produzem intervalos largos.

### Decisao por Risco

- Pergunta: RQ7.
- Unidade experimental: simulacao de um cenario.
- Estimando: diferenca de custo esperado e CVaR entre estrategias.
- Medida: `expected_cost_cents`, `cvar_cost_cents`.
- Incerteza: erro padrao Monte Carlo e analise de sensibilidade.
- Limitacao comum: conclusao depende dos priors importados e da funcao de perda.
