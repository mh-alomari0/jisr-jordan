import { logger } from "@/lib/logger";

interface RateLimitStore {
  count: number;
  resetAt: number;
}

export interface RateLimitConfig {
  limit: number;
  windowMs?: number;
  windowInSeconds?: number;
}

const memoryStore = new Map<string, RateLimitStore>();

export async function checkRateLimit(
  identifier: string,
  configOrLimit: number | RateLimitConfig = 10,
  defaultWindowInSeconds = 60
): Promise<{ success: boolean; remaining: number }> {
  const limit = typeof configOrLimit === "number" ? configOrLimit : configOrLimit.limit;
  const windowInSeconds =
    typeof configOrLimit === "object"
      ? (configOrLimit.windowInSeconds || (configOrLimit.windowMs ? configOrLimit.windowMs / 1000 : 60))
      : defaultWindowInSeconds;

  const now = Date.now();
  const windowMs = windowInSeconds * 1000;

  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const response = await fetch(`${process.env.UPSTASH_REDIS_REST_URL}/pipeline`, {
        headers: {
          Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        },
        method: "POST",
        body: JSON.stringify([
          ["INCR", `ratelimit:${identifier}`],
          ["EXPIRE", `ratelimit:${identifier}`, windowInSeconds],
        ]),
      });
      const data = await response.json();
      const currentCount = data[0]?.result || 1;

      return {
        success: currentCount <= limit,
        remaining: Math.max(0, limit - currentCount),
      };
    } catch (err) {
      logger.error("Upstash Redis connection error, falling back to memory", { context: "RateLimiter", error: err });
    }
  }

  const record = memoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0 };
  }

  record.count += 1;
  return { success: true, remaining: limit - record.count };
}