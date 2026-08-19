-- Universal marketplace transactions, commission snapshots, discovery content,
-- favorites, and image-media security. Additive and backward-compatible.

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS service_title TEXT,
  ADD COLUMN IF NOT EXISTS booking_time TEXT,
  ADD COLUMN IF NOT EXISTS area TEXT,
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.service_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_type TEXT DEFAULT 'LEGACY_HOME'
    CHECK (workflow_type IN ('LEGACY_HOME', 'DIRECT_LISTING', 'QUOTE_PROJECT')),
  ADD COLUMN IF NOT EXISTS delivery_type_snapshot TEXT
    CHECK (delivery_type_snapshot IS NULL OR delivery_type_snapshot IN ('ON_SITE', 'REMOTE', 'HYBRID', 'SESSION', 'PROJECT')),
  ADD COLUMN IF NOT EXISTS pricing_model_snapshot TEXT
    CHECK (pricing_model_snapshot IS NULL OR pricing_model_snapshot IN ('FIXED', 'STARTING_FROM', 'HOURLY', 'PER_SESSION', 'QUOTE_REQUIRED')),
  ADD COLUMN IF NOT EXISTS agreed_amount NUMERIC(10, 2) CHECK (agreed_amount IS NULL OR agreed_amount > 0),
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'JOD' CHECK (currency = 'JOD'),
  ADD COLUMN IF NOT EXISTS commission_rate_snapshot NUMERIC(5, 2)
    CHECK (commission_rate_snapshot IS NULL OR commission_rate_snapshot BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS commission_amount_snapshot NUMERIC(10, 2)
    CHECK (commission_amount_snapshot IS NULL OR commission_amount_snapshot >= 0),
  ADD COLUMN IF NOT EXISTS dispute_status TEXT DEFAULT 'NONE'
    CHECK (dispute_status IN ('NONE', 'OPEN', 'UNDER_REVIEW', 'RESOLVED'));

CREATE INDEX IF NOT EXISTS idx_bookings_listing_created
  ON public.bookings(listing_id, created_at DESC) WHERE listing_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.marketplace_commission_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE RESTRICT,
  rate_percent NUMERIC(5, 2) NOT NULL CHECK (rate_percent >= 0 AND rate_percent <= 100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_rules_active_scope
  ON public.marketplace_commission_rules(COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::UUID))
  WHERE is_active = TRUE AND effective_until IS NULL;

ALTER TABLE public.marketplace_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read commission rules"
  ON public.marketplace_commission_rules FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));
CREATE POLICY "Super admins manage commission rules"
  ON public.marketplace_commission_rules FOR ALL TO authenticated
  USING (public.current_user_role() = 'SUPER_ADMIN')
  WITH CHECK (public.current_user_role() = 'SUPER_ADMIN');

DROP TRIGGER IF EXISTS set_commission_rules_updated_at ON public.marketplace_commission_rules;
CREATE TRIGGER set_commission_rules_updated_at
  BEFORE UPDATE ON public.marketplace_commission_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.resolve_marketplace_commission_rate(p_category_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT r.rate_percent
  FROM public.marketplace_commission_rules r
  LEFT JOIN public.service_categories selected ON selected.id = p_category_id
  WHERE r.is_active = TRUE
    AND r.effective_from <= NOW()
    AND (r.effective_until IS NULL OR r.effective_until > NOW())
    AND (r.category_id = p_category_id OR r.category_id = selected.parent_id OR r.category_id IS NULL)
  ORDER BY
    CASE WHEN r.category_id = p_category_id THEN 0 WHEN r.category_id = selected.parent_id THEN 1 ELSE 2 END,
    r.effective_from DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.configure_marketplace_commission(
  p_category_id UUID, p_rate_percent NUMERIC, p_effective_from TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_rule_id UUID;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'SUPER_ADMIN' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;
  IF p_rate_percent < 0 OR p_rate_percent > 100 OR p_effective_from < NOW() - INTERVAL '1 day' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_RATE');
  END IF;
  IF p_category_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_categories WHERE id = p_category_id
  ) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'CATEGORY_NOT_FOUND'); END IF;

  UPDATE public.marketplace_commission_rules
  SET is_active = FALSE, effective_until = NOW()
  WHERE is_active = TRUE AND category_id IS NOT DISTINCT FROM p_category_id
    AND (effective_until IS NULL OR effective_until > NOW());
  INSERT INTO public.marketplace_commission_rules(category_id, rate_percent, effective_from, created_by)
  VALUES (p_category_id, p_rate_percent, p_effective_from, auth.uid())
  RETURNING id INTO v_rule_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'COMMISSION_RULE_CONFIGURED', v_rule_id::TEXT,
    jsonb_build_object('category_id', p_category_id, 'rate_percent', p_rate_percent, 'effective_from', p_effective_from));
  RETURN jsonb_build_object('success', TRUE, 'rule_id', v_rule_id);
END;
$$;

CREATE TABLE IF NOT EXISTS public.quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  listing_id UUID NOT NULL REFERENCES public.service_listings(id) ON DELETE RESTRICT,
  requirements TEXT NOT NULL CHECK (char_length(btrim(requirements)) BETWEEN 20 AND 4000),
  budget NUMERIC(10, 2) CHECK (budget IS NULL OR budget > 0),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'REQUESTED'
    CHECK (status IN ('REQUESTED', 'QUOTED', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'EXPIRED')),
  idempotency_key TEXT NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9_-]{8,120}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(customer_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.provider_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0 AND amount <= 1000000),
  currency TEXT NOT NULL DEFAULT 'JOD' CHECK (currency = 'JOD'),
  timeline_days INTEGER NOT NULL CHECK (timeline_days BETWEEN 1 AND 3650),
  message TEXT CHECK (char_length(message) <= 2000),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN', 'EXPIRED')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_quotes_one_pending_request
  ON public.provider_quotes(quote_request_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_quote_requests_customer_status
  ON public.quote_requests(customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_provider_status
  ON public.quote_requests(provider_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_quotes_customer_status
  ON public.provider_quotes(customer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_quotes_provider_status
  ON public.provider_quotes(provider_id, status, created_at DESC);

ALTER TABLE public.quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quote participants read scoped requests"
  ON public.quote_requests FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid() OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));
CREATE POLICY "Admins manage quote requests"
  ON public.quote_requests FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));
