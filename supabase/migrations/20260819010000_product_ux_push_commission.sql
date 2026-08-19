-- Product UX correction: provider-first discovery, profile media, push foundations,
-- and the owner-approved 10% marketplace commission. Additive; historical booking
-- and commission snapshots are intentionally untouched.

ALTER TABLE public.provider_profiles
  ADD COLUMN IF NOT EXISTS experience_start_year SMALLINT
    CHECK (experience_start_year IS NULL OR experience_start_year BETWEEN 1950 AND 2100),
  ADD COLUMN IF NOT EXISTS experience_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS experience_verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_path TEXT,
  ADD COLUMN IF NOT EXISTS cover_path TEXT;

CREATE INDEX IF NOT EXISTS idx_service_listings_service_type_public
  ON public.service_listings(legacy_service_id, status, base_price, published_at DESC)
  WHERE legacy_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_provider_profiles_marketplace_sort
  ON public.provider_profiles(application_status, is_verified, experience_start_year, user_id);

-- The product owner selected a 10% global default on 2026-08-19. Existing
-- booking snapshots are not updated. A real admin identity is retained as the
-- configuration actor because the commission table deliberately requires one.
DO $$
DECLARE
  v_actor UUID;
BEGIN
  SELECT id INTO v_actor
  FROM public.users
  WHERE role IN ('SUPER_ADMIN', 'ADMIN')
  ORDER BY CASE role WHEN 'SUPER_ADMIN' THEN 0 ELSE 1 END, created_at
  LIMIT 1;

  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'A SUPER_ADMIN or ADMIN account is required to configure the 10 percent commission';
  END IF;

  UPDATE public.marketplace_commission_rules
  SET is_active = FALSE, effective_until = NOW()
  WHERE category_id IS NULL AND is_active = TRUE
    AND (effective_until IS NULL OR effective_until > NOW());

  INSERT INTO public.marketplace_commission_rules(
    category_id, rate_percent, is_active, effective_from, created_by
  ) VALUES (NULL, 10.00, TRUE, NOW(), v_actor);

  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (
    v_actor,
    'COMMISSION_RULE_CONFIGURED',
    'GLOBAL_DEFAULT_10_PERCENT',
    jsonb_build_object('rate_percent', 10.00, 'source', 'OWNER_PRODUCT_DECISION', 'historical_snapshots_changed', FALSE)
  );
