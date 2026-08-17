-- 1. إنشاء جدول ملفات وتجهيزات المزودين
CREATE TABLE IF NOT EXISTS public.provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bio TEXT,
  service_areas TEXT[] DEFAULT ARRAY['عمان', 'الزرقاء'],
  working_hours JSONB DEFAULT '{"mon": true, "tue": true, "wed": true, "thu": true, "fri": false, "sat": true, "sun": true}'::jsonb,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. إنشاء فهرس الربط المباشر
CREATE INDEX IF NOT EXISTS idx_provider_profiles_user ON public.provider_profiles(user_id);