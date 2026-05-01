import type { Message, MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";
import { Repositories } from "../db/repositories.js";
import { AntiAbuseService } from "./antiAbuse.js";
import { classifyMessage, normalizeFingerprint } from "./messageClassifier.js";

export class ScoringService {
  constructor(
    private readonly repos: Repositories,
    private readonly antiAbuse: AntiAbuseService
  ) {}

  async scoreMessage(message: Message): Promise<void> {
    if (!message.guild || message.author.bot || message.webhookId) return;

    const guildId = message.guild.id;
    const settings = this.repos.getSettings(guildId);
    const referenced = message.reference?.messageId ? await this.fetchReferencedMessage(message) : null;
    const isReply = Boolean(referenced);
    const isSelfReply = referenced?.author.id === message.author.id;
    const classification = classifyMessage({
      content: message.content,
      attachmentCount: message.attachments.size,
      embedCount: message.embeds.length,
      isReply,
      isSelfReply,
      minimumTextLength: settings.minimum_text_length
    });

    if (classification === "ignore") return;

    const fingerprint = normalizeFingerprint(message.content);
    if (this.antiAbuse.isDuplicateMessage(guildId, message.author.id, fingerprint)) return;

    if (classification === "reply" && referenced) {
      if (referenced.author.bot) return;
      if (!this.antiAbuse.canScoreReplyPair(guildId, message.author.id, referenced.author.id, settings.reply_pair_cooldown_seconds)) return;
      this.repos.addStats(guildId, message.author.id, { points: settings.reply_points, replies: 1 }, "reply", { messageId: message.id, targetUserId: referenced.author.id });
      this.antiAbuse.markReplyPair(guildId, message.author.id, referenced.author.id);
      this.antiAbuse.rememberMessageFingerprint(guildId, message.author.id, fingerprint);
      return;
    }

    if (!this.antiAbuse.canScoreMessageCooldown(guildId, message.author.id, classification, settings.message_cooldown_seconds)) return;

    if (classification === "media") {
      this.repos.addStats(guildId, message.author.id, { points: settings.media_points, mediaPosts: 1 }, "media_post", { messageId: message.id });
    } else {
      this.repos.addStats(guildId, message.author.id, { points: settings.text_points, messages: 1 }, "message", { messageId: message.id });
    }

    this.antiAbuse.markMessageCooldown(guildId, message.author.id, classification);
    this.antiAbuse.rememberMessageFingerprint(guildId, message.author.id, fingerprint);
  }

  async scoreReaction(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
    if (user.bot) return;
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch {
        return;
      }
    }
    const message = reaction.message;
    if (!message.guild || !message.author || message.author.bot || message.author.id === user.id) return;

    const emojiKey = reaction.emoji.id ?? reaction.emoji.name ?? "unknown";
    const claimed = this.antiAbuse.claimReactionScore(message.guild.id, message.id, user.id, emojiKey);
    if (!claimed) return;

    const settings = this.repos.getSettings(message.guild.id);
    this.repos.addStats(message.guild.id, user.id, { points: settings.reaction_points, reactions: 1 }, "reaction", {
      messageId: message.id,
      emojiKey,
      targetUserId: message.author.id
    });
  }

  private async fetchReferencedMessage(message: Message): Promise<Message | null> {
    const messageId = message.reference?.messageId;
    if (!messageId) return null;
    try {
      return await message.channel.messages.fetch(messageId);
    } catch {
      return null;
    }
  }
}
