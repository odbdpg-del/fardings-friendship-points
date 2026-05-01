import { env } from "../config/env.js";

const levels = ["debug", "info", "warn", "error"] as const;
type Level = (typeof levels)[number];

function shouldLog(level: Level): boolean {
  return levels.indexOf(level) >= levels.indexOf(env.LOG_LEVEL);
}

export const logger = {
  debug: (message: string, meta?: unknown) => shouldLog("debug") && console.debug(message, meta ?? ""),
  info: (message: string, meta?: unknown) => shouldLog("info") && console.info(message, meta ?? ""),
  warn: (message: string, meta?: unknown) => shouldLog("warn") && console.warn(message, meta ?? ""),
  error: (message: string, meta?: unknown) => shouldLog("error") && console.error(message, meta ?? "")
};
