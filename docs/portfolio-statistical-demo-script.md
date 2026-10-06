# Roteiro Gravavel da Trilha Estatistica

Este roteiro complementa o roteiro geral do portfolio. Ele foi desenhado para
uma gravacao curta, de 6 a 8 minutos, com linguagem de defesa tecnica: cada
cena responde a uma pergunta estatistica e mostra como a resposta vira decisao.

Mensagem central:

```text
dados operacionais -> incerteza quantificada -> previsao avaliada ->
decisao sob risco
```

## Preparo Antes da Gravacao

Use tres terminais, um por repositorio:

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
git switch main
git pull --ff-only

cd /Users/varnerdamasceno/github-varner/operational-observability-platform
git switch main
git pull --ff-only

cd /Users/varnerdamasceno/github-varner/OptiFlow
git switch main
git pull --ff-only
npm run statistics:golden-datasets
```

Deixe abertos:

- [`docs/portfolio-statistical-technical-report.md`](portfolio-statistical-technical-report.md)
- [`docs/portfolio-statistical-research-questions.md`](portfolio-statistical-research-questions.md)
- [`docs/golden-datasets.md`](golden-datasets.md)
- `sales-event-project/docs/analytics-export.md`
- `operational-observability-platform/docs/slo-error-budget.md`

## Linha do Tempo

| Tempo | Cena | Pergunta | Mensagem |
| --- | --- | --- | --- |
| 0:00-0:45 | Abertura | Por que estatistica? | O portfolio mede incerteza antes de decidir. |
| 0:45-2:10 | Sales | Qual a conversao e a demanda esperada? | O Sales gera dataset analitico com funil, sobrevivencia, demanda e stockout. |
| 2:10-3:35 | Observability | Qual o risco operacional agora? | A plataforma mede SLO, burn rate, anomalia, risco e confianca de hipoteses. |
| 3:35-5:40 | OptiFlow | Qual decisao minimiza perda sob risco? | O OptiFlow consome priors e compara estrategias com perda e sensibilidade. |
| 5:40-7:00 | Fechamento | O resultado e defensavel? | A demo mostra intervalo, risco, trade-off, limitacoes e reproducibilidade. |

## Cena 1: Sales Gera Dataset e Funil com Incerteza

Objetivo: mostrar que o dado operacional vira dataset estatistico, nao apenas
log bruto.

Comando para demonstracao com API ativa:

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
go run ./cmd/analytics-export \
  -sales-event-id 11111111-1111-1111-1111-111111111111 \
  -start 2026-09-01T00:00:00Z \
  -end 2026-09-22T12:00:00Z \
  -output /tmp/sales-analytics-export.json
```

Check offline equivalente quando o Go local nao estiver instalado:

```bash
cd /Users/varnerdamasceno/github-varner/sales-event-project
docker run --rm -v "$PWD":/app -w /app golang:1.22-alpine \
  go test ./internal/analytics
```

Comando offline equivalente no `OptiFlow`, usando fixture versionada:

```bash
cd /Users/varnerdamasceno/github-varner/OptiFlow
npm run study:funnel-planning
```

Fala sugerida:

> "A primeira pergunta e inferencial: de cada venda aceita, qual proporcao chega
> ao check-in? O Sales exporta eventos e janelas; o estudo usa esse dataset para
> calcular funil, demanda e incerteza antes de qualquer decisao logistica."

Pontos para mostrar na tela:

- `sales-event-project/docs/analytics-export.md`
- `OptiFlow/data/sales-event-exports/sales-analytics-priors.example.json`
- `OptiFlow/studies/statistics/2026-09-29-funnel-planning/evidence/summary.json`

Numeros de apoio:

- `conversionProbability = 0.75`
- `demand.mean = 2.3333`
- `demand.coefficientOfVariation = 0.202`
- estudo integrado classificado como `robust`

Transicao:

> "Agora que temos incerteza do fluxo de negocio, precisamos saber se a
> plataforma esta saudavel o bastante para executar a decisao."

## Cena 2: Plataforma Calcula SLO, Burn Rate, Anomalia e Risco

Objetivo: mostrar que confiabilidade tambem e tratada como evidencia
estatistica.

Comandos para demonstracao com plataforma ativa:

```bash
cd /Users/varnerdamasceno/github-varner/operational-observability-platform
npm run test:unit -- src/slo/slo.test.ts src/incidents/incidents.test.ts
```

Endpoints a mostrar em uma demo com API e banco ativos:

```bash
curl 'http://localhost:3000/slos/<slo-id>/burn-rate?shortWindows=1&longWindows=2'
curl 'http://localhost:3000/slos/<slo-id>/process-control?limit=4&baselineWindows=2'
curl 'http://localhost:3000/slos/<slo-id>/risk-forecast?limit=4&baselineWindows=2&riskThreshold=0.5'
```

Fala sugerida:

> "A segunda pergunta e preditiva-operacional: qual a chance de violar o SLO
> antes de a janela fechar? A plataforma nao mostra apenas alerta reativo; ela
> calcula burn rate, detecta mudanca estatistica e registra previsao com
> backtest, calibracao, falso positivo e falso negativo."

Pontos para mostrar na tela:

- `operational-observability-platform/docs/slo-error-budget.md`
- `operational-observability-platform/docs/incident-investigation.md`
- PR #28: confianca numerica de hipoteses
- PR #31: risco operacional proximo

