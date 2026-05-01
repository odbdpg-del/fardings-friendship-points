import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/database.js";
import { Repositories } from "../src/db/repositories.js";

describe("friend signals", () => {
  it("ranks top friends from reply and reaction metadata", () => {
    const db = createDatabase(":memory:");
    const repos = new Repositories(db);

    repos.addStats("g", "u", { points: 4, replies: 1 }, "reply", { targetUserId: "friend-a" });
    repos.addStats("g", "u", { points: 4, replies: 1 }, "reply", { targetUserId: "friend-a" });
    repos.addStats("g", "u", { points: 1, reactions: 1 }, "reaction", { targetUserId: "friend-b" });
    repos.addStats("g", "u", { points: 1, reactions: 1 }, "reaction", { targetUserId: "friend-b" });
    repos.addStats("g", "u", { points: 1, reactions: 1 }, "reaction", { targetUserId: "friend-b" });
    repos.addStats("g", "u", { points: 4, replies: 1 }, "reply", { targetUserId: "friend-c" });
    repos.addStats("g", "u", { points: 1, reactions: 1 }, "reaction", { targetUserId: "friend-d" });
    repos.addStats("g", "u", { points: 4, replies: 1 }, "reply", { targetUserId: "u" });
    repos.addStats("g", "u", { points: 2, messages: 1 }, "message", { messageId: "ignored" });

    expect(repos.getTopFriends("g", "u", 3)).toEqual([
      { targetUserId: "friend-a", replies: 2, reactions: 0, score: 4 },
      { targetUserId: "friend-b", replies: 0, reactions: 3, score: 3 },
      { targetUserId: "friend-c", replies: 1, reactions: 0, score: 2 }
    ]);

    db.close();
  });
});