END;
$$;

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  bookings_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  bookings_push BOOLEAN NOT NULL DEFAULT TRUE,
  quotes_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  quotes_push BOOLEAN NOT NULL DEFAULT TRUE,
  system_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  system_push BOOLEAN NOT NULL DEFAULT TRUE,
  commissions_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  commissions_push BOOLEAN NOT NULL DEFAULT TRUE,
  provider_updates_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  provider_updates_push BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS visible_in_app BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL CHECK (char_length(endpoint) BETWEEN 20 AND 4096),
  p256dh TEXT NOT NULL CHECK (char_length(p256dh) BETWEEN 20 AND 512),
  auth_secret TEXT NOT NULL CHECK (char_length(auth_secret) BETWEEN 8 AND 256),
  expiration_time BIGINT,
  device_label TEXT CHECK (char_length(device_label) <= 120),
  user_agent TEXT CHECK (char_length(user_agent) <= 500),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_seen
  ON public.push_subscriptions(user_id, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.push_notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL UNIQUE REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED')),
  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 20),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  last_error_code TEXT CHECK (char_length(last_error_code) <= 80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_outbox_dispatch
  ON public.push_notification_outbox(status, available_at, created_at)
  WHERE status IN ('PENDING', 'FAILED');

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notification preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own push devices"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- No user-facing outbox policy is intentional. Only trusted service-role
-- dispatch code can inspect or mutate queued push deliveries.

DROP TRIGGER IF EXISTS set_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER set_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER set_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.apply_notification_in_app_preference()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_preferences public.notification_preferences%ROWTYPE;
BEGIN
  SELECT * INTO v_preferences FROM public.notification_preferences WHERE user_id = NEW.user_id;
  NEW.visible_in_app := CASE
    WHEN NEW.type = 'BOOKING' THEN COALESCE(v_preferences.bookings_in_app, TRUE)
    WHEN NEW.type = 'PAYMENT' THEN COALESCE(v_preferences.commissions_in_app, TRUE)
    WHEN NEW.type IN ('SUCCESS', 'WARNING') THEN COALESCE(v_preferences.provider_updates_in_app, TRUE)
    ELSE COALESCE(v_preferences.system_in_app, TRUE)
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS apply_notification_in_app_preference ON public.notifications;
CREATE TRIGGER apply_notification_in_app_preference
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.apply_notification_in_app_preference();

CREATE OR REPLACE FUNCTION public.queue_notification_for_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_enabled BOOLEAN;
BEGIN
  SELECT CASE
    WHEN NEW.type = 'BOOKING' THEN COALESCE(p.bookings_push, TRUE)
    WHEN NEW.type = 'PAYMENT' THEN COALESCE(p.commissions_push, TRUE)
    WHEN NEW.type IN ('SUCCESS', 'WARNING') THEN COALESCE(p.provider_updates_push, TRUE)
    ELSE COALESCE(p.system_push, TRUE)
  END INTO v_enabled
  FROM (SELECT NEW.user_id AS user_id) seed
  LEFT JOIN public.notification_preferences p ON p.user_id = seed.user_id;

  IF COALESCE(v_enabled, TRUE) THEN
    INSERT INTO public.push_notification_outbox(notification_id, user_id)
    VALUES (NEW.id, NEW.user_id)
    ON CONFLICT (notification_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS queue_notification_for_push ON public.notifications;
CREATE TRIGGER queue_notification_for_push
  AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.queue_notification_for_push();

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-private', 'profile-private', FALSE, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users read own private profile media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-private' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "Users upload own private profile media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-private' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "Users update own private profile media"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-private' AND (storage.foldername(name))[1] = auth.uid()::TEXT)
  WITH CHECK (bucket_id = 'profile-private' AND (storage.foldername(name))[1] = auth.uid()::TEXT);
CREATE POLICY "Users delete own private profile media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-private' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE OR REPLACE FUNCTION public.get_service_provider_listings(
  p_service_id UUID,
  p_sort TEXT DEFAULT 'RATING_DESC',
  p_service_area TEXT DEFAULT NULL,
  p_pricing_model TEXT DEFAULT NULL,
  p_min_price NUMERIC DEFAULT NULL,
  p_max_price NUMERIC DEFAULT NULL,
  p_min_rating NUMERIC DEFAULT NULL,
  p_min_experience INTEGER DEFAULT NULL,
  p_remote_only BOOLEAN DEFAULT FALSE,
  p_available_today BOOLEAN DEFAULT FALSE,
  p_limit INTEGER DEFAULT 24,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  listing_id UUID,
  listing_slug TEXT,
  listing_title TEXT,
  listing_summary TEXT,
  pricing_model TEXT,
  base_price NUMERIC,
  currency TEXT,
  delivery_type TEXT,
  service_areas TEXT[],
  remote_available BOOLEAN,
  image_path TEXT,
  provider_id UUID,
  provider_name TEXT,
  provider_avatar_path TEXT,
  provider_headline TEXT,
  provider_experience_start_year SMALLINT,
  experience_verified BOOLEAN,
  average_rating NUMERIC,
  review_count BIGINT,
  completed_booking_count BIGINT,
  active_service_count BIGINT,
  available_now BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 24), 1), 48);
  v_sort TEXT := CASE WHEN p_sort IN (
    'RATING_DESC', 'EXPERIENCE_DESC', 'EXPERIENCE_ASC', 'PRICE_ASC',
    'PRICE_DESC', 'COMPLETED_DESC', 'COMPLETED_ASC', 'AVAILABLE_FIRST'
  ) THEN p_sort ELSE 'RATING_DESC' END;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.services s WHERE s.id = p_service_id AND s.is_active = TRUE) THEN
    RETURN;
  END IF;
  IF p_pricing_model IS NOT NULL AND p_pricing_model NOT IN ('FIXED','STARTING_FROM','HOURLY','PER_SESSION','QUOTE_REQUIRED') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    sl.id, sl.slug, sl.title, sl.short_description, sl.pricing_model, sl.base_price,
    sl.currency, sl.delivery_type, sl.service_areas, sl.remote_available,
    (SELECT pm.storage_path FROM public.provider_media pm
      WHERE pm.listing_id = sl.id AND pm.status = 'ACTIVE' AND pm.storage_bucket = 'marketplace-public'
      ORDER BY pm.sort_order, pm.created_at LIMIT 1),
    sl.provider_id, COALESCE(u.full_name, 'مقدم خدمة'), pp.avatar_path, pp.headline,
    pp.experience_start_year, pp.experience_verified_at IS NOT NULL,
    COALESCE(metrics.average_rating, 0), COALESCE(metrics.review_count, 0),
    COALESCE(metrics.completed_count, 0), COALESCE(listing_metrics.active_count, 0),
    EXISTS (
      SELECT 1 FROM public.provider_schedules ps
      WHERE ps.provider_id = sl.provider_id AND ps.is_active = TRUE
        AND ps.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
        AND LOCALTIME BETWEEN ps.start_time AND ps.end_time
    )
  FROM public.service_listings sl
  JOIN public.provider_profiles pp ON pp.user_id = sl.provider_id
  JOIN public.users u ON u.id = sl.provider_id
  LEFT JOIN LATERAL (
    SELECT round(avg(r.rating)::NUMERIC, 1) AS average_rating,
      count(r.id)::BIGINT AS review_count,
      (SELECT count(*)::BIGINT FROM public.bookings b
        WHERE b.provider_id = sl.provider_id AND b.status = 'COMPLETED') AS completed_count
    FROM public.reviews r WHERE r.provider_id = sl.provider_id
  ) metrics ON TRUE
  LEFT JOIN LATERAL (
    SELECT count(*)::BIGINT AS active_count FROM public.service_listings own
    WHERE own.provider_id = sl.provider_id AND own.status = 'PUBLISHED'
  ) listing_metrics ON TRUE
  WHERE sl.legacy_service_id = p_service_id
    AND sl.status = 'PUBLISHED'
    AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
    AND (p_service_area IS NULL OR p_service_area = ANY(sl.service_areas) OR sl.remote_available = TRUE)
    AND (p_pricing_model IS NULL OR sl.pricing_model = p_pricing_model)
    AND (p_min_price IS NULL OR sl.base_price >= p_min_price)
    AND (p_max_price IS NULL OR sl.base_price <= p_max_price)
    AND (p_min_rating IS NULL OR COALESCE(metrics.average_rating, 0) >= p_min_rating)
    AND (p_min_experience IS NULL OR pp.experience_start_year IS NOT NULL
      AND EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER - pp.experience_start_year >= p_min_experience)
    AND (NOT p_remote_only OR sl.remote_available = TRUE)
    AND (NOT p_available_today OR EXISTS (
      SELECT 1 FROM public.provider_schedules ps
      WHERE ps.provider_id = sl.provider_id AND ps.is_active = TRUE
        AND ps.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
    ))
  ORDER BY
    CASE WHEN v_sort = 'RATING_DESC' THEN COALESCE(metrics.average_rating, 0) END DESC,
    CASE WHEN v_sort = 'EXPERIENCE_DESC' THEN pp.experience_start_year END ASC NULLS LAST,
    CASE WHEN v_sort = 'EXPERIENCE_ASC' THEN pp.experience_start_year END DESC NULLS LAST,
    CASE WHEN v_sort = 'PRICE_ASC' THEN sl.base_price END ASC NULLS LAST,
    CASE WHEN v_sort = 'PRICE_DESC' THEN sl.base_price END DESC NULLS LAST,
    CASE WHEN v_sort = 'COMPLETED_DESC' THEN COALESCE(metrics.completed_count, 0) END DESC,
    CASE WHEN v_sort = 'COMPLETED_ASC' THEN COALESCE(metrics.completed_count, 0) END ASC,
    CASE WHEN v_sort = 'AVAILABLE_FIRST' THEN EXISTS (
      SELECT 1 FROM public.provider_schedules ps
      WHERE ps.provider_id = sl.provider_id AND ps.is_active = TRUE
        AND ps.day_of_week = EXTRACT(DOW FROM CURRENT_DATE)::INTEGER
        AND LOCALTIME BETWEEN ps.start_time AND ps.end_time
    ) END DESC,
    sl.published_at DESC, sl.id
  LIMIT v_limit OFFSET GREATEST(COALESCE(p_offset, 0), 0);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_provider_profile(p_provider_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', pp.user_id,
    'name', COALESCE(u.full_name, 'مقدم خدمة'),
    'headline', pp.headline,
    'bio', pp.bio,
    'skills', pp.skills,
    'service_areas', pp.service_areas,
    'remote_available', pp.remote_available,
    'avatar_path', pp.avatar_path,
    'cover_path', pp.cover_path,
    'is_verified', pp.is_verified,
    'experience_start_year', pp.experience_start_year,
    'experience_verified', pp.experience_verified_at IS NOT NULL,
    'completed_bookings', (SELECT count(*) FROM public.bookings b WHERE b.provider_id = pp.user_id AND b.status = 'COMPLETED'),
    'average_rating', (SELECT round(avg(r.rating)::NUMERIC, 1) FROM public.reviews r WHERE r.provider_id = pp.user_id),
    'review_count', (SELECT count(*) FROM public.reviews r WHERE r.provider_id = pp.user_id),
    'listings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sl.id, 'slug', sl.slug, 'title', sl.title, 'short_description', sl.short_description,
        'delivery_type', sl.delivery_type, 'pricing_model', sl.pricing_model,
        'base_price', sl.base_price, 'currency', sl.currency, 'category_name', sc.name_ar,
        'service_areas', sl.service_areas,
        'image_path', (SELECT pm.storage_path FROM public.provider_media pm
          WHERE pm.listing_id = sl.id AND pm.status = 'ACTIVE' AND pm.storage_bucket = 'marketplace-public'
          ORDER BY pm.sort_order, pm.created_at LIMIT 1)
      ) ORDER BY sl.published_at DESC)
      FROM public.service_listings sl JOIN public.service_categories sc ON sc.id = sl.category_id
      WHERE sl.provider_id = pp.user_id AND sl.status = 'PUBLISHED'
    ), '[]'::JSONB),
    'posts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', post.id, 'content', post.content, 'post_type', post.post_type,
        'listing_id', post.listing_id, 'published_at', post.published_at,
        'media', COALESCE((SELECT jsonb_agg(jsonb_build_object('path', pm.storage_path, 'kind', pm.media_kind) ORDER BY pm.sort_order)
          FROM public.provider_media pm WHERE pm.post_id = post.id AND pm.status = 'ACTIVE'), '[]'::JSONB)
      ) ORDER BY post.published_at DESC)
      FROM (SELECT * FROM public.provider_posts WHERE provider_id = pp.user_id AND status = 'PUBLISHED'
        ORDER BY published_at DESC LIMIT 20) post
    ), '[]'::JSONB),
    'reviews', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', r.id, 'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at
      ) ORDER BY r.created_at DESC)
      FROM (SELECT id, rating, comment, created_at FROM public.reviews
        WHERE provider_id = pp.user_id ORDER BY created_at DESC LIMIT 100) r
    ), '[]'::JSONB)
  )
  FROM public.provider_profiles pp JOIN public.users u ON u.id = pp.user_id
  WHERE pp.user_id = p_provider_id AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE;
$$;

REVOKE ALL ON FUNCTION public.get_service_provider_listings(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER, BOOLEAN, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_service_provider_listings(UUID, TEXT, TEXT, TEXT, NUMERIC, NUMERIC, NUMERIC, INTEGER, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_notification_for_push() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.queue_notification_for_push() TO service_role;
REVOKE ALL ON FUNCTION public.apply_notification_in_app_preference() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_notification_in_app_preference() TO service_role;
