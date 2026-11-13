import { Module } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import { OperationsModule } from "./operations.module.js";
import { OptimizationRunsModule } from "./optimization-runs.module.js";
import { RuntimeModule } from "./runtime.module.js";
import type { ApiOptions } from "./runtime.module.js";
import { ScenariosModule } from "./scenarios.module.js";

@Module({})
export class AppModule {
  static register(options: ApiOptions): DynamicModule {
    const runtime = RuntimeModule.register(options);
    return {
      module: AppModule,
      imports: [
        ScenariosModule.register(runtime),
        OptimizationRunsModule.register(runtime),
        OperationsModule.register(runtime)
      ]
    };
  }
}
