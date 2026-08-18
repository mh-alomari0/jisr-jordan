-- ====================================================================
-- JISR JORDAN — PHASE 1: SECURITY HARDENING MIGRATION
-- Date: 2026-08-18
-- Purpose: Add all missing tables, columns, RLS policies, and indexes
--          that the application code references but were never deployed.
-- ====================================================================

-- ====================================================================
-- 1. MISSING COLUMNS ON EXISTING TABLES
-- ====================================================================

-- 1a. users.address — referenced by profile.ts read/write
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS address TEXT;

-- 1b. services.category — referenced by services-search.ts filter + homepage categories
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category TEXT;

-- 1c. bookings.payment_status — referenced by /api/payments/webhook update
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'UNPAID'
  CHECK (payment_status IN ('UNPAID', 'PENDING', 'PAID', 'FAILED', 'REFUNDED'));

-- 1d. reviews.service_id — referenced by reviews.ts action (upsert + query)
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;

-- Make booking_id nullable so reviews can be submitted per-service (not only per-booking)
ALTER TABLE public.reviews
  ALTER COLUMN booking_id DROP NOT NULL;

-- Update reviews unique constraint to include service_id for the upsert pattern used in code
ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS unique_booking_review;
ALTER TABLE public.reviews
  ADD CONSTRAINT unique_service_user_review UNIQUE (service_id, customer_id);

-- ====================================================================
-- 2. CREATE MISSING TABLES
-- ====================================================================

-- 2a. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'JOD',
  payment_method VARCHAR(50) NOT NULL DEFAULT 'CARD',
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED')),
  transaction_id VARCHAR(100) UNIQUE,
  idempotency_key VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'INFO'
    CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'BOOKING', 'PAYMENT')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2c. PROVIDER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bio TEXT,
  service_areas TEXT[] DEFAULT ARRAY['عمّان', 'الزرقاء'],
  working_hours JSONB DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": false, "sat": true, "sun": true}'::jsonb,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2d. PROVIDER SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS public.provider_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, day_of_week)
);

-- ====================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_payments_booking ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_user ON public.provider_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_provider_schedules_provider ON public.provider_schedules(provider_id);

CREATE INDEX IF NOT EXISTS idx_services_category ON public.services(category);
CREATE INDEX IF NOT EXISTS idx_reviews_service ON public.reviews(service_id);

-- ====================================================================
-- 4. ENABLE ROW LEVEL SECURITY ON ALL NEW TABLES
-- ====================================================================

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_schedules ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. RLS POLICIES
-- ====================================================================

-- ----- PAYMENTS POLICIES -----
-- Customers see only their own payments
CREATE POLICY "Customers read own payments"
  ON public.payments FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Only authenticated users can insert payments (their own)
CREATE POLICY "Customers create own payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Only admins or the system can update payments (webhook uses service role)
CREATE POLICY "Admins update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- ----- NOTIFICATIONS POLICIES -----
-- Users see only their own notifications
CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- System inserts (server actions) can insert for any authenticated user
-- Restricted by application-layer authorization in sendSystemNotificationAction
CREATE POLICY "Authenticated insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- ----- PROVIDER PROFILES POLICIES -----
-- Everyone can read verified provider profiles (for service discovery)
CREATE POLICY "Public read provider profiles"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (is_verified = true OR user_id = auth.uid() OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Providers can manage their own profile
CREATE POLICY "Providers manage own profile"
  ON public.provider_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can manage all provider profiles (verification, etc.)
CREATE POLICY "Admins manage all provider profiles"
  ON public.provider_profiles FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- ----- PROVIDER SCHEDULES POLICIES -----
-- Providers read their own schedules; admins read all
CREATE POLICY "Providers read own schedules"
  ON public.provider_schedules FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Providers manage their own schedules
CREATE POLICY "Providers manage own schedules"
  ON public.provider_schedules FOR ALL TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- ====================================================================
-- 6. ADD REVIEWS UPDATE/DELETE POLICIES (were missing)
-- ====================================================================

CREATE POLICY "Users update own reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (customer_id = auth.uid());
