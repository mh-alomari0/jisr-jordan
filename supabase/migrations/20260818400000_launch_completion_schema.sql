-- ====================================================================
-- JISR JORDAN — LAUNCH COMPLETION: SCHEMA CHANGES
-- Date: 2026-08-18
-- Purpose: Add provider_services table, provider onboarding fields,
--          booking assignment infrastructure, and COD support.
-- ====================================================================

-- ====================================================================
-- 1. PROVIDER APPLICATION FIELDS ON provider_profiles
-- ====================================================================

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS application_status TEXT DEFAULT 'NOT_APPLIED'
    CHECK (application_status IN (
      'NOT_APPLIED', 'PENDING_VERIFICATION', 'APPROVED', 'REJECTED', 'SUSPENDED'
    ));

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS application_notes TEXT;

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS experience TEXT;

-- ====================================================================
-- 2. PROVIDER SERVICES TABLE (Provider ↔ Service relationship)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, service_id)
);

ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_provider_services_provider ON public.provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service ON public.provider_services(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_active ON public.provider_services(provider_id, is_active) WHERE is_active = true;

-- RLS Policies
CREATE POLICY "Providers read own services"
  ON public.provider_services FOR SELECT TO authenticated
  USING (
    provider_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY "Providers manage own services"
  ON public.provider_services FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Admins manage all provider services"
  ON public.provider_services FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Public read active provider services (for assignment eligibility)
CREATE POLICY "Public read active provider services"
  ON public.provider_services FOR SELECT TO authenticated
  USING (is_active = true);

-- ====================================================================
-- 3. INDEXES FOR PROVIDER ASSIGNMENT QUERIES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_provider_profiles_application_status
  ON public.provider_profiles(application_status);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_user_verified
  ON public.provider_profiles(user_id) WHERE is_verified = true;

-- ====================================================================
-- 4. RPC: ASSIGN PROVIDER TO BOOKING (atomic with conflict check)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.assign_provider_to_booking(
  p_booking_id UUID,
  p_provider_id UUID,
  p_assigned_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking RECORD;
  v_provider RECORD;
  v_conflict RECORD;
BEGIN
  -- 1. Verify booking exists and is in assignable state
  SELECT id, status, service_id, booking_date, start_time, end_time
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id;

  IF v_booking IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_booking.status NOT IN ('PENDING', 'CONFIRMED') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS',
      'message', 'Booking must be PENDING or CONFIRMED to assign a provider');
  END IF;

  -- 2. Verify provider is verified and active
  SELECT pp.user_id, pp.is_verified, pp.application_status, u.role
  INTO v_provider
  FROM public.provider_profiles pp
  JOIN public.users u ON u.id = pp.user_id
  WHERE pp.user_id = p_provider_id;

  IF v_provider IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROVIDER_NOT_FOUND');
  END IF;

  IF NOT v_provider.is_verified OR v_provider.application_status != 'APPROVED' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROVIDER_NOT_VERIFIED',
      'message', 'Provider must be verified and approved');
  END IF;

  -- 3. Check for scheduling conflicts
  SELECT id INTO v_conflict
  FROM public.bookings
  WHERE provider_id = p_provider_id
    AND booking_date = v_booking.booking_date
    AND id != p_booking_id
    AND status NOT IN ('CANCELLED', 'REFUNDED')
    AND (
      (start_time, end_time) OVERLAPS (v_booking.start_time, v_booking.end_time)
    )
  LIMIT 1;

  IF v_conflict IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'SCHEDULE_CONFLICT',
      'message', 'Provider has an overlapping booking at this time');
  END IF;

  -- 4. Assign provider and transition to ASSIGNED
  UPDATE public.bookings
  SET provider_id = p_provider_id,
      status = 'ASSIGNED'
  WHERE id = p_booking_id;

  -- 5. Log the assignment
  INSERT INTO public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    p_assigned_by,
    'PROVIDER_ASSIGNED',
    'booking',
    p_booking_id,
    jsonb_build_object('provider_id', p_provider_id, 'booking_id', p_booking_id)
  );

  RETURN jsonb_build_object('success', true, 'booking_id', p_booking_id, 'provider_id', p_provider_id);
END;
$$;

-- ====================================================================
-- 5. RPC: PROVIDER APPLICATION (atomic apply)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.apply_as_provider(
  p_user_id UUID,
  p_bio TEXT,
  p_service_areas TEXT[],
  p_experience TEXT,
  p_service_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
BEGIN
  -- Check if user already has a profile
  SELECT id, application_status INTO v_existing
  FROM public.provider_profiles
  WHERE user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    IF v_existing.application_status = 'APPROVED' THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_APPROVED');
    END IF;
    IF v_existing.application_status = 'PENDING_VERIFICATION' THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PENDING');
    END IF;
    -- Update existing rejected/not-applied profile
    UPDATE public.provider_profiles
    SET bio = p_bio,
        service_areas = p_service_areas,
        experience = p_experience,
        application_status = 'PENDING_VERIFICATION',
        application_notes = NULL,
        applied_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Create new provider profile
    INSERT INTO public.provider_profiles (
      user_id, bio, service_areas, experience,
      application_status, applied_at, is_verified
    ) VALUES (
      p_user_id, p_bio, p_service_areas, p_experience,
      'PENDING_VERIFICATION', NOW(), false
    );
  END IF;

  -- Link provider services
  IF p_service_ids IS NOT NULL AND array_length(p_service_ids, 1) > 0 THEN
    DELETE FROM public.provider_services WHERE provider_id = p_user_id;
    INSERT INTO public.provider_services (provider_id, service_id)
    SELECT p_user_id, unnest(p_service_ids);
  END IF;

  RETURN jsonb_build_object('success', true, 'status', 'PENDING_VERIFICATION');
END;
$$;

-- ====================================================================
-- 6. PAYMENT: ADD COD SUPPORT
-- ====================================================================

-- Extend payment method to include COD explicitly
-- The existing CHECK allows CARD; we add COD
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_payment_method_check
  CHECK (payment_method IN ('CARD', 'CASH_ON_DELIVERY', 'EFAWATEERCOM'));

-- Add PAY_ON_COMPLETION status for COD bookings
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_status_check
  CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED', 'PAY_ON_COMPLETION'));
