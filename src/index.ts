import { env } from "./config/env.js";
import { createBotClient } from "./client.js";
import { createDatabase } from "./db/database.js";
import { Repositories } from "./db/repositories.js";
import { AntiAbuseService } from "./scoring/antiAbuse.js";
import { ScoringService } from "./scoring/scoringService.js";
import { CommandHandler } from "./commands/handler.js";
import { VoiceService } from "./services/voiceService.js";
import { WeeklyRecapService } from "./services/weeklyRecapService.js";
import { startWeeklyScheduler } from "./scheduler/weeklyScheduler.js";
import { registerEvents } from "./events/registerEvents.js";
import { logger } from "./utils/logger.js";
import { botBrand } from "./utils/branding.js";

const db = createDatabase();
const repos = new Repositories(db);
const client = createBotClient();

const voice = new VoiceService(repos);
const services = {
  commands: new CommandHandler(repos),
  scoring: new ScoringService(repos, new AntiAbuseService(db)),
  voice
};

registerEvents(client, services);
startWeeklyScheduler(client, new WeeklyRecapService(repos));

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

client.login(env.DISCORD_TOKEN).catch((error) => {
  logger.error("Failed to login", error);
  process.exit(1);
});

function shutdown(signal: string): void {
  logger.info(`Received ${signal}, closing ${botBrand.name}.`);
  for (const guild of client.guilds.cache.values()) {
    voice.settleGuild(guild);
  }
  db.close();
  client.destroy();
  process.exit(0);
}
