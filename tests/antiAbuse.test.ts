import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/database.js";
import { AntiAbuseService } from "../src/scoring/antiAbuse.js";

describe("anti-abuse service", () => {
  it("enforces message cooldowns", () => {
    const db = createDatabase(":memory:");
    const anti = new AntiAbuseService(db);
    expect(anti.canScoreMessageCooldown("g", "u", "text", 60, 1000)).toBe(true);
    anti.markMessageCooldown("g", "u", "text", 1000);
    expect(anti.canScoreMessageCooldown("g", "u", "text", 60, 30_000)).toBe(false);
    expect(anti.canScoreMessageCooldown("g", "u", "text", 60, 62_000)).toBe(true);
    db.close();
  });

  it("claims a reaction only once", () => {
    const db = createDatabase(":memory:");
    const anti = new AntiAbuseService(db);
    expect(anti.claimReactionScore("g", "m", "u", "emoji")).toBe(true);
    expect(anti.claimReactionScore("g", "m", "u", "emoji")).toBe(false);
    db.close();
  });
});
