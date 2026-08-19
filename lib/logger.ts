type LogLevel = "info" | "warn" | "error" | "debug";
interface LogPayload { message: string; level?: LogLevel; context?: string; userId?: string; metadata?: Record<string, unknown>; error?: unknown; }
export interface ObservabilityEvent { timestamp: string; level: LogLevel; message: string; context: string; subjectId?: string; metadata: Record<string, unknown>; error?: unknown; }
export interface ObservabilitySink { capture(event: ObservabilityEvent): void | Promise<void>; }

const SENSITIVE_KEY = /email|phone|address|password|secret|token|authorization|cookie|api[-_]?key|message|details|hint/i;
let observabilitySink: ObservabilitySink | null = null;

function redact(value: unknown, key = "", depth = 0): unknown {
  if (SENSITIVE_KEY.test(key)) return "[REDACTED]";
  if (depth > 5) return "[TRUNCATED]";
  if (value instanceof Error) return process.env.NODE_ENV === "production"
    ? { name: value.name }
    : { name: value.name, message: value.message.slice(0, 500), ...(value.stack ? { stack: value.stack.slice(0, 4_000) } : {}) };
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redact(item, key, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).slice(0, 50)
      .map(([childKey, childValue]) => [childKey, redact(childValue, childKey, depth + 1)])
  );
  if (typeof value === "string") return value.slice(0, 2_000);
  return value;
}

export function configureObservabilitySink(sink: ObservabilitySink | null) { observabilitySink = sink; }

class EnterpriseLogger {
  private event(payload: LogPayload): ObservabilityEvent {
    return {
      timestamp: new Date().toISOString(), level: payload.level || "info",
      message: payload.message.slice(0, 500), context: payload.context || "App",
      subjectId: payload.userId, metadata: redact(payload.metadata || {}) as Record<string, unknown>,
      ...(payload.error === undefined || payload.error === null ? {} : { error: redact(payload.error, "error") }),
    };
  }
  private emit(payload: LogPayload) {
    const event = this.event(payload);
    const serialized = JSON.stringify(event);
    if (event.level === "error") console.error(serialized);
    else if (event.level === "warn") console.warn(serialized);
    else console.log(serialized);
    if (observabilitySink) {
      try {
        const result = observabilitySink.capture(event);
        if (result instanceof Promise) void result.catch(() => undefined);
      } catch { /* Monitoring must never break the request path. */ }
    }
  }
  info(message: string, options?: Omit<LogPayload, "message" | "level">) { this.emit({ message, level: "info", ...options }); }
  warn(message: string, options?: Omit<LogPayload, "message" | "level">) { this.emit({ message, level: "warn", ...options }); }
  error(message: string, options?: Omit<LogPayload, "message" | "level">) { this.emit({ message, level: "error", ...options }); }
}
export const logger = new EnterpriseLogger();
