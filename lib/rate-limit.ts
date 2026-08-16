import { logger } from "@/lib/logger";

interface RateLimitStore {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  limit: number;
  windowMs?: number;
  windowInSeconds?: number;
}

const memoryStore = new Map<string, RateLimitStore>();

export async function checkRateLimit(
  identifier: string,
  optionsOrLimit: number | RateLimitOptions = 10,
  defaultWindowInSeconds = 60
): Promise<{ success: boolean; remaining: number }> {
  // استخلاص القيم سواء تم تمرير رقم أو كائن إعدادات
  const limit = typeof optionsOrLimit === "number" ? optionsOrLimit : optionsOrLimit.limit;
  
  const windowInSeconds = typeof optionsOrLimit === "object"
    ? (optionsOrLimit.windowInSeconds || (optionsOrLimit.windowMs ? optionsOrLimit.windowMs / 1000 : 60))
    : defaultWindowInSeconds;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Upstash Redis Distributed Engine
  if (url && token) {
    try {
      const key = `ratelimit:${identifier}`;
      const response = await fetch(`${url}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, Math.ceil(windowInSeconds)],
        ]),
      });

      if (response.ok) {
        const data = await response.json();
        const currentCount = Number(data[0]?.result || 1);
        return {
          success: currentCount <= limit,
          remaining: Math.max(0, limit - currentCount),
        };
      }
    } catch (err) {
      logger.error("Upstash Redis connection failed, falling back to local memory", {
        context: "RateLimiter",
        error: err,
      });
    }
  }

  // 2. Local In-Memory Fallback Engine
  const now = Date.now();
  const windowMs = windowInSeconds * 1000;
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