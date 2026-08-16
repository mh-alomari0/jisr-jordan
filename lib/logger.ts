type LogLevel = "info" | "warn" | "error" | "debug";

interface LogPayload {
  message: string;
  level?: LogLevel;
  context?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  error?: unknown;
}

class EnterpriseLogger {
  private formatLog(payload: LogPayload) {
    const timestamp = new Date().toISOString();
    
    const logData: Record<string, unknown> = {
      timestamp,
      level: payload.level || "info",
      message: payload.message,
      context: payload.context || "App",
      userId: payload.userId || "anonymous",
      metadata: payload.metadata || {},
    };

    if (payload.error !== undefined && payload.error !== null) {
      logData.error =
        payload.error instanceof Error
          ? { name: payload.error.name, message: payload.error.message, stack: payload.error.stack }
          : payload.error;
    }

    return JSON.stringify(logData);
  }

  info(message: string, options?: Omit<LogPayload, "message" | "level">) {
    console.log(this.formatLog({ message, level: "info", ...options }));
  }

  warn(message: string, options?: Omit<LogPayload, "message" | "level">) {
    console.warn(this.formatLog({ message, level: "warn", ...options }));
  }

  error(message: string, options?: Omit<LogPayload, "message" | "level">) {
    console.error(this.formatLog({ message, level: "error", ...options }));
  }
}

export const logger = new EnterpriseLogger();