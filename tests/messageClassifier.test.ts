import { describe, expect, it } from "vitest";
import { classifyMessage, isNearDuplicate, normalizeFingerprint } from "../src/scoring/messageClassifier.js";

describe("message classifier", () => {
  it("scores replies as replies only", () => {
    expect(
      classifyMessage({
        content: "this is a detailed reply",
        attachmentCount: 0,
        embedCount: 0,
        isReply: true,
        isSelfReply: false,
        minimumTextLength: 8
      })
    ).toBe("reply");
  });

  it("ignores self replies", () => {
    expect(
      classifyMessage({
        content: "me again",
        attachmentCount: 0,
        embedCount: 0,
        isReply: true,
        isSelfReply: true,
        minimumTextLength: 8
      })
    ).toBe("ignore");
  });

  it("classifies link-only posts as media", () => {
    expect(
      classifyMessage({
        content: "https://example.com/cat.gif",
        attachmentCount: 0,
        embedCount: 0,
        isReply: false,
        isSelfReply: false,
        minimumTextLength: 8
      })
    ).toBe("media");
  });

  it("normalizes fingerprints and detects near duplicates", () => {
    const first = normalizeFingerprint("HELLO!!! https://example.com");
    const second = normalizeFingerprint("hello https://other.example");
    expect(isNearDuplicate(first, second)).toBe(true);
  });
});
