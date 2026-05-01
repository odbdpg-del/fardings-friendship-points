import type { Client } from "discord.js";
import { CommandHandler } from "../commands/handler.js";
import { ScoringService } from "../scoring/scoringService.js";
import { MentionResponder } from "../services/mentionResponder.js";
import { VoiceService } from "../services/voiceService.js";
import { logger } from "../utils/logger.js";
import { botBrand } from "../utils/branding.js";

export function registerEvents(client: Client, services: { commands: CommandHandler; scoring: ScoringService; voice: VoiceService }): void {
  const mentionResponder = new MentionResponder();

  client.once("ready", () => {
    logger.info(`${botBrand.name} logged in as ${client.user?.tag ?? "unknown bot"}`);
    services.voice.recoverActiveSessions();
    for (const guild of client.guilds.cache.values()) {
      services.voice.settleGuild(guild);
    }
  });

  client.on("messageCreate", (message) => {
    mentionResponder.maybeReply(message).catch((error) => logger.error("Failed to respond to mention", error));
    services.scoring.scoreMessage(message).catch((error) => logger.error("Failed to score message", error));
  });

  client.on("messageReactionAdd", (reaction, user) => {
    services.scoring.scoreReaction(reaction, user).catch((error) => logger.error("Failed to score reaction", error));
  });

  client.on("voiceStateUpdate", (oldState, newState) => {
    services.voice.handleVoiceStateUpdate(oldState, newState).catch((error) => logger.error("Failed to process voice state", error));
  });

  client.on("interactionCreate", (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    services.commands.handle(interaction).catch(async (error) => {
      logger.error("Command failed", error);
      const payload = { content: "Something went sideways while running that command.", ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => undefined);
      } else {
        await interaction.reply(payload).catch(() => undefined);
      }
    });
  });
}
