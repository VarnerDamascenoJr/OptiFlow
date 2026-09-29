# Sensibilidade de Decisao

A analise de sensibilidade testa se uma recomendacao depende demais de uma
premissa. Ela reaproveita a funcao de perda de decisao e varia, um fator por
vez:

- priors importados do Sales;
- parametros de distribuicao usados na simulacao;
- penalidades do cenario operacional.

## Uso

```bash
npm run scenario:decision:sensitivity
```

Para gerar JSON:

```bash
OPTIFLOW_OUTPUT_FORMAT=json npm run scenario:decision:sensitivity
```

## Leitura

O relatorio mostra a decisao base e uma tabela tornado textual. Cada linha
mostra o delta de perda esperada quando o fator vai para o nivel baixo e alto.
Valores negativos favorecem a estrategia candidata; valores positivos favorecem
a estrategia base.

Exemplo de leitura:

```text
prior:cancellationProbability range=[-47.7222, -47.75] influence=1.2279 changed=false
```

Nesse caso, variar o prior de cancelamento alterou o tamanho da vantagem da
candidata, mas nao mudou a recomendacao. Quando `changed=true`, a conclusao e
fragil para aquele fator.

## Robustez

Cada perfil recebe uma classificacao:

- `robust`: nenhuma variante testada mudou a recomendacao;
- `fragile`: uma ou mais variantes mudaram a recomendacao.

A tabela nao prova causalidade. Ela e uma verificacao local de robustez:
pergunta quais premissas mudam mais a conclusao e onde a decisao precisa de
mais dados, backtesting ou estudo de sensibilidade mais amplo.
