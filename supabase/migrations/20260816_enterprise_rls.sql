-- ====================================================================
-- 1. إنشاء الجداول أو إضافة الأعمدة الناقصة تلقائياً
-- ====================================================================

-- A. جدول المستخدمين
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. جدول الخدمات
CREATE TABLE IF NOT EXISTS public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. جدول الحجوزات مع ضمان الأعمدة
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- إضافة الأعمدة الناقصة لجدول الحجوزات إن لم تكن موجودة
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE RESTRICT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS booking_date DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- D. جدول سجل التدقيق
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 2. إعداد التزامن التلقائي بين Auth و Public Users
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'CUSTOMER')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- مزامنة المستخدمين الحاليين
INSERT INTO public.users (id, email, phone, role)
SELECT id, email, phone, 'CUSTOMER'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 3. تفعيل حماية RLS والدالة المرجعية للأدوار
-- ====================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'CUSTOMER'
  );
$$;

-- ====================================================================
-- 4. إزالة وتطبيق سياسات RLS الصارمة
-- ====================================================================
DROP POLICY IF EXISTS "Public read active services" ON public.services;
DROP POLICY IF EXISTS "Admins mutate services" ON public.services;
DROP POLICY IF EXISTS "Users read own profile or Admins read all" ON public.users;
DROP POLICY IF EXISTS "Users update own profile protected" ON public.users;
DROP POLICY IF EXISTS "Users view own bookings or Admin view all" ON public.bookings;
DROP POLICY IF EXISTS "Users create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users update own pending bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins read audit logs" ON public.audit_logs;

-- سياسات الخدمات SERVICES
CREATE POLICY "Public read active services" ON public.services
  FOR SELECT USING (is_active = true OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "Admins mutate services" ON public.services
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- سياسات المستخدمين USERS
CREATE POLICY "Users read own profile or Admins read all" ON public.users
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN', 'SUPPORT'));

CREATE POLICY "Users update own profile protected" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = public.current_user_role());

-- سياسات الحجوزات BOOKINGS
CREATE POLICY "Users view own bookings or Admin view all" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid() 
    OR provider_id = auth.uid() 
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN', 'SUPPORT')
  );

CREATE POLICY "Users create own bookings" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users update own pending bookings" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    (customer_id = auth.uid() AND status = 'PENDING') 
    OR provider_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

-- سياسات سجل التدقيق AUDIT LOGS
CREATE POLICY "Admins read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));