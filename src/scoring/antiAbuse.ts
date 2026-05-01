import type { Db } from "../db/database.js";
import { isNearDuplicate } from "./messageClassifier.js";

export class AntiAbuseService {
  constructor(private readonly db: Db) {}

  canScoreMessageCooldown(guildId: string, userId: string, actionType: string, cooldownSeconds: number, nowMs = Date.now()): boolean {
    const row = this.db.prepare("SELECT last_scored_at_ms FROM message_score_cooldowns WHERE guild_id = ? AND user_id = ? AND action_type = ?").get(
      guildId,
      userId,
      actionType
    ) as { last_scored_at_ms: number } | undefined;
    return !row || nowMs - row.last_scored_at_ms >= cooldownSeconds * 1000;
  }

  markMessageCooldown(guildId: string, userId: string, actionType: string, nowMs = Date.now()): void {
    this.db.prepare(`
      INSERT INTO message_score_cooldowns (guild_id, user_id, action_type, last_scored_at_ms)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, user_id, action_type) DO UPDATE SET last_scored_at_ms = excluded.last_scored_at_ms
    `).run(guildId, userId, actionType, nowMs);
  }

  isDuplicateMessage(guildId: string, userId: string, fingerprint: string, windowMs = 10 * 60 * 1000, nowMs = Date.now()): boolean {
    if (!fingerprint) return false;
    const cutoff = nowMs - windowMs;
    const rows = this.db.prepare("SELECT fingerprint FROM message_fingerprints WHERE guild_id = ? AND user_id = ? AND created_at_ms >= ? ORDER BY created_at_ms DESC LIMIT 10").all(
      guildId,
      userId,
      cutoff
    ) as Array<{ fingerprint: string }>;
    return rows.some((row) => isNearDuplicate(row.fingerprint, fingerprint));
  }

  rememberMessageFingerprint(guildId: string, userId: string, fingerprint: string, nowMs = Date.now()): void {
    if (!fingerprint) return;
    const cutoff = nowMs - 24 * 60 * 60 * 1000;
    const tx = this.db.transaction(() => {
      this.db.prepare("INSERT INTO message_fingerprints (guild_id, user_id, fingerprint, created_at_ms) VALUES (?, ?, ?, ?)").run(guildId, userId, fingerprint, nowMs);
      this.db.prepare("DELETE FROM message_fingerprints WHERE created_at_ms < ?").run(cutoff);
    });
    tx();
  }

  canScoreReplyPair(guildId: string, replierId: string, targetUserId: string, cooldownSeconds: number, nowMs = Date.now()): boolean {
    const row = this.db.prepare("SELECT last_scored_at_ms FROM reply_pair_cooldowns WHERE guild_id = ? AND replier_id = ? AND target_user_id = ?").get(
      guildId,
      replierId,
      targetUserId
    ) as { last_scored_at_ms: number } | undefined;
    return !row || nowMs - row.last_scored_at_ms >= cooldownSeconds * 1000;
  }

  markReplyPair(guildId: string, replierId: string, targetUserId: string, nowMs = Date.now()): void {
    this.db.prepare(`
      INSERT INTO reply_pair_cooldowns (guild_id, replier_id, target_user_id, last_scored_at_ms)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(guild_id, replier_id, target_user_id) DO UPDATE SET last_scored_at_ms = excluded.last_scored_at_ms
    `).run(guildId, replierId, targetUserId, nowMs);
  }

  claimReactionScore(guildId: string, messageId: string, userId: string, emojiKey: string, nowMs = Date.now()): boolean {
    const result = this.db.prepare("INSERT OR IGNORE INTO reaction_scores (guild_id, message_id, user_id, emoji_key, created_at_ms) VALUES (?, ?, ?, ?, ?)").run(
      guildId,
      messageId,
      userId,
      emojiKey,
      nowMs
    );
    return result.changes === 1;
  }
}
