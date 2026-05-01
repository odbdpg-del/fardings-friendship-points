import { REST, Routes } from "discord.js";
import { env } from "./config/env.js";
import { commandsJson } from "./commands/definitions.js";
import { logger } from "./utils/logger.js";

const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);

if (env.DISCORD_GUILD_ID) {
  await rest.put(Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID), { body: commandsJson });
  logger.info(`Registered ${commandsJson.length} guild slash commands.`);
} else {
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: commandsJson });
  logger.info(`Registered ${commandsJson.length} global slash commands.`);
}