CREATE POLICY "Quote participants read scoped offers"
  ON public.provider_quotes FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid() OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));
CREATE POLICY "Admins manage provider quotes"
  ON public.provider_quotes FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

DROP TRIGGER IF EXISTS set_quote_requests_updated_at ON public.quote_requests;
CREATE TRIGGER set_quote_requests_updated_at BEFORE UPDATE ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS set_provider_quotes_updated_at ON public.provider_quotes;
CREATE TRIGGER set_provider_quotes_updated_at BEFORE UPDATE ON public.provider_quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES public.provider_quotes(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_quote_id
  ON public.bookings(quote_id) WHERE quote_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  gross_amount NUMERIC(10, 2) NOT NULL CHECK (gross_amount > 0),
  rate_percent NUMERIC(5, 2) NOT NULL CHECK (rate_percent BETWEEN 0 AND 100),
  commission_amount NUMERIC(10, 2) NOT NULL CHECK (commission_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'JOD' CHECK (currency = 'JOD'),
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'DUE', 'SETTLED', 'VOID', 'DISPUTED')),
  due_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_ledger_provider_status
  ON public.commission_ledger(provider_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_commission_ledger_admin_status
  ON public.commission_ledger(status, due_at, created_at DESC);
ALTER TABLE public.commission_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Providers read own commission obligations"
  ON public.commission_ledger FOR SELECT TO authenticated
  USING (provider_id = auth.uid() OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));
CREATE POLICY "Admins manage commission ledger"
  ON public.commission_ledger FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

DROP TRIGGER IF EXISTS set_commission_ledger_updated_at ON public.commission_ledger;
CREATE TRIGGER set_commission_ledger_updated_at BEFORE UPDATE ON public.commission_ledger
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.update_commission_obligation(p_commission_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_commission RECORD;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;
  IF p_status NOT IN ('SETTLED', 'DISPUTED', 'VOID') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS');
  END IF;
  SELECT id, booking_id, provider_id, status INTO v_commission
  FROM public.commission_ledger WHERE id = p_commission_id FOR UPDATE;
  IF v_commission IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'COMMISSION_NOT_FOUND'); END IF;
  IF (p_status = 'SETTLED' AND v_commission.status <> 'DUE')
    OR (p_status = 'DISPUTED' AND v_commission.status NOT IN ('PENDING', 'DUE'))
    OR (p_status = 'VOID' AND v_commission.status NOT IN ('PENDING', 'DISPUTED')) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_TRANSITION');
  END IF;
  UPDATE public.commission_ledger
  SET status = p_status, settled_at = CASE WHEN p_status = 'SETTLED' THEN NOW() ELSE settled_at END
  WHERE id = p_commission_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'COMMISSION_STATUS_CHANGED', p_commission_id::TEXT,
    jsonb_build_object('from_status', v_commission.status, 'to_status', p_status, 'booking_id', v_commission.booking_id));
  RETURN jsonb_build_object('success', TRUE, 'status', p_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_booking_commission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.listing_id IS NULL OR NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'COMPLETED' THEN
    UPDATE public.commission_ledger SET status = 'DUE', due_at = NOW()
    WHERE booking_id = NEW.id AND status = 'PENDING';
  ELSIF NEW.status = 'CANCELLED' AND OLD.status IN ('PENDING', 'CONFIRMED', 'ASSIGNED') THEN
    UPDATE public.commission_ledger SET status = 'VOID'
    WHERE booking_id = NEW.id AND status = 'PENDING';
  ELSIF NEW.dispute_status IN ('OPEN', 'UNDER_REVIEW') THEN
    UPDATE public.commission_ledger SET status = 'DISPUTED'
    WHERE booking_id = NEW.id AND status IN ('PENDING', 'DUE');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_booking_commission_status ON public.bookings;
CREATE TRIGGER sync_booking_commission_status
  AFTER UPDATE OF status, dispute_status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_booking_commission_status();

CREATE TABLE IF NOT EXISTS public.provider_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.service_listings(id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (char_length(btrim(content)) BETWEEN 3 AND 3000),
  post_type TEXT NOT NULL DEFAULT 'TEXT'
    CHECK (post_type IN ('TEXT', 'IMAGE', 'BEFORE_AFTER', 'PORTFOLIO', 'TIP', 'PROMOTION')),
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'DEACTIVATED', 'REJECTED')),
  moderation_notes TEXT CHECK (char_length(moderation_notes) <= 1000),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_posts_feed
  ON public.provider_posts(status, published_at DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_posts_provider
  ON public.provider_posts(provider_id, status, created_at DESC);
ALTER TABLE public.provider_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads published provider posts"
  ON public.provider_posts FOR SELECT
  USING (
    (status = 'PUBLISHED' AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.user_id = provider_id AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
    ))
    OR provider_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );
CREATE POLICY "Approved providers create own post drafts"
  ON public.provider_posts FOR INSERT TO authenticated
  WITH CHECK (
    provider_id = auth.uid() AND status = 'DRAFT'
    AND (listing_id IS NULL OR EXISTS (
      SELECT 1 FROM public.service_listings sl WHERE sl.id = listing_id AND sl.provider_id = auth.uid()
    ))
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.user_id = auth.uid() AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
    )
  );
