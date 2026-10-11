import { runHourlyRollup } from "./hourlyRollup.js";
import { runRetentionCleanup } from "./retentionCleanup.js";
import { runForecastEvaluation } from "./forecastEvaluation.js";
import { runForecastRefresh } from "./forecastRefresh.js";
import logger from "../lib/logger.js";

const jobName = process.argv[2];

async function main() {
  logger.info({ jobName }, "Executing manual job trigger...");

  switch (jobName) {
    case "hourlyRollup":
      await runHourlyRollup();
      break;
    case "retentionCleanup":
      await runRetentionCleanup();
      break;
    case "forecastEvaluation":
      await runForecastEvaluation();
      break;
    case "forecastRefresh":
      await runForecastRefresh();
      break;
    default:
      console.log(`Usage: tsx src/jobs/runner.ts <jobName>`);
      console.log(`Available jobs: hourlyRollup, retentionCleanup, forecastEvaluation, forecastRefresh`);
      process.exit(1);
  }

  logger.info({ jobName }, "Manual job execution complete.");
  process.exit(0);
}

main().catch((err) => {
  logger.error({ err }, "Manual job execution failed");
  process.exit(1);
});
