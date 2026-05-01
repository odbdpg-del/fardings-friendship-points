import type { Db } from "./database.js";
import { getDayStart, getWeekStart, nowIso } from "../utils/time.js";
import { logger } from "../utils/logger.js";

export type GuildSettings = {
  guild_id: string;
  text_points: number;
  reply_points: number;
  media_points: number;
  reaction_points: number;
  solo_voice_points_per_hour: number;
  group_voice_points_per_hour: number;
  message_cooldown_seconds: number;
  reply_pair_cooldown_seconds: number;
  minimum_text_length: number;
  daily_voice_cap_seconds: number;
  weekly_recap_channel_id: string | null;
  weekly_recap_enabled: number;
};

export type StatDelta = {
  points?: number;
  messages?: number;
  replies?: number;
  mediaPosts?: number;
  reactions?: number;
  soloVoiceSeconds?: number;
  groupVoiceSeconds?: number;
  adminAdjustment?: number;
};

export class Repositories {
  constructor(public readonly db: Db) {}

  getSettings(guildId: string): GuildSettings {
    this.db.prepare("INSERT OR IGNORE INTO guild_settings (guild_id) VALUES (?)").run(guildId);
    return this.db.prepare("SELECT * FROM guild_settings WHERE guild_id = ?").get(guildId) as GuildSettings;
  }

  updateSettings(guildId: string, values: Partial<Record<keyof GuildSettings, string | number | null>>): void {
    this.getSettings(guildId);
    const allowed = Object.keys(values).filter((key) => key !== "guild_id");
    if (allowed.length === 0) return;
    const assignments = allowed.map((key) => `${key} = @${key}`).join(", ");
    this.db.prepare(`UPDATE guild_settings SET ${assignments}, updated_at = @updated_at WHERE guild_id = @guild_id`).run({
      ...values,
      guild_id: guildId,
      updated_at: nowIso()
    });
  }

  getExcludedVoiceChannels(guildId: string): Set<string> {
    const rows = this.db.prepare("SELECT channel_id FROM guild_excluded_voice_channels WHERE guild_id = ?").all(guildId) as Array<{ channel_id: string }>;
    return new Set(rows.map((row) => row.channel_id));
  }

  setVoiceChannelExcluded(guildId: string, channelId: string, excluded: boolean): void {
    if (excluded) {
      this.db.prepare("INSERT OR IGNORE INTO guild_excluded_voice_channels (guild_id, channel_id) VALUES (?, ?)").run(guildId, channelId);
      return;
    }
    this.db.prepare("DELETE FROM guild_excluded_voice_channels WHERE guild_id = ? AND channel_id = ?").run(guildId, channelId);
  }

  ensureUser(guildId: string, userId: string): void {
    this.db.prepare("INSERT OR IGNORE INTO user_lifetime_stats (guild_id, user_id) VALUES (?, ?)").run(guildId, userId);
    this.db.prepare("INSERT OR IGNORE INTO user_weekly_stats (guild_id, user_id, week_start) VALUES (?, ?, ?)").run(guildId, userId, getWeekStart());
  }

  addStats(guildId: string, userId: string, delta: StatDelta, eventType: string, metadata?: unknown): void {
    this.ensureUser(guildId, userId);
    const points = delta.points ?? 0;
    const tx = this.db.transaction(() => {
      this.db.prepare(`
        UPDATE user_lifetime_stats SET
          total_points = total_points + @points,
          lifetime_messages = lifetime_messages + @messages,
          lifetime_replies = lifetime_replies + @replies,
          lifetime_media_posts = lifetime_media_posts + @mediaPosts,
          lifetime_reactions_given = lifetime_reactions_given + @reactions,
          lifetime_voice_seconds_solo = lifetime_voice_seconds_solo + @soloVoiceSeconds,
          lifetime_voice_seconds_group = lifetime_voice_seconds_group + @groupVoiceSeconds,
          admin_adjustment_total = admin_adjustment_total + @adminAdjustment,
          updated_at = @updatedAt
        WHERE guild_id = @guildId AND user_id = @userId
      `).run(this.deltaParams(guildId, userId, delta));

      this.db.prepare(`
        UPDATE user_weekly_stats SET
          points = points + @points,
          messages = messages + @messages,
          replies = replies + @replies,
          media_posts = media_posts + @mediaPosts,
          reactions = reactions + @reactions,
          voice_seconds_solo = voice_seconds_solo + @soloVoiceSeconds,
          voice_seconds_group = voice_seconds_group + @groupVoiceSeconds
        WHERE guild_id = @guildId AND user_id = @userId AND week_start = @weekStart
      `).run({ ...this.deltaParams(guildId, userId, delta), weekStart: getWeekStart() });

      this.db.prepare("INSERT INTO point_events (guild_id, user_id, event_type, points, metadata_json) VALUES (?, ?, ?, ?, ?)").run(
        guildId,
        userId,
        eventType,
        points,
        metadata ? JSON.stringify(metadata) : null
      );
      logger.debug("Recorded point event", { guildId, userId, eventType, points, metadata });
    });
    tx();
  }

