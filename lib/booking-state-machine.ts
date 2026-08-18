/**
 * Booking State Machine
 * Defines valid booking status transitions for the Jisr Jordan platform.
 * All booking status updates MUST go through `validateStatusTransition()`.
 */

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

/** Valid transitions: current status → allowed next statuses */
const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

/** Terminal statuses that cannot transition to anything */
export const TERMINAL_STATUSES: BookingStatus[] = ["CANCELLED", "REFUNDED"];

/** Statuses where a customer can cancel */
export const CANCELLABLE_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "ASSIGNED"];

/**
 * Validate a booking status transition.
 * Returns { valid: true } if the transition is allowed, or { valid: false, error: "..." } if not.
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): { valid: true } | { valid: false; error: string } {
  const current = currentStatus as BookingStatus;
  const next = newStatus as BookingStatus;

  if (!VALID_TRANSITIONS[current]) {
    return { valid: false, error: `حالة الحجز الحالية غير صالحة: ${currentStatus}` };
  }

  if (!VALID_TRANSITIONS[next] && next !== current) {
    return { valid: false, error: `حالة الحجز المطلوبة غير صالحة: ${newStatus}` };
  }

  if (!VALID_TRANSITIONS[current].includes(next)) {
    return {
      valid: false,
      error: `لا يمكن تغيير حالة الحجز من "${currentStatus}" إلى "${newStatus}"`,
    };
  }

  return { valid: true };
}

/**
 * Check if a specific transition is valid.
 */
export function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get all allowed next statuses from a given status.
 */
export function getAllowedTransitions(status: BookingStatus): BookingStatus[] {
  return VALID_TRANSITIONS[status] || [];
}
