import { describe, expect, it } from "vitest";
import {
  canTransition,
  getAllowedTransitions,
  validateStatusTransition,
} from "@/lib/booking-state-machine";

describe("Canonical booking state machine", () => {
  it("allows only the documented happy-path transitions", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition("CONFIRMED", "ASSIGNED")).toBe(true);
    expect(canTransition("ASSIGNED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransition("COMPLETED", "REFUNDED")).toBe(true);
  });

  it("treats cancelled and refunded bookings as terminal", () => {
    expect(getAllowedTransitions("CANCELLED")).toEqual([]);
    expect(getAllowedTransitions("REFUNDED")).toEqual([]);
  });

  it("rejects skipping steps, reopening, and unknown statuses", () => {
    expect(validateStatusTransition("PENDING", "COMPLETED").valid).toBe(false);
    expect(validateStatusTransition("COMPLETED", "IN_PROGRESS").valid).toBe(false);
    expect(validateStatusTransition("CANCELLED", "PENDING").valid).toBe(false);
    expect(validateStatusTransition("UNKNOWN", "PENDING").valid).toBe(false);
  });

  it("matches the complete allowed transition matrix", () => {
    const statuses = ["PENDING", "CONFIRMED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REFUNDED"] as const;
    const expected = new Set([
      "PENDING>CONFIRMED", "PENDING>CANCELLED", "CONFIRMED>ASSIGNED",
      "CONFIRMED>CANCELLED", "ASSIGNED>IN_PROGRESS", "ASSIGNED>CANCELLED",
      "IN_PROGRESS>COMPLETED", "COMPLETED>REFUNDED",
    ]);
    for (const from of statuses) for (const to of statuses) {
      expect(canTransition(from, to), `${from} -> ${to}`).toBe(expected.has(`${from}>${to}`));
    }
  });
});
