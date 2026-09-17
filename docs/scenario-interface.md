# Interface de Cenarios

A primeira interface do OptiFlow e um console local servido pela propria API. Ela
prioriza fluxo operacional direto: editar JSON do cenario, validar, persistir,
executar heuristica e solver, acompanhar status e comparar metricas principais.

## Executar

```bash
npm run api
```

Abra `http://127.0.0.1:3000`.

## Fluxo Principal

1. Carregar ou editar o cenario no editor.
2. Validar a entrada.
3. Salvar o snapshot do cenario.
4. Enfileirar comparacao entre `nearest-neighbor-capacity` e
   `exact-enumeration`.
5. Consultar status ate `SUCCEEDED` ou `FAILED`.
6. Comparar custo, distancia, atraso, demandas atendidas e nao atendidas.

Esta interface ainda e propositalmente local e sem build frontend. Ela existe
para demonstrar a experiencia principal antes de introduzir uma stack web
maior.