  setTotalPoints(guildId: string, userId: string, total: number, adminId: string, reason: string | null): void {
    this.ensureUser(guildId, userId);
    const current = this.getUserStats(guildId, userId)?.total_points ?? 0;
    const delta = total - current;
    const tx = this.db.transaction(() => {
      this.addStats(guildId, userId, { points: delta, adminAdjustment: delta }, "admin_set", { adminId, reason });
      this.db.prepare("INSERT INTO admin_adjustments (guild_id, admin_id, target_user_id, operation, amount, reason) VALUES (?, ?, ?, ?, ?, ?)").run(
        guildId,
        adminId,
        userId,
        "set",
        total,
        reason
      );
    });
    tx();
  }

  recordAdminAdjustment(guildId: string, adminId: string, userId: string, operation: "add" | "remove", amount: number, reason: string | null): void {
    const signed = operation === "remove" ? -Math.abs(amount) : Math.abs(amount);
    const tx = this.db.transaction(() => {
      this.addStats(guildId, userId, { points: signed, adminAdjustment: signed }, `admin_${operation}`, { adminId, reason });
      this.db.prepare("INSERT INTO admin_adjustments (guild_id, admin_id, target_user_id, operation, amount, reason) VALUES (?, ?, ?, ?, ?, ?)").run(
        guildId,
        adminId,
        userId,
        operation,
        signed,
        reason
      );
    });
    tx();
  }

  setTitle(guildId: string, userId: string, title: string | null): void {
    this.ensureUser(guildId, userId);
    this.db.prepare("UPDATE user_lifetime_stats SET equipped_title = ?, updated_at = ? WHERE guild_id = ? AND user_id = ?").run(title, nowIso(), guildId, userId);
  }

  getUserStats(guildId: string, userId: string): any {
    this.ensureUser(guildId, userId);
    return this.db.prepare("SELECT * FROM user_lifetime_stats WHERE guild_id = ? AND user_id = ?").get(guildId, userId);
  }

  getWeeklyStats(guildId: string, userId: string, weekStart = getWeekStart()): any {
    this.ensureUser(guildId, userId);
    return this.db.prepare("SELECT * FROM user_weekly_stats WHERE guild_id = ? AND user_id = ? AND week_start = ?").get(guildId, userId, weekStart);
  }

  getLifetimeLeaderboard(guildId: string, limit = 10): any[] {
    return this.db.prepare("SELECT * FROM user_lifetime_stats WHERE guild_id = ? ORDER BY total_points DESC, lifetime_replies DESC LIMIT ?").all(guildId, limit);
  }

  getWeeklyLeaderboard(guildId: string, limit = 10, weekStart = getWeekStart()): any[] {
    return this.db.prepare("SELECT * FROM user_weekly_stats WHERE guild_id = ? AND week_start = ? ORDER BY points DESC, replies DESC LIMIT ?").all(guildId, weekStart, limit);
  }

  getRank(guildId: string, userId: string): number | null {
    const row = this.db.prepare(`
      SELECT rank FROM (
        SELECT user_id, RANK() OVER (ORDER BY total_points DESC) rank
        FROM user_lifetime_stats WHERE guild_id = ?
      ) WHERE user_id = ?
    `).get(guildId, userId) as { rank: number } | undefined;
    return row?.rank ?? null;
  }

  getGuildsWithWeeklyRecaps(): GuildSettings[] {
    return this.db.prepare("SELECT * FROM guild_settings WHERE weekly_recap_enabled = 1 AND weekly_recap_channel_id IS NOT NULL").all() as GuildSettings[];
  }

  claimVoiceSecondsUnderDailyCap(guildId: string, userId: string, requestedSeconds: number, capSeconds: number, date = new Date()): number {
    if (requestedSeconds <= 0 || capSeconds <= 0) return 0;
    const dayStart = getDayStart(date);
    this.db.prepare("INSERT OR IGNORE INTO voice_daily_usage (guild_id, user_id, day_start) VALUES (?, ?, ?)").run(guildId, userId, dayStart);
    const row = this.db.prepare("SELECT seconds_awarded FROM voice_daily_usage WHERE guild_id = ? AND user_id = ? AND day_start = ?").get(guildId, userId, dayStart) as
      | { seconds_awarded: number }
      | undefined;
    const remaining = Math.max(0, capSeconds - (row?.seconds_awarded ?? 0));
    const awarded = Math.min(requestedSeconds, remaining);
    if (awarded > 0) {
      this.db.prepare("UPDATE voice_daily_usage SET seconds_awarded = seconds_awarded + ? WHERE guild_id = ? AND user_id = ? AND day_start = ?").run(
        awarded,
        guildId,
        userId,
        dayStart
      );
    }
    return awarded;
  }

  private deltaParams(guildId: string, userId: string, delta: StatDelta): Record<string, string | number> {
    return {
      guildId,
      userId,
      points: delta.points ?? 0,
      messages: delta.messages ?? 0,
      replies: delta.replies ?? 0,
      mediaPosts: delta.mediaPosts ?? 0,
      reactions: delta.reactions ?? 0,
      soloVoiceSeconds: delta.soloVoiceSeconds ?? 0,
      groupVoiceSeconds: delta.groupVoiceSeconds ?? 0,
      adminAdjustment: delta.adminAdjustment ?? 0,
      updatedAt: nowIso()
    };
  }
}
