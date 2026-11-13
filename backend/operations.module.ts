import { Controller, Get, Inject, Module, Req, Res } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";
import type { IncomingMessage, ServerResponse } from "node:http";
import { handleHealthRoute } from "../src/api/health-route.js";
import { handleMetricsRoute } from "../src/api/metrics-route.js";
import { handleStaticAssetRoute } from "../src/api/static-assets.js";
import { ApiContext } from "./runtime.module.js";

@Controller()
class OperationsController {
  constructor(@Inject(ApiContext) private readonly context: ApiContext) {}

  @Get("health")
  health(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleHealthRoute(this.context.create(request, response));
  }

  @Get("metrics")
  metrics(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleMetricsRoute(this.context.create(request, response));
  }

  @Get(["/", "app.js", "app.css"])
  assets(@Req() request: IncomingMessage, @Res() response: ServerResponse) {
    return handleStaticAssetRoute(this.context.create(request, response));
  }
}

@Module({})
export class OperationsModule {
  static register(runtime: DynamicModule): DynamicModule {
    return { module: OperationsModule, imports: [runtime], controllers: [OperationsController] };
  }
}
