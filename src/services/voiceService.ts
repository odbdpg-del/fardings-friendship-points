import type { Guild, VoiceState } from "discord.js";
import { ChannelType } from "discord.js";
import { Repositories } from "../db/repositories.js";
import { secondsBetween } from "../utils/time.js";

type VoiceSession = {
  guild_id: string;
  user_id: string;
  channel_id: string;
  joined_at_ms: number;
  last_segment_at_ms: number;
  accumulated_solo_seconds: number;
  accumulated_group_seconds: number;
  active: number;
};

export class VoiceService {
  constructor(private readonly repos: Repositories) {}

  recoverActiveSessions(): void {
    const nowMs = Date.now();
    this.repos.db.prepare("UPDATE voice_sessions SET last_segment_at_ms = ? WHERE active = 1").run(nowMs);
  }

  async handleVoiceStateUpdate(oldState: VoiceState, newState: VoiceState): Promise<void> {
    const guild = newState.guild;
    const nowMs = Date.now();
    const affected = new Set<string>();
    if (oldState.channelId) affected.add(oldState.channelId);
    if (newState.channelId) affected.add(newState.channelId);

    for (const channelId of affected) {
      this.settleChannel(guild, channelId, nowMs);
    }

    const user = newState.member?.user ?? oldState.member?.user;
    if (!user || user.bot) return;

    if (oldState.channelId && oldState.channelId !== newState.channelId) {
      this.closeSession(guild.id, user.id, nowMs);
    }

    if (newState.channelId && oldState.channelId !== newState.channelId) {
      this.openSession(guild.id, user.id, newState.channelId, nowMs);
    }

    for (const channelId of affected) {
      this.settleChannel(guild, channelId, nowMs);
    }
  }

  settleGuild(guild: Guild): void {
    const sessions = this.getActiveSessions(guild.id);
    const nowMs = Date.now();
    for (const channelId of new Set(sessions.map((session) => session.channel_id))) {
      this.settleChannel(guild, channelId, nowMs);
    }
  }

  private settleChannel(guild: Guild, channelId: string, nowMs: number): void {
    const settings = this.repos.getSettings(guild.id);
    const excluded = this.repos.getExcludedVoiceChannels(guild.id);
    const sessions = this.getActiveSessions(guild.id, channelId);
    if (sessions.length === 0) return;

    const channel = guild.channels.cache.get(channelId);
    const groupSize =
      channel?.type === ChannelType.GuildVoice || channel?.type === ChannelType.GuildStageVoice
        ? channel.members.filter((member) => !member.user.bot).size
        : 0;
    const isExcluded = excluded.has(channelId);
    const isGroup = groupSize >= 2;

    for (const session of sessions) {
      const elapsed = secondsBetween(session.last_segment_at_ms, nowMs);
      if (elapsed <= 0) continue;

      const awardedSeconds = isExcluded ? 0 : this.repos.claimVoiceSecondsUnderDailyCap(guild.id, session.user_id, elapsed, settings.daily_voice_cap_seconds);
      const soloSeconds = !isGroup ? awardedSeconds : 0;
      const groupSeconds = isGroup ? awardedSeconds : 0;
      const points = Math.floor((soloSeconds / 3600) * settings.solo_voice_points_per_hour + (groupSeconds / 3600) * settings.group_voice_points_per_hour);

      if (awardedSeconds > 0 || elapsed > 0) {
        this.repos.db.prepare(`
          UPDATE voice_sessions SET
            last_segment_at_ms = ?,
            accumulated_solo_seconds = accumulated_solo_seconds + ?,
            accumulated_group_seconds = accumulated_group_seconds + ?
          WHERE guild_id = ? AND user_id = ?
        `).run(nowMs, soloSeconds, groupSeconds, guild.id, session.user_id);
      }

      if (points > 0 || soloSeconds > 0 || groupSeconds > 0) {
        this.repos.addStats(
          guild.id,
          session.user_id,
          { points, soloVoiceSeconds: soloSeconds, groupVoiceSeconds: groupSeconds },
          "voice",
          { channelId, soloSeconds, groupSeconds, isGroup }
        );
      }
    }
  }

  private openSession(guildId: string, userId: string, channelId: string, nowMs: number): void {
    this.repos.db.prepare(`
      INSERT INTO voice_sessions (guild_id, user_id, channel_id, joined_at_ms, last_segment_at_ms, accumulated_solo_seconds, accumulated_group_seconds, active)
      VALUES (?, ?, ?, ?, ?, 0, 0, 1)
      ON CONFLICT(guild_id, user_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        joined_at_ms = excluded.joined_at_ms,
        last_segment_at_ms = excluded.last_segment_at_ms,
        accumulated_solo_seconds = 0,
        accumulated_group_seconds = 0,
        active = 1
    `).run(guildId, userId, channelId, nowMs, nowMs);
  }

  private closeSession(guildId: string, userId: string, nowMs: number): void {
    this.repos.db.prepare("UPDATE voice_sessions SET active = 0, last_segment_at_ms = ? WHERE guild_id = ? AND user_id = ?").run(nowMs, guildId, userId);
  }

  private getActiveSessions(guildId: string, channelId?: string): VoiceSession[] {
    if (channelId) {
      return this.repos.db.prepare("SELECT * FROM voice_sessions WHERE guild_id = ? AND channel_id = ? AND active = 1").all(guildId, channelId) as VoiceSession[];
    }
    return this.repos.db.prepare("SELECT * FROM voice_sessions WHERE guild_id = ? AND active = 1").all(guildId) as VoiceSession[];
  }
}
