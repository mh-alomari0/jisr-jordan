import { afterEach, describe, expect, it, vi } from "vitest";
import { configureObservabilitySink, logger } from "@/lib/logger";

describe("production-safe structured logger", () => {
  afterEach(() => configureObservabilitySink(null));

  it("redacts sensitive metadata before console and monitoring", () => {
    const capture = vi.fn();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    configureObservabilitySink({ capture });
    logger.error("operation failed", {
      context: "SecurityTest",
      metadata: { email: "person@example.com", nested: { phone: "0790000000", bookingId: "booking-1" } },
    });
    const event = capture.mock.calls[0][0];
    expect(event.metadata.email).toBe("[REDACTED]");
    const nested = event.metadata.nested as Record<string, unknown>;
    expect(nested.phone).toBe("[REDACTED]");
    expect(nested.bookingId).toBe("booking-1");
    expect(consoleSpy.mock.calls[0][0]).not.toContain("person@example.com");
    consoleSpy.mockRestore();
  });
});
