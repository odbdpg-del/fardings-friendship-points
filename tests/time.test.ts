import { describe, expect, it } from "vitest";
import { getWeekStart } from "../src/utils/time.js";

describe("time helpers", () => {
  it("uses Monday as week start", () => {
    expect(getWeekStart(new Date("2026-04-29T12:00:00-04:00"))).toBe("2026-04-27");
  });
});
