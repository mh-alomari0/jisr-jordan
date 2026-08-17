export interface RateLimitOptions {
  limit?: number;
  maxRequests?: number;
  windowMs?: number;
}

const actionTracker = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(
  identifier: string,
  optionsOrMaxRequests: RateLimitOptions | number = 10,
  windowMsParam = 60000
) {
  let maxRequests = 10;
  let windowMs = windowMsParam;

  if (typeof optionsOrMaxRequests === "number") {
    maxRequests = optionsOrMaxRequests;
  } else if (typeof optionsOrMaxRequests === "object" && optionsOrMaxRequests !== null) {
    maxRequests = optionsOrMaxRequests.limit ?? optionsOrMaxRequests.maxRequests ?? 10;
    windowMs = optionsOrMaxRequests.windowMs ?? windowMsParam;
  }

  const now = Date.now();
  const record = actionTracker.get(identifier);

  if (!record || now > record.resetAt) {
    actionTracker.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: maxRequests - 1, reset: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetAt,
      error: "تم تجاوز الحد المسموح من المحاولات، يرجى الانتظار قليلاً",
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: maxRequests - record.count,
    reset: record.resetAt,
  };
}

export const verifyActionRateLimit = checkRateLimit;