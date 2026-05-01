import type { Client } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { Repositories } from "../db/repositories.js";
import { formatDuration, formatPoints } from "./presentation.js";
import { getWeekStart } from "../utils/time.js";
import { logger } from "../utils/logger.js";
import { botBrand } from "../utils/branding.js";

export class WeeklyRecapService {
  constructor(private readonly repos: Repositories) {}

  buildRecap(guildId: string): EmbedBuilder {
    const top = this.repos.getWeeklyLeaderboard(guildId, 5);
    const weekStart = getWeekStart();
    const biggest = top[0];
    const replies = this.repos.db.prepare("SELECT * FROM user_weekly_stats WHERE guild_id = ? AND week_start = ? ORDER BY replies DESC LIMIT 1").get(guildId, weekStart) as any;
    const reactions = this.repos.db.prepare("SELECT * FROM user_weekly_stats WHERE guild_id = ? AND week_start = ? ORDER BY reactions DESC LIMIT 1").get(guildId, weekStart) as any;
    const voice = this.repos.db.prepare("SELECT *, (voice_seconds_solo + voice_seconds_group) voice_total FROM user_weekly_stats WHERE guild_id = ? AND week_start = ? ORDER BY voice_total DESC LIMIT 1").get(guildId, weekStart) as any;

    return new EmbedBuilder()
      .setTitle(`Weekly ${botBrand.shortName} Recap`)
      .setDescription(top.length ? top.map((row, i) => `**#${i + 1}** <@${row.user_id}> - ${formatPoints(row.points)}`).join("\n") : "Nobody scored this week. A bold commitment to tranquility.")
      .addFields(
        { name: "Most Suspiciously Social", value: biggest ? `<@${biggest.user_id}> gained ${formatPoints(biggest.points)}` : "Nobody yet", inline: false },
        { name: "Reply Goblin", value: replies ? `<@${replies.user_id}> with ${replies.replies} replies` : "Nobody yet", inline: true },
        { name: "Emoji Menace", value: reactions ? `<@${reactions.user_id}> with ${reactions.reactions} reactions` : "Nobody yet", inline: true },
        { name: "Voice Cryptid", value: voice ? `<@${voice.user_id}> with ${formatDuration(voice.voice_total)}` : "Nobody yet", inline: true }
      )
      .setColor(0xff6b6b);
  }

  async postDueRecaps(client: Client): Promise<void> {
    for (const settings of this.repos.getGuildsWithWeeklyRecaps()) {
      const channelId = settings.weekly_recap_channel_id;
      if (!channelId) continue;
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel?.isTextBased() || !("send" in channel)) {
        logger.warn(`Weekly recap channel unavailable for guild ${settings.guild_id}`);
        continue;
      }
      await channel.send({ embeds: [this.buildRecap(settings.guild_id)] });
    }
  }
}
