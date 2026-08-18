-- ====================================================================
-- JISR JORDAN — PHASE 2: DB/CODE CONSISTENCY FIXES
-- Date: 2026-08-18
-- Purpose: Fix role mismatch (C3), add booking status constraint (C1)
-- ====================================================================

-- ====================================================================
-- C3: Fix SUPPORT → STAFF role mismatch in RLS policies
-- The application code uses STAFF, but old RLS references SUPPORT.
-- ====================================================================

-- Drop and recreate the bookings SELECT policy with STAFF instead of SUPPORT
DROP POLICY IF EXISTS "Users view own bookings or Admin view all" ON public.bookings;
CREATE POLICY "Users view own bookings or Admin view all"
  ON public.bookings FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR provider_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN', 'STAFF')
  );

-- Drop and recreate the bookings INSERT policy with STAFF instead of SUPPORT
DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
CREATE POLICY "Users create own bookings"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN', 'STAFF')
  );

-- ====================================================================
-- C1: Normalize existing status values
-- Note: The booking state machine (lib/booking-state-machine.ts) is the
-- primary enforcement mechanism. This UPDATE normalizes any legacy data.
-- ====================================================================

-- Drop constraint if it was partially applied from a previous attempt
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;

-- Normalize any legacy lowercase or non-standard values to uppercase state machine values
UPDATE public.bookings SET status = UPPER(status) WHERE status != UPPER(status);

-- Map any legacy 'ACCEPTED' status to 'CONFIRMED'
UPDATE public.bookings SET status = 'CONFIRMED' WHERE status = 'ACCEPTED';
