import { createOptiFlowApiServer } from "../src/api-server.js";

const port = readPort(process.env.OPTIFLOW_API_PORT || process.env.PORT || "3000");
const host = process.env.OPTIFLOW_API_HOST || "127.0.0.1";
const server = createOptiFlowApiServer({
  defaultMaxAttempts: readOptionalPositiveInteger(process.env.OPTIFLOW_RUN_MAX_ATTEMPTS),
  defaultTimeoutMs: readOptionalPositiveInteger(process.env.OPTIFLOW_RUN_TIMEOUT_MS),
  historyFile: process.env.OPTIFLOW_HISTORY_FILE,
  optimizationConcurrency: readOptionalPositiveInteger(process.env.OPTIFLOW_RUN_CONCURRENCY)
});

server.listen(port, host, function onListening() {
  const address = server.address();
  console.log(
    JSON.stringify(
      {
        service: "optiflow-api",
        status: "listening",
        host: address.address,
        port: address.port
      },
      null,
      2
    )
  );
});

function readPort(value) {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("OPTIFLOW_API_PORT must be a valid TCP port");
  }

  return port;
}

function readOptionalPositiveInteger(value) {
  if (!value) {
    return undefined;
  }

  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : undefined;
}
