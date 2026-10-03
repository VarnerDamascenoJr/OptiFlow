import { sendJson } from "./http.js";

export function handleHealthRoute(requestContext) {
  sendJson(requestContext.response, 200, { status: "ok", service: "optiflow-api" });
}
