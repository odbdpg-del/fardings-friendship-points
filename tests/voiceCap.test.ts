import { describe, expect, it } from "vitest";
import { createDatabase } from "../src/db/database.js";
import { Repositories } from "../src/db/repositories.js";

describe("voice daily cap", () => {
  it("caps awarded voice seconds per day", () => {
    const db = createDatabase(":memory:");
    const repos = new Repositories(db);
    const date = new Date("2026-04-29T12:00:00-04:00");
    expect(repos.claimVoiceSecondsUnderDailyCap("g", "u", 3000, 3600, date)).toBe(3000);
    expect(repos.claimVoiceSecondsUnderDailyCap("g", "u", 3000, 3600, date)).toBe(600);
    expect(repos.claimVoiceSecondsUnderDailyCap("g", "u", 3000, 3600, date)).toBe(0);
    db.close();
  });
});
