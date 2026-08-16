export interface RateLimitConfig {
  limit: number;      // الحد الأقصى للطلبات المسموحة
  windowMs: number;   // النافذة الزمنية بالمللي ثانية
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// تنظيف السجلات القديمة تلقائياً لتجنب استهلاك الذاكرة
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (now > record.resetTime) {
      memoryStore.delete(key);
    }
  }
}, 60000);

export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    const resetTime = now + config.windowMs;
    memoryStore.set(key, { count: 1, resetTime });
    return { success: true, limit: config.limit, remaining: config.limit - 1, reset: resetTime };
  }

  if (record.count >= config.limit) {
    return { success: false, limit: config.limit, remaining: 0, reset: record.resetTime };
  }

  record.count += 1;
  return {
    success: true,
    limit: config.limit,
    remaining: config.limit - record.count,
    reset: record.resetTime,
  };
}