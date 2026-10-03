import fs from "node:fs";
import path from "node:path";
import { readOptionalInteger, readOptionalNumber } from "../src/shared/numbers.js";

export function listJsonFiles(directory) {
  return fs
    .readdirSync(directory)
    .filter(function filterJson(fileName) {
      return fileName.endsWith(".json");
    })
    .sort()
    .map(function mapFile(fileName) {
      return path.join(directory, fileName);
    });
}

export function readJsonFile(filePath, rootPath = process.cwd()) {
  return JSON.parse(fs.readFileSync(resolvePath(filePath, rootPath), "utf8"));
}

export function readOptionalJsonFile(filePath, rootPath = process.cwd()) {
  if (!filePath) {
    return undefined;
  }

  return readJsonFile(filePath, rootPath);
}

export function readOptionalProfiles(value) {
  if (!value) {
    return undefined;
  }

  return value.split(",").map(function mapProfile(profile) {
    return profile.trim();
  });
}

export function readRequiredJsonArgument(argumentPath, usage, rootPath = process.cwd()) {
  if (!argumentPath) {
    console.error(usage);
    process.exit(1);
  }

  return {
    absolutePath: resolvePath(argumentPath, rootPath),
    document: readJsonFile(argumentPath, rootPath)
  };
}

export function writeJsonFile(filePath, payload, rootPath = process.cwd()) {
  return writeTextFile(filePath, JSON.stringify(payload, null, 2) + "\n", rootPath);
}

export function writeTextFile(filePath, payload, rootPath = process.cwd()) {
  const absolutePath = resolvePath(filePath, rootPath);

  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, payload);

  return absolutePath;
}

export function readSimulationOptionsFromEnv(environment = process.env) {
  return {
    iterations: readOptionalInteger(environment.OPTIFLOW_SIMULATION_ITERATIONS),
    seed: readOptionalInteger(environment.OPTIFLOW_SIMULATION_SEED)
  };
}

export function readSolverOptionsFromEnv(environment = process.env) {
  return {
    maxOrders: readOptionalInteger(environment.OPTIFLOW_SOLVER_MAX_ORDERS),
    timeoutMs: readOptionalInteger(environment.OPTIFLOW_SOLVER_TIMEOUT_MS)
  };
}

export function readUncertaintyOptionsFromEnv(environment = process.env) {
  return {
    cancellationProbability: readOptionalNumber(environment.OPTIFLOW_CANCELLATION_PROBABILITY),
    demandVariationProbability: readOptionalNumber(environment.OPTIFLOW_DEMAND_VARIATION_PROBABILITY),
    demandVariationRate: readOptionalNumber(environment.OPTIFLOW_DEMAND_VARIATION_RATE),
    travelTimeVariationRate: readOptionalNumber(environment.OPTIFLOW_TRAVEL_TIME_VARIATION_RATE)
  };
}

export function resolvePath(filePath, rootPath = process.cwd()) {
  return path.resolve(rootPath, filePath);
}
