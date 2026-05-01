import type { Message } from "discord.js";
import { botBrand } from "../utils/branding.js";

const directMentionOnlyReplies = [
  "You rang? FarDing has entered the friendship ledger.",
  "I am awake, aware, and possibly overqualified for this server.",
  "FarDing heard the call. The points are trembling.",
  "Hello, yes, I am monitoring the friendship economy with unreasonable intensity.",
  "Speak your truth. FarDing is listening with both ears and one spreadsheet."
];

const helpReplies = [
  `Try \`/help\`, \`/leaderboard\`, \`/weekly\`, \`/profile\`, \`/stats\`, or \`/friends\`. ${botBrand.mascotName} believes in buttons, numbers, and mild social surveillance.`,
  `Need the menu? \`/help\` has the goods. Need validation? ${botBrand.mascotName} is emotionally unavailable but statistically present.`
];

const leaderboardReplies = [
  "The leaderboard is where the server's most suspiciously social people are displayed for science. Try `/leaderboard` or `/weekly`.",
  "Seeking the friendship throne? `/leaderboard` reveals the current champions and possible main characters."
];

const friendsReplies = [
  "To inspect your top friendship signals, use `/friends`. FarDing will consult the corkboard.",
  "`/friends` shows who you reply and react to most. It is not creepy if there is a command for it."
];

const pointsReplies = [
  `You earn ${botBrand.pointsAbbreviation} from meaningful messages, replies, reactions, and voice time. Spam gets the cold shoulder.`,
  `${botBrand.pointsAbbreviation} arrive when you participate like a person and not like a keyboard falling down stairs.`
];

export class MentionResponder {
  async maybeReply(message: Message): Promise<void> {
    if (!message.guild || message.author.bot || message.webhookId) return;
    if (!this.mentionsBot(message)) return;

    await message.reply(this.pickReply(message.content));
  }

  private mentionsBot(message: Message): boolean {
    const botId = message.client.user?.id;
    if (!botId) return false;
    return message.mentions.users.has(botId) || message.content.includes(`<@${botId}>`) || message.content.includes(`<@!${botId}>`);
  }

  private pickReply(content: string): string {
    const normalized = content.toLowerCase();
    if (/\b(help|commands?|what can you do)\b/.test(normalized)) return random(helpReplies);
    if (/\b(leaderboard|rank|top|weekly)\b/.test(normalized)) return random(leaderboardReplies);
    if (/\b(friend|friends|bestie|best friend)\b/.test(normalized)) return random(friendsReplies);
    if (/\b(points?|fp|score|earn)\b/.test(normalized)) return random(pointsReplies);
    return random(directMentionOnlyReplies);
  }
}

function random(replies: string[]): string {
  return replies[Math.floor(Math.random() * replies.length)];
}
