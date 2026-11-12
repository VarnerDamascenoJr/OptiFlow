# Previsao de Demanda

O OptiFlow inclui previsao baseline da demanda operacional por local e janela
de tempo. A previsao e avaliada por MAE e RMSE em ordem temporal antes de
orientar uma decisao. O modulo usa apenas Node.js, sem dependencia externa.

## Executar

```bash
npm run demand:forecast
OPTIFLOW_OUTPUT_FORMAT=json npm run demand:forecast
node scripts/forecast-demand.js caminho/para/historico.json
```

Em JavaScript, use `forecastDemand(history, options)` e
`renderDemandForecastReport(result)`, exportados por `src/index.js`.
`options` pode sobrescrever `movingAverageWindow` e `testWindowCount` do
documento. Os padroes sao tres janelas para cada parametro.

## Contrato de Entrada

A fixture [delivery-demand-history.example.json](../data/demand/delivery-demand-history.example.json)
mostra o contrato `optiflow-demand-history.v1`:

- `id`: identificador reproduzivel do historico.
- `source.kind`: `synthetic` ou `observed`; `source.description` explica origem,
  agregacao e premissas.
- `windowDurationMinutes`: duracao fixa, positiva e representavel em
  milissegundos inteiros.
- `series`: uma serie por `locationId`, com `id`, `unit` e `observations`.
- Cada observacao informa `windowStart` em ISO UTC com `Z` e a demanda nao
  negativa dessa janela. Quantidades fracionarias sao permitidas, ate
  `Number.MAX_SAFE_INTEGER`.

As observacoes precisam representar janelas **completas**, em ordem crescente,
com a duracao declarada, sem lacunas nem duplicatas. Uma janela com demanda
zero precisa estar presente; ausencia nao significa zero. O modulo rejeita
cronologia irregular em vez de preencher ou ordenar silenciosamente.
Cada serie precisa de pelo menos `movingAverageWindow + testWindowCount`
observacoes. A unidade deve corresponder ao recurso que se pretende planejar,
por exemplo unidades de capacidade, e nao necessariamente numero de pedidos.

Esse contrato representa demanda agregada por local. Ele nao substitui o
contrato de pedidos confirmados nem a previsao de vendas por ticket do
`sales-event-project`. Um adapter futuro pode transformar exports operacionais
nesse historico, preservando independencia entre os repositorios.

## Modelos e Avaliacao

Para prever a proxima janela, os modelos fixos sao:

```text
naive:          previsao[t] = demanda[t - 1]
moving-average: previsao[t] = media(demanda[t - w], ..., demanda[t - 1])

erro[t] = previsao[t] - demanda[t]
MAE     = media(abs(erro))
RMSE    = raiz(media(erro^2))
bias    = media(erro)
```

Bias negativo indica subestimacao; positivo indica superestimacao.

As ultimas `testWindowCount` observacoes sao avaliadas por origem movel,
um passo a frente. Para cada alvo, apenas janelas anteriores participam da
previsao. Depois que o valor real desse alvo e revelado, ele pode participar
do treino para a janela seguinte. Nao ha embaralhamento nem uso do proprio
alvo na sua previsao. O resultado inclui o corte inicial entre treino e
validacao e as previsoes individuais para auditoria.

Os modelos sao comparados por MAE, depois RMSE. A previsao ingenua ganha
empates exatos. A escolha usa erros sem arredondamento; valores exibidos sao
arredondados a seis casas. A previsao da proxima janela usa todo o historico
disponivel, incluindo as janelas que ja foram reveladas durante a validacao.

As metricas reportadas pertencem a cada modelo fixo avaliado fora da amostra.
Escolher entre eles pela mesma validacao nao fornece uma estimativa independente
do desempenho futuro do processo de selecao; isso exigiria outro periodo de
teste. Os parametros nao sao ajustados automaticamente nessa validacao.

## Evidencia Sintetica

A fixture usa oito janelas horarias por local, media movel de duas janelas e
quatro alvos de validacao. Nao usa aleatoriedade nem dados de producao:

| Local | Serie | MAE ingenuo | MAE media movel | Proxima previsao escolhida |
| --- | --- | ---: | ---: | ---: |
| `north` | alternancia entre 0 e 10 | 10 | 5 | 5, media movel |
| `east` | crescimento de 2 a 16, passo 2 | 2 | 3 | 16, ingenua |

Esses valores mostram que a media movel nao e superior em todos os cenarios.
O resultado e reproduzivel com `npm run demand:forecast`.

## Uso e Limites

O resultado `optiflow-demand-forecast.v1` informa unidade, periodo de treino e
validacao, proxima janela, previsao e erros por modelo, e recomendacao por local.
Nao agrega metricas entre series com unidades diferentes. A recomendacao
compara apenas os dois baselines no historico fornecido.

As previsoes sao pontuais, sem intervalo preditivo, sazonalidade, regressao ou
garantia de calibracao. Regimes novos e mudancas na operacao podem invalidar
o desempenho historico. Uma previsao fracionaria nao e arredondada para um
pedido inteiro: essa e uma decisao operacional posterior.

Nesta etapa o resultado e inspecionavel antes de entrar no solver. Pedidos
confirmados nao sao sobrescritos nem criados automaticamente com base na
previsao. Transformar demanda agregada em pedidos, trajetos e capacidade exige
regras de negocio e avaliacao da decisao, alem do erro preditivo.

Os testes verificam valores calculados manualmente, isolamento entre series,
ausencia de vazamento temporal, origem movel, demanda zero, cronologia invalida
e execucao da CLI. O CI executa a suite e o exemplo de previsao.

Referencia: Hyndman e Athanasopoulos,
[Forecasting: Principles and Practice, capitulo 5](https://otexts.com/fpp3/toolbox.html),
secoes sobre metodos simples, acuracia e validacao cruzada temporal.
