export const adminLimits = {
  maxPointValue: 100,
  maxCooldownSeconds: 86_400,
  maxMinimumTextLength: 500,
  maxDailyVoiceCapHours: 24,
  maxPointAdjustment: 1_000_000,
  maxTotalPoints: 100_000_000,
  maxReasonLength: 180,
  maxTitleLength: 64
} as const;

const titlePattern = /^[\p{L}\p{N}\p{P}\p{S} ]+$/u;

export function validateIntegerRange(label: string, value: number, min: number, max: number): string | null {
  if (!Number.isInteger(value)) return `${label} must be a whole number.`;
  if (value < min || value > max) return `${label} must be between ${min.toLocaleString()} and ${max.toLocaleString()}.`;
  return null;
}

export function cleanReason(reason: string | null): string | null {
  if (!reason) return null;
  return reason.replace(/\s+/g, " ").trim().slice(0, adminLimits.maxReasonLength) || null;
}

export function validateTitle(rawTitle: string): { title: string | null; error: string | null } {
  const title = rawTitle.replace(/\s+/g, " ").trim();
  if (!title) return { title: null, error: "Title cannot be empty." };
  if (title.length > adminLimits.maxTitleLength) return { title: null, error: `Title must be ${adminLimits.maxTitleLength} characters or fewer.` };
  if (title.includes("@everyone") || title.includes("@here") || /<@&?\d+>/.test(title)) {
    return { title: null, error: "Title cannot include mentions." };
  }
  if (!titlePattern.test(title)) return { title: null, error: "Title contains unsupported characters." };
  return { title, error: null };
}
