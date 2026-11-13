import { createOptiFlowApplication } from "../src/api-server.js";
import { readOptionalPositiveInteger, readTcpPort } from "../src/shared/numbers.js";

const port = readTcpPort(process.env.OPTIFLOW_API_PORT || process.env.PORT || "3000", "OPTIFLOW_API_PORT");
const host = process.env.OPTIFLOW_API_HOST || "127.0.0.1";
const app = await createOptiFlowApplication({
  defaultMaxAttempts: readOptionalPositiveInteger(process.env.OPTIFLOW_RUN_MAX_ATTEMPTS),
  defaultTimeoutMs: readOptionalPositiveInteger(process.env.OPTIFLOW_RUN_TIMEOUT_MS),
  historyFile: process.env.OPTIFLOW_HISTORY_FILE,
  optimizationConcurrency: readOptionalPositiveInteger(process.env.OPTIFLOW_RUN_CONCURRENCY)
});

app.enableShutdownHooks(["SIGINT", "SIGTERM"]);
await app.listen(port, host);
const address = app.getHttpServer().address();
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
