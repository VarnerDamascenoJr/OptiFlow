# Estudo de Confiabilidade e Decisao

Este estudo conecta o sinal de burn rate da
`operational-observability-platform` com a funcao de perda do `OptiFlow`.

## Pergunta

Um sinal de confiabilidade deve mudar a decisao de alocacao?

## Uso

```bash
npm run study:reliability-decision
```

Para gerar JSON:

```bash
OPTIFLOW_OUTPUT_FORMAT=json npm run study:reliability-decision
```

## Contrato de Entrada

A fixture `data/reliability/reliability-decision-study.example.json` usa o
formato conceitual da resposta de burn rate da plataforma:

- `overallSeverity`: severidade agregada, por exemplo `ok`, `watch`,
  `warning` ou `page`;
- `objectives`: objetivos de SLO avaliados;
- `shortWindow` e `longWindow`: janelas usadas para classificar burn rate
  multi-janela.

No exemplo controlado, a janela curta tem burn rate `8.4` e a janela longa tem
burn rate `2.8`, portanto o sinal vira `page`.

## Interpretacao

O estudo compara dois estados:

- `steady-state-operations`: preferencias normais, nas quais atraso moderado
  ainda pode ser aceitavel quando o custo observado e menor;
- `page-reliability-response`: preferencias acionadas por burn rate degradado,
  nas quais atraso e violacao de SLO recebem penalidade maior.

A fixture foi desenhada para mostrar a mudanca de decisao: o plano anterior e
mais barato em operacao normal, mas o plano recomendado elimina atraso. Quando
o sinal de confiabilidade entra na funcao de perda, o plano recomendado passa a
minimizar perda esperada.

Isso separa metrica observada de preferencia decisoria. O burn rate nao muda o
que aconteceu no plano; ele muda o custo decisorio de aceitar mais atraso
quando a plataforma ja esta consumindo error budget rapido demais.
