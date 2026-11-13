import { Catch, HttpException } from "@nestjs/common";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { sendError } from "../src/api/http.js";

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<ServerResponse>();
    const failure = error as { statusCode?: number; code?: string; message?: string };

    if (failure?.statusCode && failure.code) {
      sendError(response, failure.statusCode, failure.code, failure.message);
    } else if (error instanceof HttpException) {
      const status = error.getStatus();
      sendError(response, status, status === 404 ? "not_found" : "http_error",
        status === 404 ? "Route not found" : error.message);
    } else {
      sendError(response, 500, "internal_error", "Unexpected API error", {
        message: failure?.message
      });
    }
  }
}
