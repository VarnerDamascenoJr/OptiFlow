import { forecastDemand, renderDemandForecastReport } from "../src/index.js";
import { readRequiredJsonArgument } from "./shared-cli.js";

const history = readRequiredJsonArgument(
  process.argv[2],
  "Usage: node scripts/forecast-demand.js <demand-history.json>"
).document;
const forecast = forecastDemand(history);

if (process.env.OPTIFLOW_OUTPUT_FORMAT === "json") {
  console.log(JSON.stringify(forecast, null, 2));
} else {
  process.stdout.write(renderDemandForecastReport(forecast));
}
