import { Inject, Injectable, Module } from "@nestjs/common";
import type { DynamicModule, OnApplicationShutdown } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createJsonLogger, logOptimizationRunEvent } from "../src/api/logger.js";
import { createOptimizationHistoryRepository } from "../src/optimization-history.js";
import { createOptimizationRunQueue } from "../src/optimization-run-queue.js";
import { solveScenario } from "../src/index.js";

export const API_OPTIONS = Symbol("API_OPTIONS");
export const HISTORY_REPOSITORY = Symbol("HISTORY_REPOSITORY");
export const OPTIMIZATION_QUEUE = Symbol("OPTIMIZATION_QUEUE");

export interface ApiOptions {
  bodyLimitBytes?: number;
  defaultMaxAttempts?: number;
  defaultTimeoutMs?: number;
  environment?: string;
  historyFile?: string;
  logger?: { info(payload: unknown): void };
  optimizationConcurrency?: number;
  repository?: ReturnType<typeof createOptimizationHistoryRepository>;
  runQueue?: ReturnType<typeof createOptimizationRunQueue>;
  serviceName?: string;
  solve?: typeof solveScenario;
}

@Injectable()
export class ApiContext implements OnApplicationShutdown {
  constructor(
    @Inject(API_OPTIONS) private readonly options: ApiOptions,
    @Inject(HISTORY_REPOSITORY) readonly repository: ReturnType<typeof createOptimizationHistoryRepository>,
    @Inject(OPTIMIZATION_QUEUE) readonly runQueue: ReturnType<typeof createOptimizationRunQueue>
  ) {}

  create(request: IncomingMessage, response: ServerResponse) {
    return {
      request,
      response,
      url: new URL(request.url || "/", "http://localhost"),
      dependencies: {
        bodyLimitBytes: this.options.bodyLimitBytes,
        environment: this.options.environment,
        repository: this.repository,
        runQueue: this.runQueue,
        service: this.options.serviceName
      }
    };
  }

  async onApplicationShutdown() {
    await this.runQueue.onIdle();
  }
}

@Module({})
export class RuntimeModule {
  static register(input: ApiOptions = {}): DynamicModule {
    const options = {
      ...input,
      bodyLimitBytes: input.bodyLimitBytes ?? 1024 * 1024,
      environment: input.environment || process.env.OPTIFLOW_ENVIRONMENT || "local",
      serviceName: input.serviceName || process.env.OPTIFLOW_SERVICE_NAME || "optiflow-api"
    };

    if (!Number.isSafeInteger(options.bodyLimitBytes) || options.bodyLimitBytes <= 0) {
      throw new TypeError("bodyLimitBytes must be a positive safe integer");
    }

    return {
      module: RuntimeModule,
      providers: [
        { provide: API_OPTIONS, useValue: options },
        {
          provide: HISTORY_REPOSITORY,
          useFactory: () => options.repository || createOptimizationHistoryRepository(options.historyFile)
        },
        {
          provide: OPTIMIZATION_QUEUE,
          inject: [HISTORY_REPOSITORY],
          useFactory: (repository: ReturnType<typeof createOptimizationHistoryRepository>) => {
            if (options.runQueue) return options.runQueue;

            const defaults = { environment: options.environment, service: options.serviceName };
            const logger = options.logger || createJsonLogger(defaults);
            return createOptimizationRunQueue({
              concurrency: options.optimizationConcurrency,
              defaultMaxAttempts: options.defaultMaxAttempts,
              defaultTimeoutMs: options.defaultTimeoutMs,
              onEvent(event: unknown) { logOptimizationRunEvent(logger, event, defaults); },
              repository,
              solve: options.solve || solveScenario
            });
          }
        },
        ApiContext
      ],
      exports: [ApiContext, HISTORY_REPOSITORY, OPTIMIZATION_QUEUE]
    };
  }
}
