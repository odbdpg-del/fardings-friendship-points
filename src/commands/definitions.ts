import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { adminLimits } from "./validation.js";
import { botBrand } from "../utils/branding.js";

export const commandBuilders = [
  new SlashCommandBuilder().setName("leaderboard").setDescription(`Show the lifetime ${botBrand.shortName} leaderboard.`),
  new SlashCommandBuilder().setName("weekly").setDescription(`Show this week's ${botBrand.shortName} leaderboard.`),
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription(`Show a user's ${botBrand.shortName} profile.`)
    .addUserOption((option) => option.setName("user").setDescription("User to inspect.")),
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription(`Show detailed ${botBrand.shortName} stats.`)
    .addUserOption((option) => option.setName("user").setDescription("User to inspect.")),
  new SlashCommandBuilder()
    .setName("friends")
    .setDescription("Show a user's top friendship signals.")
    .addUserOption((option) => option.setName("user").setDescription("User to inspect.")),
  new SlashCommandBuilder().setName("help").setDescription(`Show ${botBrand.name} help.`),
  new SlashCommandBuilder()
    .setName("config")
    .setDescription(`View or change ${botBrand.shortName} settings.`)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) => sub.setName("view").setDescription("View current config."))
    .addSubcommand((sub) =>
      sub
        .setName("set-points")
        .setDescription("Set point values.")
        .addIntegerOption((option) => option.setName("text").setDescription("Text message points.").setMinValue(0).setMaxValue(adminLimits.maxPointValue))
        .addIntegerOption((option) => option.setName("reply").setDescription("Reply points.").setMinValue(0).setMaxValue(adminLimits.maxPointValue))
        .addIntegerOption((option) => option.setName("media").setDescription("Media/link-only points.").setMinValue(0).setMaxValue(adminLimits.maxPointValue))
        .addIntegerOption((option) => option.setName("reaction").setDescription("Reaction points.").setMinValue(0).setMaxValue(adminLimits.maxPointValue))
        .addIntegerOption((option) => option.setName("solo_voice_hour").setDescription("Solo voice points per hour.").setMinValue(0).setMaxValue(adminLimits.maxPointValue))
        .addIntegerOption((option) => option.setName("group_voice_hour").setDescription("Group voice points per hour.").setMinValue(0).setMaxValue(adminLimits.maxPointValue))
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-cooldown")
        .setDescription("Set cooldown and text classification settings.")
        .addIntegerOption((option) => option.setName("message_seconds").setDescription("Normal message cooldown seconds.").setMinValue(0).setMaxValue(adminLimits.maxCooldownSeconds))
        .addIntegerOption((option) =>
          option.setName("reply_pair_seconds").setDescription("Repeated reply pair cooldown seconds.").setMinValue(0).setMaxValue(adminLimits.maxCooldownSeconds)
        )
        .addIntegerOption((option) =>
          option.setName("minimum_text_length").setDescription("Minimum meaningful text length.").setMinValue(1).setMaxValue(adminLimits.maxMinimumTextLength)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("set-daily-voice-cap")
        .setDescription("Set daily voice scoring cap.")
        .addIntegerOption((option) => option.setName("hours").setDescription("Daily cap in hours.").setRequired(true).setMinValue(0).setMaxValue(adminLimits.maxDailyVoiceCapHours))
    )
    .addSubcommand((sub) =>
      sub
        .setName("exclude-voice-channel")
        .setDescription("Exclude a voice channel from scoring.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Voice channel to exclude.").setRequired(true).addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("include-voice-channel")
        .setDescription("Include a voice channel in scoring again.")
        .addChannelOption((option) =>
          option.setName("channel").setDescription("Voice channel to include.").setRequired(true).addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        )
    ),
  new SlashCommandBuilder()
    .setName("weekly-post")
    .setDescription("Configure weekly recap posts.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set-channel")
        .setDescription("Set the weekly recap channel.")
        .addChannelOption((option) => option.setName("channel").setDescription("Text channel.").setRequired(true).addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand((sub) =>
      sub
        .setName("toggle")
        .setDescription("Enable or disable weekly recap posts.")
        .addBooleanOption((option) => option.setName("enabled").setDescription("Whether weekly posts are enabled.").setRequired(true))
    ),
  new SlashCommandBuilder()
    .setName("points")
    .setDescription(`Adjust ${botBrand.shortName}.`)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add points.")
        .addUserOption((option) => option.setName("user").setDescription("Target user.").setRequired(true))
        .addIntegerOption((option) => option.setName("amount").setDescription("Points to add.").setRequired(true).setMinValue(1).setMaxValue(adminLimits.maxPointAdjustment))
        .addStringOption((option) => option.setName("reason").setDescription("Audit reason.").setMaxLength(adminLimits.maxReasonLength))
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove points.")
        .addUserOption((option) => option.setName("user").setDescription("Target user.").setRequired(true))
        .addIntegerOption((option) => option.setName("amount").setDescription("Points to remove.").setRequired(true).setMinValue(1).setMaxValue(adminLimits.maxPointAdjustment))
        .addStringOption((option) => option.setName("reason").setDescription("Audit reason.").setMaxLength(adminLimits.maxReasonLength))
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set total points.")
        .addUserOption((option) => option.setName("user").setDescription("Target user.").setRequired(true))
        .addIntegerOption((option) => option.setName("amount").setDescription("New total.").setRequired(true).setMinValue(0).setMaxValue(adminLimits.maxTotalPoints))
        .addStringOption((option) => option.setName("reason").setDescription("Audit reason.").setMaxLength(adminLimits.maxReasonLength))
    ),
  new SlashCommandBuilder()
    .setName("title")
    .setDescription("Set or clear cosmetic titles.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a user's title.")
        .addUserOption((option) => option.setName("user").setDescription("Target user.").setRequired(true))
        .addStringOption((option) => option.setName("title").setDescription("Title text.").setRequired(true).setMaxLength(adminLimits.maxTitleLength))
    )
    .addSubcommand((sub) =>
      sub
        .setName("clear")
        .setDescription("Clear a user's title.")
        .addUserOption((option) => option.setName("user").setDescription("Target user.").setRequired(true))
    )
];

export const commandsJson = commandBuilders.map((command) => command.toJSON());
