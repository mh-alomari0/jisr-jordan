import { createHash } from "node:crypto";
import { logger } from "@/lib/logger";

export interface RateLimitOptions { limit?: number; maxRequests?: number; windowMs?: number; }
export interface RateLimitResult { success: boolean; remaining: number; reset: number; error?: string; }
interface RateLimitBackend { consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult>; }

const LIMIT_ERROR = "تم تجاوز الحد المسموح من المحاولات، يرجى الانتظار قليلاً";
const CONFIG_ERROR = "خدمة الحماية غير متاحة حالياً، يرجى المحاولة لاحقاً";
const actionTracker = new Map<string, { count: number; resetAt: number }>();

class MemoryRateLimitBackend implements RateLimitBackend {
  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const now = Date.now();
    const record = actionTracker.get(key);
    if (!record || now >= record.resetAt) {
      const reset = now + windowMs;
      actionTracker.set(key, { count: 1, resetAt: reset });
      return { success: true, remaining: Math.max(0, limit - 1), reset };
    }
    if (record.count >= limit) return { success: false, remaining: 0, reset: record.resetAt, error: LIMIT_ERROR };
    record.count += 1;
    return { success: true, remaining: limit - record.count, reset: record.resetAt };
  }
}

class UpstashRateLimitBackend implements RateLimitBackend {
  constructor(private readonly url: string, private readonly token: string) {}
  async consume(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
    const script = `local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; local ttl=redis.call('PTTL',KEYS[1]); return {n,ttl}`;
    const response = await fetch(this.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", script, 1, key, windowMs]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`RATE_LIMIT_BACKEND_HTTP_${response.status}`);
    const payload = (await response.json()) as { result?: [number, number]; error?: string };
    if (payload.error || !Array.isArray(payload.result)) throw new Error("RATE_LIMIT_BACKEND_INVALID_RESPONSE");
    const [count, ttl] = payload.result.map(Number);
    if (!Number.isFinite(count) || !Number.isFinite(ttl)) throw new Error("RATE_LIMIT_BACKEND_INVALID_VALUES");
    const reset = Date.now() + Math.max(ttl, 0);
    return count > limit
      ? { success: false, remaining: 0, reset, error: LIMIT_ERROR }
      : { success: true, remaining: Math.max(0, limit - count), reset };
  }
}

function privateKey(identifier: string) {
  return `jisr:rl:${createHash("sha256").update(identifier).digest("hex")}`;
}

function resolveBackend(): RateLimitBackend | null {
  const configured = process.env.RATE_LIMIT_BACKEND?.trim().toLowerCase();
  if (configured === "upstash") {
    const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    return url && token ? new UpstashRateLimitBackend(url, token) : null;
  }
  if (configured === "memory" || process.env.NODE_ENV !== "production") return new MemoryRateLimitBackend();
  return null;
}

export async function checkRateLimit(
  identifier: string,
  optionsOrMaxRequests: RateLimitOptions | number = 10,
  windowMsParam = 60_000
): Promise<RateLimitResult> {
  const maxRequests = typeof optionsOrMaxRequests === "number"
    ? optionsOrMaxRequests
    : optionsOrMaxRequests.limit ?? optionsOrMaxRequests.maxRequests ?? 10;
  const windowMs = typeof optionsOrMaxRequests === "number"
    ? windowMsParam
    : optionsOrMaxRequests.windowMs ?? windowMsParam;
  const backend = resolveBackend();
  if (!backend) {
    logger.error("Distributed rate-limit backend is not configured", { context: "RateLimit" });
    return { success: false, remaining: 0, reset: Date.now() + windowMs, error: CONFIG_ERROR };
  }
  try {
    return await backend.consume(privateKey(identifier), Math.max(1, maxRequests), Math.max(1_000, windowMs));
  } catch (error) {
    logger.error("Rate-limit backend request failed", { context: "RateLimit", error });
    return { success: false, remaining: 0, reset: Date.now() + windowMs, error: CONFIG_ERROR };
  }
}

export const verifyActionRateLimit = checkRateLimit;
