# Direcao de Pesquisa

O OptiFlow faz parte de um projeto mais amplo com objetivo academico. Seu foco nao e apenas implementar um produto funcional, mas construir uma base para investigar decisoes operacionais em sistemas de venda orientados a eventos.

## Problema Central

Sistemas de venda tomam decisoes sob incerteza: demanda pode variar, pagamentos podem falhar, estoque pode ser limitado, atendimento pode formar filas e eventos assincronos podem atrasar a confirmacao do estado real.

O OptiFlow investiga como comparar e recomendar estrategias operacionais usando modelo deterministico, simulacao estatistica e otimizacao.

## Pergunta Inicial

Como escolher uma estrategia de venda que maximize resultado esperado sem elevar excessivamente o risco de ruptura, perda de receita ou sobrecarga operacional?

## Hipotese de Trabalho

Estrategias avaliadas apenas pelo resultado medio podem parecer melhores, mas estrategias que incorporam risco operacional tendem a produzir decisoes mais robustas quando demanda, pagamento, cancelamento e capacidade variam.

## Unidade Experimental Inicial

A primeira unidade experimental sera um cenario de vendas inspirado no `sales-event-project`:

- um contexto comercial, como evento ou campanha;
- itens vendaveis com preco e estoque;
- vendas observadas ou demanda assumida;
- restricoes de estoque e capacidade;
- estrategia de decisao;
- metricas de receita, perda, utilizacao e risco.

## Evolucao Experimental

1. Cenario deterministico pequeno, calculavel manualmente.
2. Heuristica de referencia para comparar estrategias simples.
3. Gerador sintetico de demanda com distribuicoes documentadas.
4. Simulacao Monte Carlo para estimar variabilidade.
5. Comparacao por media, percentis, probabilidade de ruptura e CVaR.
6. Integracao futura com snapshots ou eventos reais do `sales-event-project`.

## Criterio de Rigor

Cada resultado precisa informar:

- cenario usado;
- premissas de demanda e capacidade;
- funcao objetivo;
- restricoes;
- estrategia comparada;
- metricas;
- numero de simulacoes quando houver incerteza;
- limitacoes do modelo.