CREATE POLICY "Approved providers update own nonpublished posts"
  ON public.provider_posts FOR UPDATE TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (
    provider_id = auth.uid() AND status IN ('DRAFT', 'PENDING_REVIEW', 'DEACTIVATED')
    AND (listing_id IS NULL OR EXISTS (
      SELECT 1 FROM public.service_listings sl WHERE sl.id = listing_id AND sl.provider_id = auth.uid()
    ))
  );
CREATE POLICY "Providers delete own draft posts"
  ON public.provider_posts FOR DELETE TO authenticated
  USING (provider_id = auth.uid() AND status IN ('DRAFT', 'REJECTED'));
CREATE POLICY "Admins manage provider posts"
  ON public.provider_posts FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

DROP TRIGGER IF EXISTS set_provider_posts_updated_at ON public.provider_posts;
CREATE TRIGGER set_provider_posts_updated_at BEFORE UPDATE ON public.provider_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.provider_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.service_listings(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.provider_posts(id) ON DELETE CASCADE,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('IMAGE', 'VIDEO')),
  storage_bucket TEXT NOT NULL DEFAULT 'marketplace-public' CHECK (storage_bucket IN ('marketplace-public', 'marketplace-private')),
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  width INTEGER CHECK (width IS NULL OR width BETWEEN 1 AND 12000),
  height INTEGER CHECK (height IS NULL OR height BETWEEN 1 AND 12000),
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 20),
  status TEXT NOT NULL DEFAULT 'PENDING_UPLOAD'
    CHECK (status IN ('PENDING_UPLOAD', 'ACTIVE', 'REJECTED', 'DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((listing_id IS NOT NULL)::INT + (post_id IS NOT NULL)::INT = 1),
  CHECK (
    (media_kind = 'IMAGE' AND mime_type IN ('image/jpeg', 'image/png', 'image/webp') AND size_bytes <= 5242880)
    OR (media_kind = 'VIDEO' AND mime_type = 'video/mp4' AND size_bytes <= 20971520 AND storage_bucket = 'marketplace-private')
  )
);

CREATE INDEX IF NOT EXISTS idx_provider_media_listing
  ON public.provider_media(listing_id, status, sort_order) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provider_media_post
  ON public.provider_media(post_id, status, sort_order) WHERE post_id IS NOT NULL;
ALTER TABLE public.provider_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public reads active public marketplace media"
  ON public.provider_media FOR SELECT
  USING (
    (status = 'ACTIVE' AND storage_bucket = 'marketplace-public' AND (
      (listing_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.service_listings sl WHERE sl.id = listing_id AND sl.status = 'PUBLISHED'
      )) OR
      (post_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.provider_posts pp WHERE pp.id = post_id AND pp.status = 'PUBLISHED'
      ))
    ))
    OR owner_id = auth.uid()
    OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
  );
CREATE POLICY "Approved providers register own media"
  ON public.provider_media FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid() AND status = 'PENDING_UPLOAD'
    AND storage_path LIKE auth.uid()::TEXT || '/%'
    AND (
      (listing_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.service_listings sl WHERE sl.id = listing_id AND sl.provider_id = auth.uid()
      )) OR
      (post_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.provider_posts pp WHERE pp.id = post_id AND pp.provider_id = auth.uid()
      ))
    )
  );
CREATE POLICY "Providers update own media metadata"
  ON public.provider_media FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid() AND storage_path LIKE auth.uid()::TEXT || '/%');
CREATE POLICY "Providers delete own pending media metadata"
  ON public.provider_media FOR DELETE TO authenticated
  USING (owner_id = auth.uid() AND status IN ('PENDING_UPLOAD', 'DELETED'));
CREATE POLICY "Admins manage marketplace media"
  ON public.provider_media FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('marketplace-public', 'marketplace-public', TRUE, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('marketplace-private', 'marketplace-private', FALSE, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Approved providers upload marketplace public media" ON storage.objects;
CREATE POLICY "Approved providers upload marketplace public media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'marketplace-public'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND EXISTS (
      SELECT 1 FROM public.provider_profiles pp
      WHERE pp.user_id = auth.uid() AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
    )
  );
DROP POLICY IF EXISTS "Providers delete own marketplace public media" ON storage.objects;
CREATE POLICY "Providers delete own marketplace public media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'marketplace-public' AND (storage.foldername(name))[1] = auth.uid()::TEXT);

CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.service_listings(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((listing_id IS NOT NULL)::INT + (provider_id IS NOT NULL)::INT = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique_listing
  ON public.marketplace_favorites(user_id, listing_id) WHERE listing_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_unique_provider
  ON public.marketplace_favorites(user_id, provider_id) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_favorites_user_created
  ON public.marketplace_favorites(user_id, created_at DESC);
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own marketplace favorites"
  ON public.marketplace_favorites FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.service_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_listing_created
  ON public.reviews(listing_id, created_at DESC) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reviews_provider_created
  ON public.reviews(provider_id, created_at DESC) WHERE provider_id IS NOT NULL;

DROP POLICY IF EXISTS "Customers create verified reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers update verified reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers create completed booking reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers update completed booking reviews" ON public.reviews;
CREATE POLICY "Customers create transaction verified reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid() AND booking_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id::TEXT = auth.uid()::TEXT AND b.status = 'COMPLETED'
        AND (
          (listing_id IS NOT NULL AND b.listing_id = listing_id AND b.provider_id = provider_id)
          OR (listing_id IS NULL AND service_id IS NOT NULL AND b.service_id::TEXT = service_id::TEXT)
        )
    )
  );
CREATE POLICY "Customers update transaction verified reviews"
  ON public.reviews FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (
    customer_id = auth.uid() AND booking_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.customer_id::TEXT = auth.uid()::TEXT AND b.status = 'COMPLETED'
        AND (
          (listing_id IS NOT NULL AND b.listing_id = listing_id AND b.provider_id = provider_id)
          OR (listing_id IS NULL AND service_id IS NOT NULL AND b.service_id::TEXT = service_id::TEXT)
        )
    )
  );

