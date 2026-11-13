import { Controller, Get, Inject, Module, Post, Req, Res } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  handleCreateScenarioRoute,
  handleGetScenarioRoute,
  handleValidateScenarioRoute
} from "../src/api/scenario-routes.js";
import { ApiContext } from "./runtime.module.js";

@Controller("scenarios")
class ScenariosController {
  constructor(@Inject(ApiContext) private readonly context: ApiContext) {}

  @Post("validate")
  validate(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleValidateScenarioRoute(this.context.create(request, response));
  }

  @Post()
  create(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleCreateScenarioRoute(this.context.create(request, response));
  }

  @Get(":scenarioRecordId")
  get(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleGetScenarioRoute(this.context.create(request, response));
  }
}

@Module({})
export class ScenariosModule {
  static register(runtime: DynamicModule): DynamicModule {
    return { module: ScenariosModule, imports: [runtime], controllers: [ScenariosController] };
  }
}
