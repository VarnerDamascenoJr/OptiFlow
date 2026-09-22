# Perguntas Estatisticas do Portfolio

Este documento define a atividade S0.1 do backlog estatistico do portfolio. Ele
serve como contrato inicial entre os tres projetos antes de qualquer
implementacao tecnica pesada: cada entrega futura deve responder a uma pergunta
estatistica explicita, com estimando, dados, metodo e evidencia esperada.

## Escopo

A fase estatistica do portfolio segue a cadeia:

```text
eventos operacionais -> dados estatisticos -> incerteza quantificada ->
previsao e confiabilidade -> decisao sob risco -> validacao empirica
```

Os papeis dos repositorios sao:

- `sales-event-project`: gera dados observacionais de demanda, funil,
  pagamentos, estoque, retries, emails e check-ins.
- `operational-observability-platform`: mede confiabilidade, SLOs, burn rate,
  latencia, anomalias e evidencias de incidentes.
- `OptiFlow`: consome priors, simulacoes e previsoes para comparar decisoes sob
  incerteza.

## Perguntas Centrais

| ID | Tipo | Pergunta | Estimando | Unidade experimental | Janela temporal | Dados necessarios | Metodo inicial | Projeto que gera | Projeto que calcula | Projeto que consome | Evidencia esperada |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RQ1 | Descritiva | Qual a probabilidade de uma venda aceita virar check-in realizado? | Probabilidade de conversao aceita -> check-in, com intervalo de incerteza | Venda aceita | Coorte por evento e janela de venda | Eventos de venda, pagamento, ticket emitido e check-in | Proporcao binomial com intervalo de confianca e modelo Beta-Binomial simples | `sales-event-project` | `sales-event-project` | `OptiFlow` | Fixture com funil, tabela por coorte e interpretacao do intervalo |
| RQ2 | Descritiva | Quanto tempo uma venda leva para avancar entre etapas operacionais? | Mediana, percentis e hazard por etapa | Venda aceita ou pendente | Tempo desde criacao da venda ate pagamento, email ou check-in | Timestamps de status, pagamento, email e check-in; flag de censura | Analise de sobrevivencia discreta ou Kaplan-Meier simplificado | `sales-event-project` | `sales-event-project` | `OptiFlow` | Relatorio com observacoes completas e censuradas, mediana ou percentis |
| RQ3 | Preditiva | Quanta demanda esperamos na proxima janela por tipo de ticket? | Distribuicao preditiva ou previsao pontual com erro esperado | Tipo de ticket em uma janela | 1 min, 5 min, 1 h e 1 dia, conforme maturidade dos dados | Serie temporal de vendas por ticket, evento e canal | Baseline temporal com media movel ou sazonal simples, avaliado por MAE e RMSE | `sales-event-project` | `sales-event-project` | `OptiFlow` | Split temporal treino/teste, metricas fora da amostra e forecast exportavel |
| RQ4 | Decisoria | Qual a chance de esgotar um tipo de ticket antes do evento e qual decisao reduz essa perda? | Probabilidade de stockout e perda esperada por politica | Tipo de ticket por evento | Horizonte restante ate o evento | Estoque inicial, vendas realizadas, forecast de demanda e regras de capacidade | Simulacao preditiva com funcao de perda para stockout e sobra | `sales-event-project` | `OptiFlow` | `OptiFlow` | Comparacao de politicas com perda esperada, VaR ou CVaR |
| RQ5 | Descritiva | O SLO esta degradado ou a janela observada ainda e compativel com variacao amostral? | Taxa de sucesso, error budget consumido e intervalo de incerteza | Requisicao ou evento observado | Janelas rolantes curtas e longas | Eventos de sucesso/falha, timestamps, servico e endpoint | Estimacao binomial/Beta-Binomial por janela rolante | `operational-observability-platform` | `operational-observability-platform` | `OptiFlow` | Tabela de SLO por janela com classificacao de incerteza e tamanho amostral |
| RQ6 | Preditiva | Qual e o risco operacional nas proximas janelas dado o burn rate recente? | Probabilidade de violar o error budget no horizonte definido | Servico em uma janela | Multi-janela, por exemplo 5 min, 30 min, 1 h e 6 h | Series temporais de erros, volume e latencia | Burn rate multi-janela com extrapolacao conservadora e validacao historica | `operational-observability-platform` | `operational-observability-platform` | `OptiFlow` | Alerta reproduzivel com forecast de risco e explicacao da evidencia |
| RQ7 | Decisoria | Qual estrategia operacional reduz CVaR sem aumentar demais o custo esperado? | Diferenca de custo esperado, CVaR e probabilidade de atraso entre estrategias | Cenario de decisao simulado | Conjunto de simulacoes por seed e periodo importado | Priors de demanda, tempo, conversao, falhas e restricoes de capacidade | Monte Carlo com erro padrao, intervalo de confianca e analise de sensibilidade | `sales-event-project`, `operational-observability-platform` | `OptiFlow` | `OptiFlow` | Comparacao entre estrategias com convergencia, risco de cauda e recomendacao |
| RQ8 | Causal | Uma mudanca operacional melhorou conversao ou confiabilidade alem de ruido temporal? | Efeito medio da intervencao sobre conversao, latencia ou taxa de falha | Coorte antes/depois, evento, endpoint ou segmento | Periodo pre e pos mudanca, com janela de washout documentada | Series antes/depois, exposicao a mudanca, covariaveis e possiveis confundidores | Desenho quase-experimental simples: before/after estratificado ou diferencas-em-diferencas quando houver grupo comparavel | `sales-event-project`, `operational-observability-platform` | Repositorio dono da mudanca | `OptiFlow` | Relatorio com pressupostos, ameacas a validade e estimativa de efeito |

