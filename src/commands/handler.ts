import type { ChatInputCommandInteraction } from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import { Repositories } from "../db/repositories.js";
import { PresentationService } from "../services/presentation.js";
import { logger } from "../utils/logger.js";
import { botBrand } from "../utils/branding.js";
import { adminLimits, cleanReason, validateIntegerRange, validateTitle } from "./validation.js";

export class CommandHandler {
  private readonly presentation: PresentationService;

  constructor(private readonly repos: Repositories) {
    this.presentation = new PresentationService(repos);
  }

  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!interaction.guildId) {
      await interaction.reply({ content: `${botBrand.name} only works inside servers.`, ephemeral: true });
      return;
    }

    switch (interaction.commandName) {
      case "leaderboard":
        await interaction.reply({ embeds: [this.presentation.lifetimeLeaderboard(interaction.guildId)] });
        return;
      case "weekly":
        await interaction.reply({ embeds: [this.presentation.weeklyLeaderboard(interaction.guildId)] });
        return;
      case "profile":
        await this.replyProfile(interaction, false);
        return;
      case "stats":
        await this.replyProfile(interaction, true);
        return;
      case "friends":
        await this.replyFriends(interaction);
        return;
      case "help":
        await interaction.reply({ embeds: [this.presentation.help()], ephemeral: true });
        return;
      case "config":
        await this.handleConfig(interaction);
        return;
      case "weekly-post":
        await this.handleWeeklyPost(interaction);
        return;
      case "points":
        await this.handlePoints(interaction);
        return;
      case "title":
        await this.handleTitle(interaction);
        return;
      default:
        await interaction.reply({ content: "Unknown command.", ephemeral: true });
    }
  }

  private async replyProfile(interaction: ChatInputCommandInteraction, detailed: boolean): Promise<void> {
    const user = interaction.options.getUser("user") ?? interaction.user;
    const embed = detailed ? this.presentation.stats(interaction.guildId!, user.id, user.username) : this.presentation.profile(interaction.guildId!, user.id, user.username);
    await interaction.reply({ embeds: [embed] });
  }

  private async replyFriends(interaction: ChatInputCommandInteraction): Promise<void> {
    const user = interaction.options.getUser("user") ?? interaction.user;
    await interaction.reply({ embeds: [this.presentation.friends(interaction.guildId!, user.id, user.username)] });
  }

  private async handleConfig(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await this.requireAdmin(interaction))) return;
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    if (sub === "view") {
      await interaction.reply({ embeds: [this.presentation.config(guildId)], ephemeral: true });
      return;
    }

    if (sub === "set-points") {
      const updates: Record<string, number> = {};
      const error =
        this.copyBoundedInteger(interaction, updates, "text", "text_points", "Text points", 0, adminLimits.maxPointValue) ??
        this.copyBoundedInteger(interaction, updates, "reply", "reply_points", "Reply points", 0, adminLimits.maxPointValue) ??
        this.copyBoundedInteger(interaction, updates, "media", "media_points", "Media/link points", 0, adminLimits.maxPointValue) ??
        this.copyBoundedInteger(interaction, updates, "reaction", "reaction_points", "Reaction points", 0, adminLimits.maxPointValue) ??
        this.copyBoundedInteger(interaction, updates, "solo_voice_hour", "solo_voice_points_per_hour", "Solo voice points per hour", 0, adminLimits.maxPointValue) ??
        this.copyBoundedInteger(interaction, updates, "group_voice_hour", "group_voice_points_per_hour", "Group voice points per hour", 0, adminLimits.maxPointValue);
      if (await this.replyIfValidationError(interaction, error)) return;
      if (await this.replyIfNoUpdates(interaction, updates)) return;
      this.repos.updateSettings(guildId, updates);
      logger.info("Updated point settings", { guildId, adminId: interaction.user.id, updates });
      await interaction.reply({ content: "Point values updated.", ephemeral: true });
      return;
    }

    if (sub === "set-cooldown") {
      const updates: Record<string, number> = {};
      const error =
        this.copyBoundedInteger(interaction, updates, "message_seconds", "message_cooldown_seconds", "Message cooldown", 0, adminLimits.maxCooldownSeconds) ??
        this.copyBoundedInteger(interaction, updates, "reply_pair_seconds", "reply_pair_cooldown_seconds", "Reply pair cooldown", 0, adminLimits.maxCooldownSeconds) ??
        this.copyBoundedInteger(interaction, updates, "minimum_text_length", "minimum_text_length", "Minimum text length", 1, adminLimits.maxMinimumTextLength);
      if (await this.replyIfValidationError(interaction, error)) return;
      if (await this.replyIfNoUpdates(interaction, updates)) return;
      this.repos.updateSettings(guildId, updates);
      logger.info("Updated cooldown settings", { guildId, adminId: interaction.user.id, updates });
      await interaction.reply({ content: "Cooldown settings updated.", ephemeral: true });
      return;
    }

    if (sub === "set-daily-voice-cap") {
      const hours = interaction.options.getInteger("hours", true);
      const error = validateIntegerRange("Daily voice cap hours", hours, 0, adminLimits.maxDailyVoiceCapHours);
      if (await this.replyIfValidationError(interaction, error)) return;
      this.repos.updateSettings(guildId, { daily_voice_cap_seconds: hours * 3600 });
      logger.info("Updated daily voice cap", { guildId, adminId: interaction.user.id, hours });
      await interaction.reply({ content: `Daily voice cap set to ${hours} hours.`, ephemeral: true });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    this.repos.setVoiceChannelExcluded(guildId, channel.id, sub === "exclude-voice-channel");
    logger.info("Updated voice channel exclusion", { guildId, adminId: interaction.user.id, channelId: channel.id, excluded: sub === "exclude-voice-channel" });
    await interaction.reply({ content: `${sub === "exclude-voice-channel" ? "Excluded" : "Included"} <#${channel.id}>.`, ephemeral: true });
  }

  private async handleWeeklyPost(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await this.requireAdmin(interaction))) return;
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand();
    if (sub === "set-channel") {
      const channel = interaction.options.getChannel("channel", true);
      this.repos.updateSettings(guildId, { weekly_recap_channel_id: channel.id });
      logger.info("Updated weekly recap channel", { guildId, adminId: interaction.user.id, channelId: channel.id });
      await interaction.reply({ content: `Weekly recap channel set to <#${channel.id}>.`, ephemeral: true });
      return;
    }
    const enabled = interaction.options.getBoolean("enabled", true);
    this.repos.updateSettings(guildId, { weekly_recap_enabled: enabled ? 1 : 0 });
    logger.info("Updated weekly recap toggle", { guildId, adminId: interaction.user.id, enabled });
    await interaction.reply({ content: `Weekly recaps ${enabled ? "enabled" : "disabled"}.`, ephemeral: true });
  }

  private async handlePoints(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await this.requireAdmin(interaction))) return;
    const guildId = interaction.guildId!;
    const sub = interaction.options.getSubcommand() as "add" | "remove" | "set";
    const user = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);
    const reason = cleanReason(interaction.options.getString("reason"));

    const max = sub === "set" ? adminLimits.maxTotalPoints : adminLimits.maxPointAdjustment;
    const min = sub === "set" ? 0 : 1;
    const error = validateIntegerRange(sub === "set" ? "Total points" : "Point adjustment", amount, min, max);
    if (await this.replyIfValidationError(interaction, error)) return;

    if (sub === "set") {
      this.repos.setTotalPoints(guildId, user.id, amount, interaction.user.id, reason);
    } else {
      this.repos.recordAdminAdjustment(guildId, interaction.user.id, user.id, sub, amount, reason);
    }

    logger.info("Applied admin point change", { guildId, adminId: interaction.user.id, targetUserId: user.id, operation: sub, amount, reason });
    await interaction.reply({ content: `Updated <@${user.id}>'s points.`, ephemeral: true });
  }

  private async handleTitle(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await this.requireAdmin(interaction))) return;
    const user = interaction.options.getUser("user", true);
    const rawTitle = interaction.options.getSubcommand() === "set" ? interaction.options.getString("title", true) : null;
    const { title, error } = rawTitle ? validateTitle(rawTitle) : { title: null, error: null };
    if (await this.replyIfValidationError(interaction, error)) return;
    this.repos.setTitle(interaction.guildId!, user.id, title);
    logger.info("Updated user title", { guildId: interaction.guildId, adminId: interaction.user.id, targetUserId: user.id, title });
    await interaction.reply({ content: title ? `Set <@${user.id}>'s title to "${title}".` : `Cleared <@${user.id}>'s title.`, ephemeral: true });
  }

  private copyBoundedInteger(
    interaction: ChatInputCommandInteraction,
    updates: Record<string, number>,
    optionName: string,
    columnName: string,
    label: string,
    min: number,
    max: number
  ): string | null {
    const value = interaction.options.getInteger(optionName);
    if (value === null) return null;
    const error = validateIntegerRange(label, value, min, max);
    if (error) return error;
    updates[columnName] = value;
    return null;
  }

  private async replyIfValidationError(interaction: ChatInputCommandInteraction, error: string | null): Promise<boolean> {
    if (!error) return false;
    await interaction.reply({ content: error, ephemeral: true });
    return true;
  }

  private async replyIfNoUpdates(interaction: ChatInputCommandInteraction, updates: Record<string, number>): Promise<boolean> {
    if (Object.keys(updates).length > 0) return false;
    await interaction.reply({ content: "No settings were changed. Pick at least one option to update.", ephemeral: true });
    return true;
  }

  private async requireAdmin(interaction: ChatInputCommandInteraction): Promise<boolean> {
    const ok = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ?? false;
    if (!ok) {
      await interaction.reply({ content: "You need Manage Server permission for that.", ephemeral: true });
    }
    return ok;
  }
}
