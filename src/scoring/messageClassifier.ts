export type MessageClassification = "reply" | "media" | "text" | "ignore";

const urlRegex = /https?:\/\/[^\s]+/gi;

export function normalizeFingerprint(content: string): string {
  return content
    .toLowerCase()
    .replace(urlRegex, " URL ")
    .replace(/[`*_~>|#:@()[\]{}.,!?;'"-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function meaningfulTextLength(content: string): number {
  return content.replace(urlRegex, "").replace(/\s+/g, " ").trim().length;
}

export function isNearDuplicate(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length > b.length ? a : b;
  if (shorter.length < 8) return false;
  return longer.includes(shorter) && shorter.length / longer.length >= 0.75;
}

export function classifyMessage(input: {
  content: string;
  attachmentCount: number;
  embedCount: number;
  isReply: boolean;
  isSelfReply: boolean;
  minimumTextLength: number;
}): MessageClassification {
  if (input.isSelfReply) return "ignore";
  if (input.isReply) return "reply";

  const nonUrlLength = meaningfulTextLength(input.content);
  const mostlyUrl = input.content.match(urlRegex)?.join("").length ? nonUrlLength < input.minimumTextLength : false;
  if (input.attachmentCount > 0 || input.embedCount > 0 || mostlyUrl) return "media";

  if (nonUrlLength >= input.minimumTextLength) return "text";
  return "ignore";
}
