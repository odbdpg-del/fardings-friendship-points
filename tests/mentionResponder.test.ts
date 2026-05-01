import { describe, expect, it, vi } from "vitest";
import { MentionResponder } from "../src/services/mentionResponder.js";

describe("mention responder", () => {
  it("replies when FarDing is mentioned", async () => {
    const reply = vi.fn();
    const message = {
      guild: { id: "g" },
      channel: { id: "c" },
      author: { id: "author", bot: false },
      webhookId: null,
      content: "<@bot> help",
      client: { user: { id: "bot" } },
      mentions: { users: { has: (id: string) => id === "bot" } },
      reply
    };

    await new MentionResponder().maybeReply(message as any);

    expect(reply).toHaveBeenCalledOnce();
    expect(reply.mock.calls[0][0]).toContain("/help");
  });

  it("ignores messages that do not mention FarDing", async () => {
    const reply = vi.fn();
    const message = {
      guild: { id: "g" },
      channel: { id: "c" },
      author: { id: "author", bot: false },
      webhookId: null,
      content: "hello",
      client: { user: { id: "bot" } },
      mentions: { users: { has: () => false } },
      reply
    };

    await new MentionResponder().maybeReply(message as any);

    expect(reply).not.toHaveBeenCalled();
  });
});
