-- JISR JORDAN — Stage 15
-- Fix admin provider management visibility and repair legacy STAFF/provider drift.
-- Safe/idempotent migration.

-- provider_profiles is part of the admin workflow, so admins must be able
-- to read all rows explicitly under RLS.
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all provider profiles"
  ON public.provider_profiles;

CREATE POLICY "Admins read all provider profiles"
  ON public.provider_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Providers should still be able to read their own profile.
DROP POLICY IF EXISTS "Providers read own profile"
  ON public.provider_profiles;

CREATE POLICY "Providers read own profile"
  ON public.provider_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
  );

-- Backfill legacy STAFF users that somehow have no provider_profiles row.
-- We mark them APPROVED because STAFF is already the post-approval role in
-- the existing workflow. This repairs inconsistent old data instead of
-- hiding those users from /admin/providers.
INSERT INTO public.provider_profiles (
  user_id,
  bio,
  service_areas,
  experience,
  application_status,
  is_verified,
  applied_at,
  created_at,
  updated_at
)
SELECT
  u.id,
  NULL,
  ARRAY[]::TEXT[],
  NULL,
  'APPROVED',
  TRUE,
  COALESCE(u.created_at, NOW()),
  COALESCE(u.created_at, NOW()),
  NOW()
FROM public.users u
LEFT JOIN public.provider_profiles pp
  ON pp.user_id = u.id
WHERE u.role = 'STAFF'
  AND pp.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Normalize profile state for existing STAFF users only when the profile
-- is in a legacy default state. Do not override explicit REJECTED/SUSPENDED.
UPDATE public.provider_profiles pp
SET
  application_status = 'APPROVED',
  is_verified = TRUE,
  updated_at = NOW()
FROM public.users u
WHERE u.id = pp.user_id
  AND u.role = 'STAFF'
  AND COALESCE(pp.application_status, 'NOT_APPLIED') = 'NOT_APPLIED';

-- Ensure admins can read provider_services explicitly under RLS.
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read all provider services"
  ON public.provider_services;

CREATE POLICY "Admins read all provider services"
  ON public.provider_services
  FOR SELECT
  TO authenticated
  USING (
    public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- Existing provider own-read policy may or may not exist depending on
-- migration history; recreate it idempotently.
DROP POLICY IF EXISTS "Providers read own services"
  ON public.provider_services;

CREATE POLICY "Providers read own services"
  ON public.provider_services
  FOR SELECT
  TO authenticated
  USING (
    provider_id = auth.uid()
  );
