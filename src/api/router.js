import { handleHealthRoute } from "./health-route.js";
import { sendError } from "./http.js";
import { handleMetricsRoute } from "./metrics-route.js";
import {
  handleCreateOptimizationRunRoute,
  handleGetOptimizationRunRoute
} from "./optimization-run-routes.js";
import {
  handleCreateScenarioRoute,
  handleGetScenarioRoute,
  handleValidateScenarioRoute
} from "./scenario-routes.js";
import { handleStaticAssetRoute, isStaticAssetPath } from "./static-assets.js";

const apiRoutes = [
  {
    method: "GET",
    matchesPath: isStaticAssetPath,
    handler: handleStaticAssetRoute
  },
  {
    method: "GET",
    matchesPath: matchExactPath("/health"),
    handler: handleHealthRoute
  },
  {
    method: "GET",
    matchesPath: matchExactPath("/metrics"),
    handler: handleMetricsRoute
  },
  {
    method: "POST",
    matchesPath: matchExactPath("/scenarios/validate"),
    handler: handleValidateScenarioRoute
  },
  {
    method: "POST",
    matchesPath: matchExactPath("/scenarios"),
    handler: handleCreateScenarioRoute
  },
  {
    method: "GET",
    matchesPath: matchPathPrefix("/scenarios/"),
    handler: handleGetScenarioRoute
  },
  {
    method: "POST",
    matchesPath: matchExactPath("/optimization-runs"),
    handler: handleCreateOptimizationRunRoute
  },
  {
    method: "GET",
    matchesPath: matchPathPrefix("/optimization-runs/"),
    handler: handleGetOptimizationRunRoute
  }
];

export async function handleApiRequest(request, response, dependencies) {
  const requestContext = createApiRequestContext(request, response, dependencies);
  const route = findApiRoute(requestContext);

  if (!route) {
    sendError(response, 404, "not_found", "Route not found");
    return;
  }

  await route.handler(requestContext);
}

function createApiRequestContext(request, response, dependencies) {
  const url = new URL(request.url, "http://localhost");

  return {
    dependencies: dependencies,
    method: request.method || "GET",
    request: request,
    response: response,
    url: url
  };
}

function findApiRoute(requestContext) {
  return apiRoutes.find(function findRoute(route) {
    return route.method === requestContext.method && route.matchesPath(requestContext.url.pathname);
  });
}

function matchExactPath(expectedPathname) {
  return function matchesExactPath(pathname) {
    return pathname === expectedPathname;
  };
}

function matchPathPrefix(expectedPrefix) {
  return function matchesPathPrefix(pathname) {
    return pathname.startsWith(expectedPrefix);
  };
}