## Regras para Usar as Perguntas

- Cada item S1, S2, S3, S4 ou S5 deve apontar para pelo menos uma pergunta
  `RQ`.
- Uma metrica so entra no portfolio quando estiver conectada a um estimando ou a
  uma decisao.
- Resultados pontuais devem ser acompanhados de incerteza quando a amostra ou a
  variabilidade afetarem a conclusao.
- Previsoes devem ser avaliadas em dados fora da amostra, respeitando a ordem
  temporal.
- Decisoes devem declarar a funcao de perda, o horizonte e o trade-off aceito.
- Perguntas causais exigem pressupostos explicitos; se eles forem fracos, a
  conclusao deve ser escrita como associacao, nao como causalidade.

## Mapeamento Inicial para o Backlog

| Backlog | Perguntas relacionadas | Observacao |
| --- | --- | --- |
| S1.1 Export analitico | RQ1, RQ2, RQ3, RQ4 | Define o dataset base para funil, tempo ate evento, demanda e estoque |
| S1.2 Funil com incerteza | RQ1 | Primeira entrega inferencial do Sales |
| S1.3 Sobrevivencia | RQ2 | Introduz censura explicitamente |
| S1.4 Demanda | RQ3 | Cria baseline preditivo temporal |
| S1.5 Estoque | RQ4 | Conecta previsao a decisao sob perda |
| S1.6 Priors | RQ3, RQ4, RQ7 | Exporta distribuicoes para simulacao no `OptiFlow` |
| S2.1 SLO rolante | RQ5 | Evita conclusao fragil com baixa amostra |
| S2.2 Burn rate multi-janela | RQ6 | Transforma confiabilidade em risco prospectivo |
| S2.3 Latencia distribuicional | RQ5, RQ6 | Troca medias por quantis e cauda |
| S2.4 Controle estatistico | RQ5, RQ6 | Separa ruido comum de mudanca estrutural |
| S2.5 Hipoteses de incidente | RQ6 | Atualiza confianca conforme evidencias chegam |
| S2.6 Risco operacional | RQ6, RQ7 | Alimenta simulacao e decisao |
| S3.1 Priors do Sales | RQ3, RQ4, RQ7 | Calibra a simulacao com dados observados |
| S3.2 Erro Monte Carlo | RQ7 | Quantifica precisao da simulacao |
| S3.3 Comparar estrategias | RQ7 | Evita conclusao baseada so em media pontual |
| S3.4 Funcao de perda | RQ4, RQ7 | Torna a decisao auditavel |
| S3.5 Backtesting | RQ3, RQ4, RQ6, RQ7 | Valida previsao e decisao empiricamente |
| S3.6 Sensibilidade | RQ4, RQ7 | Testa robustez de conclusoes |
| S4.1 Funil e planejamento | RQ1, RQ3, RQ7 | Primeiro estudo integrado recomendado |
| S4.2 Confiabilidade e decisao | RQ5, RQ6, RQ7 | Integra SLO, risco e simulacao |
| S4.3 Estoque e risco | RQ3, RQ4, RQ7 | Conecta forecast, stockout e perda |
| S4.4 Quase-experimental | RQ8 | Demonstra maturidade causal com cautela |
| S5.2 Relatorio tecnico | Todas | Consolida metodos, limitacoes e evidencias |
| S5.3 Roteiro gravavel | Todas | Traduz a trilha estatistica para demo curta |