ALTER TABLE public.service_listings
  ADD COLUMN IF NOT EXISTS search_document TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(short_description, '') || ' ' || coalesce(description, ''))
  ) STORED;
ALTER TABLE public.provider_posts
  ADD COLUMN IF NOT EXISTS search_document TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_service_listings_search_document
  ON public.service_listings USING gin(search_document);
CREATE INDEX IF NOT EXISTS idx_provider_posts_search_document
  ON public.provider_posts USING gin(search_document);

CREATE OR REPLACE FUNCTION public.request_listing_quote(
  p_listing_id UUID, p_requirements TEXT, p_budget NUMERIC,
  p_target_date DATE, p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_listing RECORD;
  v_existing UUID;
  v_request_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  IF char_length(btrim(COALESCE(p_requirements, ''))) NOT BETWEEN 20 AND 4000
    OR (p_budget IS NOT NULL AND (p_budget <= 0 OR p_budget > 1000000))
    OR (p_target_date IS NOT NULL AND p_target_date < CURRENT_DATE)
    OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,120}$' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_REQUEST');
  END IF;

  SELECT sl.id, sl.provider_id, sl.title, sl.pricing_model INTO v_listing
  FROM public.service_listings sl
  JOIN public.provider_profiles pp ON pp.user_id = sl.provider_id
  WHERE sl.id = p_listing_id AND sl.status = 'PUBLISHED'
    AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE;
  IF v_listing IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'LISTING_NOT_AVAILABLE'); END IF;
  IF v_listing.provider_id = auth.uid() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'OWN_LISTING'); END IF;
  IF v_listing.pricing_model = 'FIXED' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'FIXED_LISTING'); END IF;

  SELECT id INTO v_existing FROM public.quote_requests
  WHERE customer_id = auth.uid() AND idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'quote_request_id', v_existing, 'duplicated', TRUE);
  END IF;

  INSERT INTO public.quote_requests(customer_id, provider_id, listing_id, requirements, budget, target_date, idempotency_key)
  VALUES (auth.uid(), v_listing.provider_id, p_listing_id, btrim(p_requirements), p_budget, p_target_date, p_idempotency_key)
  RETURNING id INTO v_request_id;
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (v_listing.provider_id, 'طلب عرض سعر جديد', 'وصل طلب جديد لعرض: ' || v_listing.title, 'INFO');
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'QUOTE_REQUEST_CREATED', v_request_id::TEXT,
    jsonb_build_object('listing_id', p_listing_id, 'provider_id', v_listing.provider_id));
  RETURN jsonb_build_object('success', TRUE, 'quote_request_id', v_request_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_quote_request(
  p_request_id UUID, p_amount NUMERIC, p_timeline_days INTEGER,
  p_message TEXT, p_expires_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request RECORD;
  v_quote_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  IF p_amount <= 0 OR p_amount > 1000000 OR p_timeline_days NOT BETWEEN 1 AND 3650
    OR char_length(COALESCE(p_message, '')) > 2000 OR p_expires_at <= NOW() OR p_expires_at > NOW() + INTERVAL '90 days' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_QUOTE');
  END IF;
  SELECT qr.id, qr.customer_id, qr.provider_id, qr.status, sl.title INTO v_request
  FROM public.quote_requests qr JOIN public.service_listings sl ON sl.id = qr.listing_id
  WHERE qr.id = p_request_id FOR UPDATE OF qr;
  IF v_request IS NULL OR v_request.provider_id <> auth.uid() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'REQUEST_NOT_FOUND'); END IF;
  IF v_request.status NOT IN ('REQUESTED', 'QUOTED') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = auth.uid()
    AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_APPROVED');
  END IF;

  UPDATE public.provider_quotes SET status = 'WITHDRAWN', updated_at = NOW()
  WHERE quote_request_id = p_request_id AND status = 'PENDING';
  INSERT INTO public.provider_quotes(quote_request_id, customer_id, provider_id, amount, timeline_days, message, expires_at)
  VALUES (p_request_id, v_request.customer_id, auth.uid(), p_amount, p_timeline_days, NULLIF(btrim(p_message), ''), p_expires_at)
  RETURNING id INTO v_quote_id;
  UPDATE public.quote_requests SET status = 'QUOTED' WHERE id = p_request_id;
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (v_request.customer_id, 'وصل عرض سعر جديد', 'راجع عرض السعر الجديد لخدمة ' || v_request.title, 'INFO');
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'QUOTE_RESPONDED', v_quote_id::TEXT,
    jsonb_build_object('quote_request_id', p_request_id, 'amount', p_amount, 'currency', 'JOD'));
  RETURN jsonb_build_object('success', TRUE, 'quote_id', v_quote_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_listing_booking(
  p_listing_id UUID, p_booking_date DATE, p_start_time TIME, p_end_time TIME,
  p_idempotency_key TEXT, p_phone TEXT, p_address TEXT, p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_listing RECORD;
  v_existing RECORD;
  v_booking_id UUID;
  v_rate NUMERIC;
  v_commission NUMERIC(10, 2);
  v_area TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  IF p_booking_date < CURRENT_DATE OR p_end_time <= p_start_time
    OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,120}$'
    OR char_length(btrim(COALESCE(p_phone, ''))) NOT BETWEEN 8 AND 20
    OR char_length(btrim(COALESCE(p_address, ''))) NOT BETWEEN 5 AND 500
    OR char_length(COALESCE(p_notes, '')) > 1000 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_BOOKING_DATA');
  END IF;
  SELECT sl.*, sc.is_active AS category_active INTO v_listing
  FROM public.service_listings sl
  JOIN public.service_categories sc ON sc.id = sl.category_id
  JOIN public.provider_profiles pp ON pp.user_id = sl.provider_id
  WHERE sl.id = p_listing_id AND sl.status = 'PUBLISHED' AND sl.pricing_model = 'FIXED'
    AND sc.is_active = TRUE AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE;
  IF v_listing IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'LISTING_NOT_BOOKABLE'); END IF;
  IF v_listing.provider_id = auth.uid() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'OWN_LISTING'); END IF;

  SELECT id, customer_id INTO v_existing FROM public.bookings WHERE idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    IF v_existing.customer_id::TEXT <> auth.uid()::TEXT THEN RETURN jsonb_build_object('success', FALSE, 'error', 'IDEMPOTENCY_CONFLICT'); END IF;
    RETURN jsonb_build_object('success', TRUE, 'booking_id', v_existing.id, 'duplicated', TRUE);
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookings b WHERE b.provider_id = v_listing.provider_id
    AND b.booking_date = p_booking_date AND b.status IN ('ASSIGNED', 'IN_PROGRESS')
    AND (b.start_time, b.end_time) OVERLAPS (p_start_time, p_end_time)) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'SLOT_OCCUPIED');
  END IF;

  v_rate := public.resolve_marketplace_commission_rate(v_listing.category_id);
  IF v_rate IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'COMMISSION_NOT_CONFIGURED'); END IF;
  v_commission := round(v_listing.base_price * v_rate / 100, 2);
  v_area := CASE WHEN v_listing.delivery_type = 'REMOTE' THEN 'خدمة عن بُعد' ELSE btrim(p_address) END;

  INSERT INTO public.bookings(
    customer_id, provider_id, listing_id, service_title, booking_date, booking_time,
    start_time, end_time, area, phone, address, notes, status, payment_status,
    idempotency_key, workflow_type, delivery_type_snapshot, pricing_model_snapshot,
    agreed_amount, currency, commission_rate_snapshot, commission_amount_snapshot, updated_at
  ) VALUES (
    auth.uid(), v_listing.provider_id, v_listing.id, v_listing.title, p_booking_date, p_start_time::TEXT,
    p_start_time, p_end_time, v_area, btrim(p_phone), v_area, NULLIF(btrim(p_notes), ''), 'ASSIGNED', 'UNPAID',
    p_idempotency_key, 'DIRECT_LISTING', v_listing.delivery_type, v_listing.pricing_model,
    v_listing.base_price, 'JOD', v_rate, v_commission, NOW()
  ) RETURNING id INTO v_booking_id;
  INSERT INTO public.commission_ledger(booking_id, provider_id, customer_id, category_id, gross_amount, rate_percent, commission_amount)
  VALUES (v_booking_id, v_listing.provider_id, auth.uid(), v_listing.category_id, v_listing.base_price, v_rate, v_commission);
  INSERT INTO public.notifications(user_id, title, message, type) VALUES
    (auth.uid(), 'تم إنشاء الحجز', 'تم حجز ' || v_listing.title || ' وإسناده لمقدم الخدمة.', 'BOOKING'),
    (v_listing.provider_id, 'حجز جديد مؤكد', 'لديك حجز جديد لخدمة ' || v_listing.title || '.', 'BOOKING');
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'LISTING_BOOKING_CREATED', v_booking_id::TEXT,
    jsonb_build_object('listing_id', v_listing.id, 'provider_id', v_listing.provider_id, 'amount', v_listing.base_price,
      'commission_rate_snapshot', v_rate, 'commission_amount_snapshot', v_commission));
  RETURN jsonb_build_object('success', TRUE, 'booking_id', v_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_provider_quote(
  p_quote_id UUID, p_booking_date DATE, p_start_time TIME, p_end_time TIME,
  p_idempotency_key TEXT, p_phone TEXT, p_address TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quote RECORD;
  v_existing RECORD;
  v_booking_id UUID;
  v_rate NUMERIC;
  v_commission NUMERIC(10, 2);
  v_area TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  IF p_booking_date < CURRENT_DATE OR p_end_time <= p_start_time OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,120}$'
    OR char_length(btrim(COALESCE(p_phone, ''))) NOT BETWEEN 8 AND 20
    OR char_length(btrim(COALESCE(p_address, ''))) NOT BETWEEN 5 AND 500 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_BOOKING_DATA');
  END IF;
  SELECT pq.id, pq.quote_request_id, pq.customer_id, pq.provider_id, pq.amount, pq.status, pq.expires_at,
    qr.listing_id, qr.requirements, sl.title, sl.category_id, sl.delivery_type, sl.pricing_model
  INTO v_quote
  FROM public.provider_quotes pq
  JOIN public.quote_requests qr ON qr.id = pq.quote_request_id
  JOIN public.service_listings sl ON sl.id = qr.listing_id
  WHERE pq.id = p_quote_id FOR UPDATE OF pq, qr;
  IF v_quote IS NULL OR v_quote.customer_id <> auth.uid() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'QUOTE_NOT_FOUND'); END IF;
  IF v_quote.status <> 'PENDING' OR v_quote.expires_at <= NOW() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'QUOTE_NOT_ACCEPTABLE'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = v_quote.provider_id
    AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_APPROVED');
  END IF;
  SELECT id, customer_id INTO v_existing FROM public.bookings WHERE idempotency_key = p_idempotency_key;
  IF v_existing IS NOT NULL THEN
    IF v_existing.customer_id::TEXT <> auth.uid()::TEXT THEN RETURN jsonb_build_object('success', FALSE, 'error', 'IDEMPOTENCY_CONFLICT'); END IF;
    RETURN jsonb_build_object('success', TRUE, 'booking_id', v_existing.id, 'duplicated', TRUE);
  END IF;

  v_rate := public.resolve_marketplace_commission_rate(v_quote.category_id);
  IF v_rate IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'COMMISSION_NOT_CONFIGURED'); END IF;
  v_commission := round(v_quote.amount * v_rate / 100, 2);
  v_area := CASE WHEN v_quote.delivery_type = 'REMOTE' THEN 'خدمة عن بُعد' ELSE btrim(p_address) END;
  INSERT INTO public.bookings(
    customer_id, provider_id, listing_id, quote_id, service_title, booking_date, booking_time,
    start_time, end_time, area, phone, address, notes, status, payment_status,
    idempotency_key, workflow_type, delivery_type_snapshot, pricing_model_snapshot,
    agreed_amount, currency, commission_rate_snapshot, commission_amount_snapshot, updated_at
  ) VALUES (
    auth.uid(), v_quote.provider_id, v_quote.listing_id, v_quote.id, v_quote.title, p_booking_date, p_start_time::TEXT,
    p_start_time, p_end_time, v_area, btrim(p_phone), v_area, v_quote.requirements, 'ASSIGNED', 'UNPAID',
    p_idempotency_key, 'QUOTE_PROJECT', v_quote.delivery_type, v_quote.pricing_model,
    v_quote.amount, 'JOD', v_rate, v_commission, NOW()
  ) RETURNING id INTO v_booking_id;
  UPDATE public.provider_quotes SET status = 'ACCEPTED' WHERE id = v_quote.id;
  UPDATE public.provider_quotes SET status = 'REJECTED'
    WHERE quote_request_id = v_quote.quote_request_id AND id <> v_quote.id AND status = 'PENDING';
  UPDATE public.quote_requests SET status = 'ACCEPTED' WHERE id = v_quote.quote_request_id;
  INSERT INTO public.commission_ledger(booking_id, provider_id, customer_id, category_id, gross_amount, rate_percent, commission_amount)
  VALUES (v_booking_id, v_quote.provider_id, auth.uid(), v_quote.category_id, v_quote.amount, v_rate, v_commission);
  INSERT INTO public.notifications(user_id, title, message, type) VALUES
    (auth.uid(), 'تم قبول عرض السعر', 'تم إنشاء طلبك وإسناده لمقدم الخدمة.', 'BOOKING'),
    (v_quote.provider_id, 'تم قبول عرض السعر', 'قبل العميل عرض السعر وأصبح الطلب جاهزاً للتنفيذ.', 'BOOKING');
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'QUOTE_ACCEPTED', v_booking_id::TEXT,
    jsonb_build_object('quote_id', v_quote.id, 'listing_id', v_quote.listing_id, 'amount', v_quote.amount,
      'commission_rate_snapshot', v_rate, 'commission_amount_snapshot', v_commission));
  RETURN jsonb_build_object('success', TRUE, 'booking_id', v_booking_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_provider_quote(p_quote_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_quote RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  SELECT id, quote_request_id, customer_id, provider_id, status INTO v_quote
  FROM public.provider_quotes WHERE id = p_quote_id FOR UPDATE;
  IF v_quote IS NULL OR v_quote.customer_id <> auth.uid() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'QUOTE_NOT_FOUND'); END IF;
  IF v_quote.status <> 'PENDING' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
  UPDATE public.provider_quotes SET status = 'REJECTED' WHERE id = p_quote_id;
  UPDATE public.quote_requests SET status = 'REJECTED' WHERE id = v_quote.quote_request_id;
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (v_quote.provider_id, 'لم يتم قبول عرض السعر', 'اختار العميل عدم متابعة عرض السعر الحالي.', 'INFO');
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'QUOTE_REJECTED', p_quote_id::TEXT, jsonb_build_object('quote_request_id', v_quote.quote_request_id));
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_provider_post_publication(p_post_id UUID, p_publish BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_post RECORD; v_next_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  SELECT id, provider_id, status, listing_id INTO v_post FROM public.provider_posts WHERE id = p_post_id FOR UPDATE;
  IF v_post IS NULL OR v_post.provider_id <> auth.uid() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'POST_NOT_FOUND'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = auth.uid()
    AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_APPROVED'); END IF;
  IF v_post.listing_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.service_listings sl
    WHERE sl.id = v_post.listing_id AND sl.provider_id = auth.uid() AND sl.status = 'PUBLISHED') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'LISTING_NOT_PUBLISHED'); END IF;
  IF p_publish THEN
    IF v_post.status NOT IN ('DRAFT', 'DEACTIVATED', 'REJECTED') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
    v_next_status := CASE WHEN v_post.status = 'REJECTED' THEN 'PENDING_REVIEW' ELSE 'PUBLISHED' END;
  ELSE
    IF v_post.status NOT IN ('PUBLISHED', 'PENDING_REVIEW') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
    v_next_status := 'DEACTIVATED';
  END IF;
  UPDATE public.provider_posts SET status = v_next_status,
    published_at = CASE WHEN v_next_status = 'PUBLISHED' THEN COALESCE(published_at, NOW()) ELSE published_at END
  WHERE id = p_post_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'PROVIDER_POST_STATUS_CHANGED', p_post_id::TEXT, jsonb_build_object('status', v_next_status));
  RETURN jsonb_build_object('success', TRUE, 'status', v_next_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_provider_public_profile(
  p_headline TEXT, p_skills TEXT[], p_remote_available BOOLEAN, p_public_slug TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_slug TEXT := NULLIF(lower(btrim(p_public_slug)), '');
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = auth.uid()
      AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
  ) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_APPROVED'); END IF;
  IF char_length(btrim(COALESCE(p_headline, ''))) > 160
    OR COALESCE(array_length(p_skills, 1), 0) > 20
    OR EXISTS (SELECT 1 FROM unnest(COALESCE(p_skills, '{}'::TEXT[])) skill
      WHERE char_length(btrim(skill)) NOT BETWEEN 2 AND 60)
    OR (v_slug IS NOT NULL AND v_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_PROFILE');
  END IF;
  UPDATE public.provider_profiles SET
    headline = NULLIF(btrim(p_headline), ''),
    skills = ARRAY(SELECT DISTINCT btrim(skill) FROM unnest(COALESCE(p_skills, '{}'::TEXT[])) skill WHERE btrim(skill) <> ''),
    remote_available = COALESCE(p_remote_available, FALSE),
    public_slug = v_slug
  WHERE user_id = auth.uid();
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'PROVIDER_PUBLIC_PROFILE_UPDATED', auth.uid()::TEXT,
    jsonb_build_object('remote_available', p_remote_available, 'skills_count', COALESCE(array_length(p_skills, 1), 0)));
  RETURN jsonb_build_object('success', TRUE);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('success', FALSE, 'error', 'SLUG_TAKEN');
END;
$$;

CREATE OR REPLACE FUNCTION public.moderate_provider_post(p_post_id UUID, p_decision TEXT, p_notes TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_post RECORD; v_next_status TEXT;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN'); END IF;
  IF p_decision NOT IN ('APPROVE', 'REJECT', 'DEACTIVATE') OR char_length(COALESCE(p_notes, '')) > 1000 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_DECISION'); END IF;
  SELECT id, provider_id INTO v_post FROM public.provider_posts WHERE id = p_post_id FOR UPDATE;
  IF v_post IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'POST_NOT_FOUND'); END IF;
  v_next_status := CASE p_decision WHEN 'APPROVE' THEN 'PUBLISHED' WHEN 'REJECT' THEN 'REJECTED' ELSE 'DEACTIVATED' END;
  UPDATE public.provider_posts SET status = v_next_status, moderation_notes = NULLIF(btrim(p_notes), ''),
    published_at = CASE WHEN v_next_status = 'PUBLISHED' THEN COALESCE(published_at, NOW()) ELSE published_at END
  WHERE id = p_post_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'PROVIDER_POST_MODERATED', p_post_id::TEXT,
    jsonb_build_object('decision', p_decision, 'notes', p_notes));
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (v_post.provider_id, 'تحديث حالة منشورك', 'راجعت الإدارة المنشور وأصبحت حالته: ' || v_next_status,
    CASE WHEN v_next_status = 'PUBLISHED' THEN 'SUCCESS' ELSE 'WARNING' END);
  RETURN jsonb_build_object('success', TRUE, 'status', v_next_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.search_marketplace(
  p_query TEXT DEFAULT '', p_scope TEXT DEFAULT 'ALL', p_category_id UUID DEFAULT NULL,
  p_delivery_type TEXT DEFAULT NULL, p_pricing_model TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 24, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  result_type TEXT, result_id UUID, title TEXT, summary TEXT, href TEXT,
  image_path TEXT, metadata JSONB, relevance REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_query TEXT := btrim(COALESCE(p_query, ''));
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 24), 1), 50);
  v_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