Numeros de apoio:

- golden burn rate: janela curta `8.4`, janela longa `2.8`, severidade `page`
- risk forecast: baseline suavizado e backtest walk-forward
- incidentes: `confidenceScore` e `remainingUncertainty`

Transicao:

> "Com demanda e confiabilidade transformadas em sinais numericos, o OptiFlow
> pode avaliar decisao, nao apenas executar uma rota."

## Cena 3: OptiFlow Simula Decisao com Priors Calibrados

Objetivo: mostrar a passagem de inferencia/previsao para decisao sob perda.

Comandos:

```bash
cd /Users/varnerdamasceno/github-varner/OptiFlow
npm run study:reliability-decision
npm run study:stockout-risk
npm run scenario:decision:sensitivity
```

Fala sugerida:

> "Aqui a pergunta muda: dado o que sabemos sobre funil, demanda, SLO e risco,
> qual estrategia tem menor perda esperada? O OptiFlow compara planos com uma
> funcao de perda declarada e testa se a conclusao sobrevive a variacao dos
> priors."

Pontos para mostrar na tela:

- [`docs/reliability-decision-study.md`](reliability-decision-study.md)
- [`studies/statistics/2026-10-01-stockout-risk/study.md`](../studies/statistics/2026-10-01-stockout-risk/study.md)
- [`docs/portfolio-statistical-technical-report.md`](portfolio-statistical-technical-report.md)

Numeros de apoio:

- confiabilidade: sinal `page` muda a decisao para `exact-enumeration`
- confiabilidade: delta de perda ajustado `-804.1944`
- estoque: `vip-risk-buffer` reduz stockout ponderado de `0.2948` para
  `0.0657`
- sensibilidade: recomendacao `exact-enumeration`, `recommendation_changes = 0`

Transicao:

> "A ultima cena junta a mensagem: a recomendacao vem com intervalo, risco,
> trade-off e limitacoes."

## Cena 4: Resultado Mostra Intervalo, Risco e Trade-off

Objetivo: fechar com maturidade estatistica e nao apenas engenharia.

Comandos:

```bash
cd /Users/varnerdamasceno/github-varner/OptiFlow
npm run statistics:golden-datasets
npm run study:quasi-experimental
```

Fala sugerida:

> "O resultado e defensavel porque cada conclusao tem lastro: golden datasets
> validam formulas, estudos versionados guardam evidencias, e a linguagem
> separa inferencia, previsao e decisao. Quando a pergunta e causal, a conclusao
> e cautelosa e declara ameacas a validade."

Pontos para mostrar na tela:

- [`data/statistics/golden-datasets.v1.json`](../data/statistics/golden-datasets.v1.json)
- [`studies/statistics/2026-10-02-quasi-experimental/evidence/summary.json`](../studies/statistics/2026-10-02-quasi-experimental/evidence/summary.json)
- `/Users/varnerdamasceno/github-varner/evidence/s5.3-statistical-demo-rehearsal-2026-10-06/summary.json`

Numeros de apoio:

- Wilson 95% do funil golden: `[0.4902, 0.9433]`
- Kaplan-Meier golden: `S(1) = 0.75`, `S(3) = 0.375`
- quasi-experimental: efeito `0.045`, IC 95% `[0.0095, 0.0805]`

Fechamento sugerido:

> "Esta trilha mostra uma defesa curta de estatistica aplicada: eu defino a
> pergunta, versiono dados, calculo incerteza, avalio previsao, declaro funcao
> de perda e tomo uma decisao com limitacoes explicitas."

## Checklist de Ensaio

- [x] Cena 1 cobre dataset do Sales e funil com incerteza.
- [x] Cena 2 cobre SLO, burn rate, anomalia, risco ou confianca de hipoteses.
- [x] Cena 3 cobre simulacao do OptiFlow com priors calibrados.
- [x] Cena 4 cobre intervalo, risco, trade-off e cautela causal.
- [x] Roteiro cabe em uma defesa curta de 6 a 8 minutos.
- [x] Evidencia local registrada em
  `/Users/varnerdamasceno/github-varner/evidence/s5.3-statistical-demo-rehearsal-2026-10-06/summary.json`.

## Evidencia Local

O ensaio documentado em 2026-10-06 executou:

- `sales-event-project`: `docker run --rm -v "$PWD":/app -w /app golang:1.22-alpine go test ./internal/analytics`
- `operational-observability-platform`: `npm run test:unit -- src/slo/slo.test.ts src/incidents/incidents.test.ts`
- `OptiFlow`: `npm run statistics:golden-datasets`
- `OptiFlow`: `npm run study:funnel-planning`
- `OptiFlow`: `npm run study:reliability-decision`
- `OptiFlow`: `npm run study:stockout-risk`
- `OptiFlow`: `npm run scenario:decision:sensitivity`
- `OptiFlow`: `npm run study:quasi-experimental`

O binario `go` nao estava instalado diretamente na maquina local, mas o teste
do pacote analitico do `sales-event-project` foi validado com a imagem
`golang:1.22-alpine` via Docker/Colima. Para gravacao, a Cena 1 pode usar o
comando `analytics-export` quando Go estiver instalado, ou a fixture versionada
ja consumida pelo `OptiFlow`.
