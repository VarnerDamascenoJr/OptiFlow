import { Controller, Get, Inject, Module, Post, Req, Res } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  handleCreateOptimizationRunRoute,
  handleGetOptimizationRunRoute
} from "../src/api/optimization-run-routes.js";
import { ApiContext } from "./runtime.module.js";

@Controller("optimization-runs")
class OptimizationRunsController {
  constructor(@Inject(ApiContext) private readonly context: ApiContext) {}

  @Post()
  create(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleCreateOptimizationRunRoute(this.context.create(request, response));
  }

  @Get(":optimizationRunId")
  get(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleGetOptimizationRunRoute(this.context.create(request, response));
  }
}

@Module({})
export class OptimizationRunsModule {
  static register(runtime: DynamicModule): DynamicModule {
    return { module: OptimizationRunsModule, imports: [runtime], controllers: [OptimizationRunsController] };
  }
}
