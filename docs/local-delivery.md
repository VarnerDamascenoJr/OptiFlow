# Entrega Local

O OptiFlow pode ser validado como projeto independente, sem depender dos outros
repositorios do portfolio.

## Comandos Locais

```bash
npm ci
npm run demo:local
```

O comando executa:

- `npm test`;
- `npm run scenario:small`;
- `npm run benchmark:compare`;
- `npm run scenario:small:simulate`;
- `npm run scenario:small:risk`.

## API e Interface

```bash
npm run api
```

Padroes:

| Variavel | Padrao |
| --- | --- |
| `OPTIFLOW_API_HOST` | `127.0.0.1` |
| `OPTIFLOW_API_PORT` | `3000` |
| `OPTIFLOW_HISTORY_FILE` | `.optiflow/optimization-history.json` |

Abra `http://127.0.0.1:3000` para usar a interface local.

## Docker

```bash
docker compose up --build
```

A API fica disponivel em `http://127.0.0.1:3000`. O historico local fica em um
volume Docker chamado `optiflow-history`.

Para encerrar:

```bash
docker compose down
```

## CI

O workflow `.github/workflows/ci.yml` roda testes, cenario pequeno, benchmark,
simulacao estatistica, comparacao de risco e checagem de whitespace em pushes
para `main` e pull requests.

Link do workflow:
<https://github.com/VarnerDamascenoJr/OptiFlow/actions/workflows/ci.yml>.

## Problemas Conhecidos

- O projeto declara Node via `.nvmrc`; use `nvm install` se a versao ainda nao
  estiver disponivel localmente.
- A fila de execucao ainda e local em memoria. Ao reiniciar a API, jobs em
  andamento sao perdidos, mas resultados ja persistidos continuam no arquivo de
  historico.
- A imagem Docker usa volume para `/data`; remova o volume somente quando quiser
  descartar historico local.
