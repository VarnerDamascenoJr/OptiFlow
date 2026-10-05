# Golden Datasets Estatisticos

Os golden datasets sao fixtures pequenas com resultados esperados conhecidos.
Eles existem para testar formulas importantes do portfolio sem depender de
banco, filas, dashboards ou servicos externos.

## Uso

```bash
npm run statistics:golden-datasets
```

Para gerar JSON:

```bash
OPTIFLOW_OUTPUT_FORMAT=json npm run statistics:golden-datasets
```

## Cobertura

A fixture `data/statistics/golden-datasets.v1.json` cobre quatro familias de
calculo:

- `funnel`: proporcao binomial e intervalo de Wilson para conversao.
- `survival`: curva Kaplan-Meier discreta com observacoes censuradas.
- `sloBurnRate`: burn rate multi-janela com severidade esperada.
- `simulation`: simulacao deterministica por seed e estrategia.

Esses blocos representam os tres dominios do portfolio:

- `sales-event-project`: funil, sobrevivencia e estoque temporal;
- `operational-observability-platform`: SLO, error budget e burn rate;
- `OptiFlow`: simulacao, estrategia e resultado esperado por seed.

## Interpretacao

O objetivo nao e afirmar que essas fixtures representam dados reais. O objetivo
e garantir que formulas essenciais continuem auditaveis. Quando uma formula
mudar de proposito, o golden dataset deve mudar junto com uma explicacao no
diff.

## Validacao

O teste `test/golden-datasets.test.js` recalcula os resultados esperados e
falha quando qualquer valor diverge. O comando de validacao tambem retorna
codigo de saida diferente de zero quando algum check falha.
