-- Jisr Jordan universal marketplace foundation.
-- Additive migration: preserves legacy services, bookings, reviews, and provider links.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name_ar TEXT NOT NULL CHECK (char_length(btrim(name_ar)) BETWEEN 2 AND 80),
  description_ar TEXT CHECK (char_length(description_ar) <= 500),
  icon TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  requires_moderation BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);

CREATE INDEX IF NOT EXISTS idx_service_categories_parent_order
  ON public.service_categories(parent_id, display_order, name_ar)
  WHERE is_active = TRUE;

DROP TRIGGER IF EXISTS set_service_categories_updated_at ON public.service_categories;
CREATE TRIGGER set_service_categories_updated_at
  BEFORE UPDATE ON public.service_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active category hierarchy"
  ON public.service_categories FOR SELECT
  USING (is_active = TRUE OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "Admins manage category hierarchy"
  ON public.service_categories FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Stable identifiers make the hierarchy idempotent across environments.
INSERT INTO public.service_categories
  (id, parent_id, slug, name_ar, description_ar, icon, display_order, requires_moderation)
VALUES
  ('20000000-0000-4000-8000-000000000001', NULL, 'home-services', 'الخدمات المنزلية', 'خدمات المنزل اليومية والتنظيف والتجهيزات.', 'house', 10, FALSE),
  ('20000000-0000-4000-8000-000000000002', NULL, 'technology-programming', 'التقنية والبرمجة', 'حلول رقمية وبرمجية ودعم تقني عن بُعد أو كمشاريع.', 'code-2', 20, FALSE),
  ('20000000-0000-4000-8000-000000000003', NULL, 'education-training', 'التعليم والتدريب', 'دروس وجلسات تدريب فردية ومهنية.', 'graduation-cap', 30, FALSE),
  ('20000000-0000-4000-8000-000000000004', NULL, 'design-creative', 'التصميم والإبداع', 'تصميم بصري ومحتوى إبداعي وخدمات إنتاج.', 'palette', 40, FALSE),
  ('20000000-0000-4000-8000-000000000005', NULL, 'business-consulting', 'الأعمال والاستشارات', 'خدمات أعمال مهنية تخضع لسياسة المنصة ونطاق الترخيص.', 'briefcase-business', 50, TRUE),
  ('20000000-0000-4000-8000-000000000006', NULL, 'events', 'المناسبات', 'تنظيم وتصوير وتجهيز المناسبات.', 'party-popper', 60, FALSE),
  ('20000000-0000-4000-8000-000000000007', NULL, 'maintenance-repair', 'الصيانة والإصلاح', 'إصلاح الأجهزة والأثاث والأعمال المتخصصة.', 'wrench', 70, FALSE),
  ('20000000-0000-4000-8000-000000000008', NULL, 'other-services', 'خدمات أخرى', 'فئات جديدة بعد مراجعة الإدارة والتأكد من ملاءمتها.', 'shapes', 80, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

INSERT INTO public.service_categories
  (id, parent_id, slug, name_ar, description_ar, icon, display_order, requires_moderation)
VALUES
  ('21000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'plumbing', 'السباكة والمياه', 'تمديدات المياه والتسربات والمصارف.', 'droplets', 10, FALSE),
  ('21000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'electricity', 'الكهرباء المنزلية', 'فحص وتركيب وصيانة الكهرباء المنزلية.', 'zap', 20, FALSE),
  ('21000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'cleaning', 'التنظيف', 'تنظيف المنازل والمساحات وخدمات ما بعد الصيانة.', 'sparkles', 30, FALSE),
  ('21000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'hvac', 'التكييف والتبريد', 'تركيب وتنظيف وصيانة أنظمة التكييف.', 'snowflake', 40, FALSE),
  ('21000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'gardening', 'الحدائق والمساحات الخارجية', 'تنسيق الحدائق والري والصيانة الخارجية.', 'leaf', 50, FALSE),
  ('21000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000007', 'carpentry', 'النجارة والأثاث', 'إصلاح وتركيب الأعمال الخشبية.', 'hammer', 10, FALSE),
  ('21000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000007', 'painting', 'الدهان والتشطيبات', 'دهان وتجهيز ومعالجة الأسطح.', 'paintbrush', 20, FALSE),
  ('21000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000007', 'appliance-repair', 'صيانة الأجهزة', 'فحص وإصلاح الأجهزة المنزلية.', 'refrigerator', 30, FALSE),
  ('22000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'web-development', 'تطوير المواقع', 'مواقع تعريفية ومتاجر وأنظمة ويب.', 'globe-2', 10, FALSE),
  ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'mobile-apps', 'تطبيقات الموبايل', 'تطوير وتحسين تطبيقات الهواتف.', 'smartphone', 20, FALSE),
  ('22000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'artificial-intelligence', 'الذكاء الاصطناعي', 'حلول وأتمتة مبنية على الذكاء الاصطناعي.', 'sparkles', 30, TRUE),
  ('22000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'technical-support', 'الدعم التقني', 'حل المشكلات التقنية والإعدادات.', 'life-buoy', 40, FALSE),
  ('22000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'databases', 'قواعد البيانات', 'تصميم وتحسين وترحيل قواعد البيانات.', 'database', 50, FALSE),
  ('23000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003', 'school-tutoring', 'الدروس المدرسية', 'دروس فردية أو مجموعات صغيرة للمواد المدرسية.', 'book-open', 10, FALSE),
  ('23000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000003', 'professional-training', 'التدريب المهني', 'جلسات تدريب مهارية ومهنية.', 'presentation', 20, TRUE),
  ('24000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004', 'graphic-design', 'التصميم الجرافيكي', 'هويات وشعارات ومواد بصرية.', 'pen-tool', 10, FALSE),
  ('24000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004', 'content-production', 'إنتاج المحتوى', 'إنتاج محتوى مرئي وكتابي يخدم الأعمال.', 'clapperboard', 20, TRUE),
  ('25000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000005', 'business-operations', 'تشغيل الأعمال', 'تنظيم العمليات والدعم الإداري.', 'chart-no-axes-combined', 10, TRUE),
  ('25000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'professional-consulting', 'الاستشارات المهنية', 'استشارات ضمن التخصص والترخيص والسياسة المعتمدة.', 'messages-square', 20, TRUE),
  ('26000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000006', 'event-planning', 'تنظيم المناسبات', 'تخطيط وتجهيز وإدارة المناسبات.', 'calendar-heart', 10, FALSE),
  ('26000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000006', 'photography', 'التصوير', 'تصوير المناسبات والمنتجات والجلسات.', 'camera', 20, FALSE)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL;

UPDATE public.services
SET category_id = CASE category
  WHEN 'PLUMBING' THEN '21000000-0000-4000-8000-000000000001'::UUID
  WHEN 'ELECTRICITY' THEN '21000000-0000-4000-8000-000000000002'::UUID
  WHEN 'CLEANING' THEN '21000000-0000-4000-8000-000000000003'::UUID
  WHEN 'HVAC' THEN '21000000-0000-4000-8000-000000000004'::UUID
  WHEN 'GARDENING' THEN '21000000-0000-4000-8000-000000000005'::UUID
  WHEN 'CARPENTRY' THEN '21000000-0000-4000-8000-000000000006'::UUID
  WHEN 'PAINTING' THEN '21000000-0000-4000-8000-000000000007'::UUID
  WHEN 'APPLIANCE_REPAIR' THEN '21000000-0000-4000-8000-000000000008'::UUID
  ELSE category_id
END
WHERE category_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_services_category_id_active
  ON public.services(category_id, is_active);

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS skills TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS cover_path TEXT,
  ADD COLUMN IF NOT EXISTS remote_available BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_profiles_public_slug
  ON public.provider_profiles(lower(public_slug)) WHERE public_slug IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.service_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  legacy_service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  slug TEXT NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 3 AND 120),
  short_description TEXT NOT NULL CHECK (char_length(btrim(short_description)) BETWEEN 10 AND 240),
  description TEXT NOT NULL CHECK (char_length(btrim(description)) BETWEEN 20 AND 4000),
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('ON_SITE', 'REMOTE', 'HYBRID', 'SESSION', 'PROJECT')),
  pricing_model TEXT NOT NULL CHECK (pricing_model IN ('FIXED', 'STARTING_FROM', 'HOURLY', 'PER_SESSION', 'QUOTE_REQUIRED')),
  base_price NUMERIC(10, 2) CHECK (base_price > 0 AND base_price <= 1000000),
  currency TEXT NOT NULL DEFAULT 'JOD' CHECK (currency = 'JOD'),
  estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes BETWEEN 15 AND 525600),
  service_areas TEXT[] NOT NULL DEFAULT '{}',
  remote_available BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'REJECTED')),
  moderation_notes TEXT CHECK (char_length(moderation_notes) <= 1000),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (pricing_model = 'QUOTE_REQUIRED' OR base_price IS NOT NULL),
  CHECK (delivery_type NOT IN ('REMOTE', 'HYBRID') OR remote_available = TRUE)
);

CREATE INDEX IF NOT EXISTS idx_service_listings_public_feed
  ON public.service_listings(status, published_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_provider_status
  ON public.service_listings(provider_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_category_status
  ON public.service_listings(category_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_listings_title_trgm
  ON public.service_listings USING gin (title extensions.gin_trgm_ops);

DROP TRIGGER IF EXISTS set_service_listings_updated_at ON public.service_listings;
CREATE TRIGGER set_service_listings_updated_at
  BEFORE UPDATE ON public.service_listings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.service_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published listings from approved providers"
  ON public.service_listings FOR SELECT
  USING (
    (status = 'PUBLISHED' AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.user_id = provider_id
        AND pp.application_status = 'APPROVED'
        AND pp.is_verified = TRUE
    ))
    OR provider_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );

CREATE POLICY "Approved providers create own listing drafts"
  ON public.service_listings FOR INSERT TO authenticated
  WITH CHECK (
    provider_id = auth.uid()
    AND status = 'DRAFT'
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.user_id = auth.uid()
        AND pp.application_status = 'APPROVED'
        AND pp.is_verified = TRUE
    )
  );

CREATE POLICY "Approved providers update own nonpublished listing state"
  ON public.service_listings FOR UPDATE TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (
    provider_id = auth.uid()
    AND status IN ('DRAFT', 'PENDING_REVIEW', 'PAUSED')
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.user_id = auth.uid()
        AND pp.application_status = 'APPROVED'
        AND pp.is_verified = TRUE
    )
  );

CREATE POLICY "Providers delete own unpublished listings"
  ON public.service_listings FOR DELETE TO authenticated
  USING (provider_id = auth.uid() AND status IN ('DRAFT', 'REJECTED'));

CREATE POLICY "Admins manage all listings"
  ON public.service_listings FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

CREATE OR REPLACE FUNCTION public.set_listing_publication(p_listing_id UUID, p_publish BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_listing RECORD;
  v_requires_moderation BOOLEAN;
  v_next_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT sl.id, sl.provider_id, sl.status, sc.requires_moderation
  INTO v_listing
  FROM public.service_listings sl
  JOIN public.service_categories sc ON sc.id = sl.category_id
  WHERE sl.id = p_listing_id
  FOR UPDATE OF sl;

  IF v_listing IS NULL OR v_listing.provider_id <> auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'LISTING_NOT_FOUND');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.user_id = auth.uid() AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_APPROVED');
  END IF;

  IF p_publish THEN
    IF v_listing.status NOT IN ('DRAFT', 'PAUSED', 'REJECTED') THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS');
    END IF;
    v_requires_moderation := v_listing.requires_moderation OR v_listing.status = 'REJECTED';
    v_next_status := CASE WHEN v_requires_moderation THEN 'PENDING_REVIEW' ELSE 'PUBLISHED' END;
  ELSE
    IF v_listing.status NOT IN ('PUBLISHED', 'PENDING_REVIEW') THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS');
    END IF;
    v_next_status := 'PAUSED';
  END IF;

  UPDATE public.service_listings
  SET status = v_next_status,
      moderation_notes = CASE WHEN v_next_status = 'PENDING_REVIEW' THEN NULL ELSE moderation_notes END,
      published_at = CASE WHEN v_next_status = 'PUBLISHED' THEN COALESCE(published_at, NOW()) ELSE published_at END
  WHERE id = p_listing_id;

  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'LISTING_STATUS_REQUESTED', p_listing_id::TEXT,
    jsonb_build_object('status', v_next_status));

  RETURN jsonb_build_object('success', TRUE, 'status', v_next_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_listing(p_listing_id UUID, p_decision TEXT, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_listing RECORD;
  v_next_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;
  IF p_decision NOT IN ('APPROVE', 'REJECT', 'DEACTIVATE') OR char_length(COALESCE(p_notes, '')) > 1000 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_DECISION');
  END IF;

  SELECT id, provider_id, title, status INTO v_listing
  FROM public.service_listings WHERE id = p_listing_id FOR UPDATE;
  IF v_listing IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'LISTING_NOT_FOUND');
  END IF;
  IF p_decision = 'APPROVE' AND NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp
    WHERE pp.user_id = v_listing.provider_id AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_APPROVED');
  END IF;

  v_next_status := CASE p_decision WHEN 'APPROVE' THEN 'PUBLISHED' WHEN 'REJECT' THEN 'REJECTED' ELSE 'PAUSED' END;
  UPDATE public.service_listings
  SET status = v_next_status,
      moderation_notes = NULLIF(btrim(p_notes), ''),
      published_at = CASE WHEN v_next_status = 'PUBLISHED' THEN COALESCE(published_at, NOW()) ELSE published_at END
  WHERE id = p_listing_id;

  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'LISTING_MODERATED', p_listing_id::TEXT,
    jsonb_build_object('decision', p_decision, 'notes', p_notes));
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (
    v_listing.provider_id,
    CASE WHEN v_next_status = 'PUBLISHED' THEN 'تم نشر عرض خدمتك' ELSE 'تحديث حالة عرض خدمتك' END,
    CASE WHEN v_next_status = 'PUBLISHED'
      THEN 'تم اعتماد ونشر عرض: ' || v_listing.title
      ELSE 'أصبحت حالة عرض ' || v_listing.title || ': ' || v_next_status END,
    CASE WHEN v_next_status = 'PUBLISHED' THEN 'SUCCESS' ELSE 'WARNING' END
  );

  RETURN jsonb_build_object('success', TRUE, 'status', v_next_status);
END;
$$;

REVOKE ALL ON FUNCTION public.set_listing_publication(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.moderate_listing(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_listing_publication(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.moderate_listing(UUID, TEXT, TEXT) TO authenticated, service_role;