BEGIN
  IF p_scope NOT IN ('ALL', 'LISTINGS', 'PROVIDERS', 'POSTS')
    OR (p_delivery_type IS NOT NULL AND p_delivery_type NOT IN ('ON_SITE', 'REMOTE', 'HYBRID', 'SESSION', 'PROJECT'))
    OR (p_pricing_model IS NOT NULL AND p_pricing_model NOT IN ('FIXED', 'STARTING_FROM', 'HOURLY', 'PER_SESSION', 'QUOTE_REQUIRED')) THEN
    RETURN;
  END IF;
  RETURN QUERY
  WITH candidates AS (
    SELECT 'LISTING'::TEXT AS kind, sl.id AS id, sl.title AS title,
      sl.short_description AS summary, '/listings/' || sl.slug AS href,
      (SELECT pm.storage_path FROM public.provider_media pm WHERE pm.listing_id = sl.id
        AND pm.status = 'ACTIVE' AND pm.storage_bucket = 'marketplace-public' ORDER BY pm.sort_order, pm.created_at LIMIT 1) AS image_path,
      jsonb_build_object(
        'provider_id', sl.provider_id, 'provider_name', u.full_name, 'category_id', sl.category_id,
        'category_name', sc.name_ar, 'delivery_type', sl.delivery_type,
        'pricing_model', sl.pricing_model, 'base_price', sl.base_price, 'currency', sl.currency,
        'remote_available', sl.remote_available, 'service_areas', sl.service_areas
      ) AS metadata,
      CASE WHEN v_query = '' THEN 0.2 ELSE
        (ts_rank_cd(sl.search_document, websearch_to_tsquery('simple', v_query))
          + extensions.similarity(sl.title, v_query))::REAL END AS score,
      sl.published_at AS sort_date
    FROM public.service_listings sl
    JOIN public.provider_profiles pp ON pp.user_id = sl.provider_id
    JOIN public.users u ON u.id = sl.provider_id
    JOIN public.service_categories sc ON sc.id = sl.category_id
    WHERE sl.status = 'PUBLISHED' AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
      AND sc.is_active = TRUE AND p_scope IN ('ALL', 'LISTINGS')
      AND (p_category_id IS NULL OR sc.id = p_category_id OR sc.parent_id = p_category_id)
      AND (p_delivery_type IS NULL OR sl.delivery_type = p_delivery_type)
      AND (p_pricing_model IS NULL OR sl.pricing_model = p_pricing_model)
      AND (v_query = '' OR sl.search_document @@ websearch_to_tsquery('simple', v_query)
        OR extensions.similarity(sl.title, v_query) > 0.15 OR u.full_name ILIKE '%' || v_query || '%' OR sc.name_ar ILIKE '%' || v_query || '%')
    UNION ALL
    SELECT 'PROVIDER', pp.user_id, COALESCE(u.full_name, 'مقدم خدمة'),
      COALESCE(pp.headline, pp.bio, ''), '/providers/' || pp.user_id::TEXT, pp.avatar_path,
      jsonb_build_object('verified', pp.is_verified, 'skills', pp.skills, 'service_areas', pp.service_areas,
        'remote_available', pp.remote_available),
      CASE WHEN v_query = '' THEN 0.1 ELSE
        (extensions.similarity(COALESCE(u.full_name, ''), v_query)
          + extensions.similarity(COALESCE(pp.headline, ''), v_query))::REAL END,
      pp.updated_at
    FROM public.provider_profiles pp JOIN public.users u ON u.id = pp.user_id
    WHERE pp.application_status = 'APPROVED' AND pp.is_verified = TRUE AND p_scope IN ('ALL', 'PROVIDERS')
      AND p_category_id IS NULL AND p_delivery_type IS NULL AND p_pricing_model IS NULL
      AND (v_query = '' OR u.full_name ILIKE '%' || v_query || '%' OR pp.headline ILIKE '%' || v_query || '%'
        OR pp.bio ILIKE '%' || v_query || '%' OR array_to_string(pp.skills, ' ') ILIKE '%' || v_query || '%')
    UNION ALL
    SELECT 'POST', post.id, COALESCE(u.full_name, 'منشور مقدم خدمة'), post.content,
      '/providers/' || post.provider_id::TEXT || '#post-' || post.id::TEXT,
      (SELECT pm.storage_path FROM public.provider_media pm WHERE pm.post_id = post.id
        AND pm.status = 'ACTIVE' AND pm.storage_bucket = 'marketplace-public' ORDER BY pm.sort_order, pm.created_at LIMIT 1),
      jsonb_build_object('provider_id', post.provider_id, 'provider_name', u.full_name,
        'listing_id', post.listing_id, 'post_type', post.post_type),
      CASE WHEN v_query = '' THEN 0.05 ELSE ts_rank_cd(post.search_document, websearch_to_tsquery('simple', v_query))::REAL END,
      post.published_at
    FROM public.provider_posts post
    JOIN public.provider_profiles pp ON pp.user_id = post.provider_id
    JOIN public.users u ON u.id = post.provider_id
    LEFT JOIN public.service_listings sl ON sl.id = post.listing_id
    LEFT JOIN public.service_categories sc ON sc.id = sl.category_id
    WHERE post.status = 'PUBLISHED' AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE
      AND p_scope IN ('ALL', 'POSTS') AND p_delivery_type IS NULL AND p_pricing_model IS NULL
      AND (p_category_id IS NULL OR sc.id = p_category_id OR sc.parent_id = p_category_id)
      AND (v_query = '' OR post.search_document @@ websearch_to_tsquery('simple', v_query)
        OR u.full_name ILIKE '%' || v_query || '%')
  )
  SELECT c.kind, c.id, c.title, c.summary, c.href, c.image_path, c.metadata, c.score
  FROM candidates c
  ORDER BY c.score DESC, c.sort_date DESC NULLS LAST
  LIMIT v_limit OFFSET v_offset;
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
    'completed_bookings', (SELECT count(*) FROM public.bookings b WHERE b.provider_id = pp.user_id AND b.status = 'COMPLETED'),
    'average_rating', (SELECT round(avg(r.rating)::NUMERIC, 1) FROM public.reviews r WHERE r.provider_id = pp.user_id),
    'review_count', (SELECT count(*) FROM public.reviews r WHERE r.provider_id = pp.user_id),
    'listings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', sl.id, 'slug', sl.slug, 'title', sl.title, 'short_description', sl.short_description,
        'delivery_type', sl.delivery_type, 'pricing_model', sl.pricing_model,
        'base_price', sl.base_price, 'currency', sl.currency, 'category_name', sc.name_ar
      ) ORDER BY sl.published_at DESC)
      FROM public.service_listings sl JOIN public.service_categories sc ON sc.id = sl.category_id
      WHERE sl.provider_id = pp.user_id AND sl.status = 'PUBLISHED'
    ), '[]'::JSONB),
    'posts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', post.id, 'content', post.content, 'post_type', post.post_type,
        'listing_id', post.listing_id, 'published_at', post.published_at
      ) ORDER BY post.published_at DESC)
      FROM (SELECT * FROM public.provider_posts WHERE provider_id = pp.user_id AND status = 'PUBLISHED'
        ORDER BY published_at DESC LIMIT 20) post
    ), '[]'::JSONB)
  )
  FROM public.provider_profiles pp JOIN public.users u ON u.id = pp.user_id
  WHERE pp.user_id = p_provider_id AND pp.application_status = 'APPROVED' AND pp.is_verified = TRUE;
$$;

REVOKE ALL ON FUNCTION public.resolve_marketplace_commission_rate(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.configure_marketplace_commission(UUID, NUMERIC, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_commission_obligation(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.request_listing_quote(UUID, TEXT, NUMERIC, DATE, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_quote_request(UUID, NUMERIC, INTEGER, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_listing_booking(UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_provider_quote(UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_provider_quote(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_provider_post_publication(UUID, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_provider_public_profile(TEXT, TEXT[], BOOLEAN, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.moderate_provider_post(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_marketplace_commission_rate(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.configure_marketplace_commission(UUID, NUMERIC, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_commission_obligation(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_listing_quote(UUID, TEXT, NUMERIC, DATE, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.respond_to_quote_request(UUID, NUMERIC, INTEGER, TEXT, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_listing_booking(UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_provider_quote(UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_provider_quote(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_provider_post_publication(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_provider_public_profile(TEXT, TEXT[], BOOLEAN, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.moderate_provider_post(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_marketplace(TEXT, TEXT, UUID, TEXT, TEXT, INTEGER, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_provider_profile(UUID) TO anon, authenticated, service_role;
