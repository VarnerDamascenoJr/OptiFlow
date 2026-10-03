import fs from "node:fs";
import path from "node:path";
import { sendError } from "./http.js";

export function isStaticAssetPath(pathname) {
  return pathname === "/" || pathname === "/app.css" || pathname === "/app.js";
}

export function handleStaticAssetRoute(requestContext) {
  serveStaticAsset(requestContext.url.pathname, requestContext.response);
}

function serveStaticAsset(pathname, response) {
  const fileName = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.join(process.cwd(), "public", fileName);
  const contentTypes = {
    "app.css": "text/css; charset=utf-8",
    "app.js": "application/javascript; charset=utf-8",
    "index.html": "text/html; charset=utf-8"
  };

  if (!fs.existsSync(filePath)) {
    sendError(response, 404, "static_asset_not_found", "Static asset not found");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[fileName]
  });
  response.end(fs.readFileSync(filePath));
}
