import type { Db } from "./database.js";

export function runMigrations(db: Db): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      text_points INTEGER NOT NULL DEFAULT 2,
      reply_points INTEGER NOT NULL DEFAULT 4,
      media_points INTEGER NOT NULL DEFAULT 1,
      reaction_points INTEGER NOT NULL DEFAULT 1,
      solo_voice_points_per_hour INTEGER NOT NULL DEFAULT 1,
      group_voice_points_per_hour INTEGER NOT NULL DEFAULT 10,
      message_cooldown_seconds INTEGER NOT NULL DEFAULT 60,
      reply_pair_cooldown_seconds INTEGER NOT NULL DEFAULT 300,
      minimum_text_length INTEGER NOT NULL DEFAULT 8,
      daily_voice_cap_seconds INTEGER NOT NULL DEFAULT 14400,
      weekly_recap_channel_id TEXT,
      weekly_recap_enabled INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS guild_excluded_voice_channels (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS user_lifetime_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      total_points INTEGER NOT NULL DEFAULT 0,
      lifetime_messages INTEGER NOT NULL DEFAULT 0,
      lifetime_replies INTEGER NOT NULL DEFAULT 0,
      lifetime_media_posts INTEGER NOT NULL DEFAULT 0,
      lifetime_reactions_given INTEGER NOT NULL DEFAULT 0,
      lifetime_voice_seconds_solo INTEGER NOT NULL DEFAULT 0,
      lifetime_voice_seconds_group INTEGER NOT NULL DEFAULT 0,
      admin_adjustment_total INTEGER NOT NULL DEFAULT 0,
      equipped_title TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS user_weekly_stats (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      week_start TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      messages INTEGER NOT NULL DEFAULT 0,
      replies INTEGER NOT NULL DEFAULT 0,
      media_posts INTEGER NOT NULL DEFAULT 0,
      reactions INTEGER NOT NULL DEFAULT 0,
      voice_seconds_solo INTEGER NOT NULL DEFAULT 0,
      voice_seconds_group INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id, week_start)
    );

    CREATE TABLE IF NOT EXISTS point_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      points INTEGER NOT NULL,
      metadata_json TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      admin_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS message_fingerprints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_message_fingerprints_lookup
      ON message_fingerprints (guild_id, user_id, created_at_ms);

    CREATE TABLE IF NOT EXISTS message_score_cooldowns (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      action_type TEXT NOT NULL,
      last_scored_at_ms INTEGER NOT NULL,
      PRIMARY KEY (guild_id, user_id, action_type)
    );

    CREATE TABLE IF NOT EXISTS reply_pair_cooldowns (
      guild_id TEXT NOT NULL,
      replier_id TEXT NOT NULL,
      target_user_id TEXT NOT NULL,
      last_scored_at_ms INTEGER NOT NULL,
      PRIMARY KEY (guild_id, replier_id, target_user_id)
    );

    CREATE TABLE IF NOT EXISTS reaction_scores (
      guild_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji_key TEXT NOT NULL,
      created_at_ms INTEGER NOT NULL,
      PRIMARY KEY (guild_id, message_id, user_id, emoji_key)
    );

    CREATE TABLE IF NOT EXISTS voice_sessions (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      joined_at_ms INTEGER NOT NULL,
      last_segment_at_ms INTEGER NOT NULL,
      accumulated_solo_seconds INTEGER NOT NULL DEFAULT 0,
      accumulated_group_seconds INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS voice_daily_usage (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      day_start TEXT NOT NULL,
      seconds_awarded INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id, day_start)
    );
  `);
}
