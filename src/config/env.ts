import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1).optional(),
  DISCORD_CLIENT_ID: z.string().min(1).optional(),
  DISCORD_GUILD_ID: z.string().optional().default(""),
  DATABASE_PATH: z.string().min(1).default("./fardings-friendship-points.sqlite"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  WEEKLY_CRON: z.string().min(1).default("0 9 * * 1"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

const parsed = envSchema.parse(process.env);

if (parsed.NODE_ENV !== "test" && (!parsed.DISCORD_TOKEN || !parsed.DISCORD_CLIENT_ID)) {
  throw new Error("DISCORD_TOKEN and DISCORD_CLIENT_ID are required outside test mode.");
}

export const env = {
  ...parsed,
  DISCORD_TOKEN: parsed.DISCORD_TOKEN ?? "test-token",
  DISCORD_CLIENT_ID: parsed.DISCORD_CLIENT_ID ?? "test-client-id"
};
