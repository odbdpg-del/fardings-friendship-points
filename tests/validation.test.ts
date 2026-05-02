import { describe, expect, it } from "vitest";
import { adminLimits, cleanReason, validateIntegerRange, validateTitle } from "../src/commands/validation.js";

describe("admin command validation", () => {
  it("bounds integer settings", () => {
    expect(validateIntegerRange("Point value", 10, 0, adminLimits.maxPointValue)).toBeNull();
    expect(validateIntegerRange("Point value", adminLimits.maxPointValue + 1, 0, adminLimits.maxPointValue)).toContain("between");
  });

  it("allows large negative totals within admin range", () => {
    expect(validateIntegerRange("Total points", -5_000_000, adminLimits.minTotalPoints, adminLimits.maxTotalPoints)).toBeNull();
    expect(validateIntegerRange("Total points", adminLimits.minTotalPoints - 1, adminLimits.minTotalPoints, adminLimits.maxTotalPoints)).toContain("between");
  });

  it("cleans audit reasons", () => {
    expect(cleanReason("  too   helpful   ")).toBe("too helpful");
    expect(cleanReason("x".repeat(adminLimits.maxReasonLength + 10))?.length).toBe(adminLimits.maxReasonLength);
  });

  it("allows normal titles", () => {
    expect(validateTitle("  Certified Yapper  ").title).toBe("Certified Yapper");
  });

  it("rejects mention titles", () => {
    expect(validateTitle("@everyone").error).toContain("mentions");
    expect(validateTitle("<@1234567890>").error).toContain("mentions");
  });
});
