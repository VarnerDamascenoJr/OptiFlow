import validateScenario from "../validate-scenario.js";
import { sendError } from "./http.js";

export function validateScenarioForApi(response, scenario) {
  try {
    validateScenario(scenario);
    return true;
  } catch (error) {
    sendError(response, 422, "validation_failed", error.message);
    return false;
  }
}
