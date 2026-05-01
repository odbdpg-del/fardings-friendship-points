import type { Client } from "discord.js";
import cron from "node-cron";
import { env } from "../config/env.js";
import { WeeklyRecapService } from "../services/weeklyRecapService.js";
import { logger } from "../utils/logger.js";

export function startWeeklyScheduler(client: Client, recaps: WeeklyRecapService): void {
  cron.schedule(env.WEEKLY_CRON, () => {
    recaps.postDueRecaps(client).catch((error) => logger.error("Weekly recap failed", error));
  });
  logger.info(`Weekly recap scheduler active: ${env.WEEKLY_CRON}`);
}
