import { EmbedBuilder } from "discord.js";
import { Repositories } from "../db/repositories.js";
import { getWeekStart } from "../utils/time.js";
import { botBrand } from "../utils/branding.js";

const labels = ["Most Suspiciously Social", "Certified Yapper", "Reply Goblin", "Emoji Menace", "Voice Cryptid"];

export function labelForRank(index: number): string {
  return labels[index] ?? "Friendship Enjoyer";
}

export function formatPoints(points: number): string {
  return `${points.toLocaleString()} ${botBrand.pointsAbbreviation}`;
}

export class PresentationService {
  constructor(private readonly repos: Repositories) {}

  lifetimeLeaderboard(guildId: string): EmbedBuilder {
    const rows = this.repos.getLifetimeLeaderboard(guildId, 10);
    return new EmbedBuilder()
      .setTitle(`Lifetime ${botBrand.shortName}`)
      .setDescription(rows.length ? rows.map((row, i) => this.leaderboardLine(row, i, "total_points")).join("\n") : "Nobody has points yet. Tragic. Inspirational, even.")
      .setColor(0xffc857);
  }

  weeklyLeaderboard(guildId: string): EmbedBuilder {
    const rows = this.repos.getWeeklyLeaderboard(guildId, 10);
    return new EmbedBuilder()
      .setTitle(`Weekly ${botBrand.shortName} (${getWeekStart()})`)
      .setDescription(rows.length ? rows.map((row, i) => this.weeklyLine(row, i)).join("\n") : "The weekly board is empty. Peace has won, somehow.")
      .setColor(0x5cc8ff);
  }

  profile(guildId: string, userId: string, username: string): EmbedBuilder {
    const lifetime = this.repos.getUserStats(guildId, userId);
    const weekly = this.repos.getWeeklyStats(guildId, userId);
    const rank = this.repos.getRank(guildId, userId);
    return new EmbedBuilder()
      .setTitle(`${username}'s ${botBrand.shortName} Profile`)
      .setDescription(`${lifetime.equipped_title ? `**${lifetime.equipped_title}**\n` : ""}${formatPoints(lifetime.total_points)} lifetime${rank ? ` | Rank #${rank}` : ""}`)
      .addFields(
        { name: "This Week", value: `${formatPoints(weekly.points)} | ${weekly.replies} replies | ${weekly.reactions} reactions`, inline: false },
        { name: "Lifetime Chaos", value: `${lifetime.lifetime_messages} messages | ${lifetime.lifetime_replies} replies | ${lifetime.lifetime_media_posts} media/link posts`, inline: false },
        { name: "Voice Time", value: `${formatDuration(lifetime.lifetime_voice_seconds_solo)} solo | ${formatDuration(lifetime.lifetime_voice_seconds_group)} group`, inline: false }
      )
      .setColor(0x8bd450);
  }

  stats(guildId: string, userId: string, username: string): EmbedBuilder {
    const lifetime = this.repos.getUserStats(guildId, userId);
    const weekly = this.repos.getWeeklyStats(guildId, userId);
    return new EmbedBuilder()
      .setTitle(`${username}'s Stats`)
      .addFields(
        { name: "Points", value: `Lifetime: ${lifetime.total_points}\nWeekly: ${weekly.points}\nAdmin adjustment total: ${lifetime.admin_adjustment_total}`, inline: true },
        { name: "Text", value: `Messages: ${lifetime.lifetime_messages}\nReplies: ${lifetime.lifetime_replies}\nMedia/link posts: ${lifetime.lifetime_media_posts}`, inline: true },
        { name: "Social", value: `Reactions given: ${lifetime.lifetime_reactions_given}\nSolo voice: ${formatDuration(lifetime.lifetime_voice_seconds_solo)}\nGroup voice: ${formatDuration(lifetime.lifetime_voice_seconds_group)}`, inline: true }
      )
      .setColor(0xc084fc);
  }

  friends(guildId: string, userId: string, username: string): EmbedBuilder {
    const rows = this.repos.getTopFriends(guildId, userId, 3);
    return new EmbedBuilder()
      .setTitle(`${username}'s Friendship Radar`)
      .setDescription(
        rows.length
          ? rows.map((row, i) => this.friendLine(row, i)).join("\n")
          : "No best-friend signals yet. FarDing is staring at an empty corkboard."
      )
      .setFooter({ text: "Replies count as 2 signals. Reactions count as 1 signal." })
      .setColor(0xec4899);
  }

  config(guildId: string): EmbedBuilder {
    const settings = this.repos.getSettings(guildId);
    const excluded = [...this.repos.getExcludedVoiceChannels(guildId)];
    return new EmbedBuilder()
      .setTitle(`${botBrand.name} Config`)
      .addFields(
        { name: "Points", value: `Text ${settings.text_points}, Reply ${settings.reply_points}, Media ${settings.media_points}, Reaction ${settings.reaction_points}`, inline: false },
        { name: "Voice", value: `Solo/hr ${settings.solo_voice_points_per_hour}, Group/hr ${settings.group_voice_points_per_hour}, Daily cap ${formatDuration(settings.daily_voice_cap_seconds)}`, inline: false },
        { name: "Anti-Abuse", value: `Message cooldown ${settings.message_cooldown_seconds}s, Reply pair cooldown ${settings.reply_pair_cooldown_seconds}s, Min text ${settings.minimum_text_length}`, inline: false },
        { name: "Weekly Recap", value: `Enabled: ${Boolean(settings.weekly_recap_enabled)}\nChannel: ${settings.weekly_recap_channel_id ? `<#${settings.weekly_recap_channel_id}>` : "unset"}`, inline: false },
        { name: "Excluded Voice Channels", value: excluded.length ? excluded.map((id) => `<#${id}>`).join(", ") : "none", inline: false }
      )
      .setColor(0xf97316);
  }

  help(): EmbedBuilder {
    return new EmbedBuilder()
      .setTitle(`${botBrand.name} Help`)
      .setDescription(`${botBrand.mascotName} hands out points for meaningful chat, replies, reactions, and voice time. Spammy nonsense gets side-eyed by the scoring engine.`)
      .addFields(
        { name: "Public", value: "`/leaderboard`, `/weekly`, `/profile`, `/stats`, `/friends`, `/help`" },
        { name: "Admin", value: "`/config`, `/weekly-post`, `/points`, `/title`" }
      )
      .setColor(0x22c55e);
  }

  private leaderboardLine(row: any, index: number, pointsKey: string): string {
    const title = row.equipped_title ? ` | ${row.equipped_title}` : "";
    return `**#${index + 1}** <@${row.user_id}> - ${formatPoints(row[pointsKey])} | ${labelForRank(index)}${title}`;
  }

  private weeklyLine(row: any, index: number): string {
    return `**#${index + 1}** <@${row.user_id}> - ${formatPoints(row.points)} | ${labelForRank(index)}`;
  }

  private friendLine(row: { targetUserId: string; replies: number; reactions: number; score: number }, index: number): string {
    return `**#${index + 1}** <@${row.targetUserId}> - ${row.score.toLocaleString()} signals | ${row.replies} replies, ${row.reactions} reactions`;
  }
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}
