import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ApiErrorFilter } from "./api-error.filter.js";
import { AppModule } from "./app.module.js";
import type { ApiOptions } from "./runtime.module.js";

export async function createOptiFlowApplication(options: ApiOptions = {}) {
  const app = await NestFactory.create(AppModule.register(options), {
    abortOnError: false,
    bodyParser: false,
    logger: false
  });

  // The existing bounded JSON reader owns parsing and its public error envelope.
  app.getHttpAdapter().getInstance().disable("x-powered-by");
  app.useGlobalFilters(new ApiErrorFilter());
  await app.init();
  return app;
}
