-- ====================================================================
-- JISR JORDAN — FINAL AUDIT: CRITICAL SECURITY FIXES
-- Date: 2026-08-18
-- Purpose: Fix CRITICAL security vulnerabilities discovered during
--          the final independent audit.
-- ====================================================================

-- ====================================================================
-- FIX 1: Notification INSERT policy — WITH CHECK (true) vulnerability
-- Any authenticated user could insert notifications for any other user.
-- Restrict to: users can only insert their own notifications,
--              or admins/system can insert for anyone.
-- ====================================================================

DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;

CREATE POLICY "Restricted insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- ====================================================================
-- FIX 2: Provider profiles — prevent self-verification
-- The FOR ALL policy allowed providers to set is_verified = true
-- on their own profile. Split into granular policies.
-- ====================================================================

-- Drop the overly permissive FOR ALL policy for providers
DROP POLICY IF EXISTS "Providers manage own profile" ON public.provider_profiles;

-- Providers can SELECT their own profile (already covered by public read, but explicit)
CREATE POLICY "Providers read own profile"
  ON public.provider_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Providers can INSERT their own profile (onboarding)
CREATE POLICY "Providers create own profile"
  ON public.provider_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Providers can UPDATE their own profile BUT cannot change is_verified
-- The WITH CHECK ensures is_verified stays unchanged unless admin
CREATE POLICY "Providers update own profile (no verify)"
  ON public.provider_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND is_verified = (SELECT pp.is_verified FROM public.provider_profiles pp WHERE pp.id = id)
  );

-- Providers can DELETE their own profile
CREATE POLICY "Providers delete own profile"
  ON public.provider_profiles FOR DELETE TO authenticated
  USING (user_id = auth.uid());
