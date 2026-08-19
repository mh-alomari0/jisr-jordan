-- Secure marketplace messaging and anti-circumvention controls.
-- Additive migration: existing accounts, bookings, quotes, media, and commission
-- snapshots remain intact. Conversation content is never exposed to admins by RLS.

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT CHECK (action_url IS NULL OR (action_url LIKE '/%' AND action_url NOT LIKE '//%'));

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS messages_in_app BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS messages_push BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'BOOKING', 'PAYMENT', 'MESSAGE', 'REVIEW', 'SECURITY', 'PROVIDER'));

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
    WHEN NEW.type = 'MESSAGE' THEN COALESCE(v_preferences.messages_in_app, TRUE)
    WHEN NEW.type = 'PAYMENT' THEN COALESCE(v_preferences.commissions_in_app, TRUE)
    WHEN NEW.type IN ('SUCCESS', 'WARNING', 'PROVIDER') THEN COALESCE(v_preferences.provider_updates_in_app, TRUE)
    ELSE COALESCE(v_preferences.system_in_app, TRUE)
  END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_notification_for_push()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_enabled BOOLEAN;
BEGIN
  SELECT CASE
    WHEN NEW.type = 'BOOKING' THEN COALESCE(p.bookings_push, TRUE)
    WHEN NEW.type = 'MESSAGE' THEN COALESCE(p.messages_push, TRUE)
    WHEN NEW.type = 'PAYMENT' THEN COALESCE(p.commissions_push, TRUE)
    WHEN NEW.type IN ('SUCCESS', 'WARNING', 'PROVIDER') THEN COALESCE(p.provider_updates_push, TRUE)
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

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  listing_id UUID REFERENCES public.service_listings(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  quote_request_id UUID REFERENCES public.quote_requests(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'BLOCKED')),
  customer_read_at TIMESTAMPTZ,
  provider_read_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (customer_id <> provider_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_active_context
  ON public.conversations(customer_id, provider_id, COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::UUID))
  WHERE status = 'ACTIVE' AND booking_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_booking
  ON public.conversations(booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_customer_inbox
  ON public.conversations(customer_id, last_message_at DESC NULLS LAST, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_inbox
  ON public.conversations(provider_id, last_message_at DESC NULLS LAST, created_at DESC);

CREATE TABLE IF NOT EXISTS public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  message_type TEXT NOT NULL CHECK (message_type IN ('TEXT', 'IMAGE', 'VIDEO', 'SYSTEM', 'QUOTE', 'BOOKING_REFERENCE')),
  body TEXT CHECK (body IS NULL OR char_length(body) <= 4000),
  media_bucket TEXT CHECK (media_bucket IS NULL OR media_bucket = 'message-private'),
  media_path TEXT CHECK (media_path IS NULL OR char_length(media_path) BETWEEN 10 AND 500),
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm')),
  media_metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(media_metadata) = 'object'),
  moderation_status TEXT NOT NULL DEFAULT 'SAFE' CHECK (moderation_status IN ('SAFE', 'ALLOWED_AFTER_BOOKING', 'REPORTED', 'REMOVED')),
  edited_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (message_type = 'TEXT' AND body IS NOT NULL AND char_length(btrim(body)) BETWEEN 1 AND 4000 AND media_path IS NULL)
    OR (message_type IN ('IMAGE', 'VIDEO') AND media_path IS NOT NULL)
    OR (message_type IN ('SYSTEM', 'QUOTE', 'BOOKING_REFERENCE') AND body IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_page
  ON public.conversation_messages(conversation_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.marketplace_contact_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  surface TEXT NOT NULL CHECK (surface IN ('MESSAGE', 'LISTING', 'PROFILE', 'POST')),
  target_id TEXT,
  signals TEXT[] NOT NULL DEFAULT '{}',
  outcome TEXT NOT NULL CHECK (outcome IN ('BLOCKED', 'WARNED', 'ALLOWED_AFTER_BOOKING')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_marketplace_contact_events_actor
  ON public.marketplace_contact_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_contact_events_review
  ON public.marketplace_contact_events(outcome, created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketplace_content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  target_type TEXT NOT NULL CHECK (target_type IN ('MESSAGE', 'LISTING', 'POST', 'PROFILE', 'MEDIA')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('CONTACT_SHARING', 'EXTERNAL_PAYMENT', 'SPAM', 'HARASSMENT', 'UNSAFE_CONTENT', 'OTHER')),
  details TEXT CHECK (details IS NULL OR char_length(details) <= 1000),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED')),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reporter_id, target_type, target_id, reason)
);
CREATE INDEX IF NOT EXISTS idx_marketplace_content_reports_queue
  ON public.marketplace_content_reports(status, created_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_contact_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_content_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read own conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR provider_id = auth.uid());

CREATE POLICY "Participants read own messages"
  ON public.conversation_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.customer_id = auth.uid() OR c.provider_id = auth.uid())
  ));

-- Message writes intentionally go through SECURITY DEFINER RPCs. There is no
-- direct INSERT/UPDATE/DELETE policy and no implicit admin conversation policy.
CREATE POLICY "Users read own contact events"
  ON public.marketplace_contact_events FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

CREATE POLICY "Users create own content reports"
  ON public.marketplace_content_reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "Users read own content reports"
  ON public.marketplace_content_reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid());
CREATE POLICY "Admins manage content reports"
  ON public.marketplace_content_reports FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

DROP TRIGGER IF EXISTS set_conversations_updated_at ON public.conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.detect_marketplace_contact_signals(p_text TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_text TEXT := lower(translate(COALESCE(p_text, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'));
  v_compact TEXT;
  v_signals TEXT[] := '{}';
BEGIN
  v_compact := regexp_replace(v_text, '[[:space:].()_-]+', '', 'g');
  IF v_text ~ '[[:alnum:]._%+-]+[[:space:]]*@[[:space:]]*[[:alnum:].-]+\.[[:alpha:]]{2,}' THEN
    v_signals := array_append(v_signals, 'EMAIL');
  END IF;
  IF v_compact ~ '(\+?962|0)?7(7|8|9)[0-9]{7}' THEN
    v_signals := array_append(v_signals, 'PHONE');
  END IF;
  IF v_text ~ '(https?://|www\.)' THEN
    v_signals := array_append(v_signals, 'EXTERNAL_URL');
  END IF;
  IF v_text ~ '(واتس|واتساب|whatsapp|تلغرام|تيليغرام|telegram|سناب|snapchat|انستغرام|instagram|فيسبوك|facebook)[[:space:][:punct:]]*[@[:alnum:]_+.-]{3,}' THEN
    v_signals := array_append(v_signals, 'SOCIAL_CONTACT');
  END IF;
  IF v_text ~ '(كليك|cliq|paypal|باي[[:space:]]*بال|تحويل[[:space:]]+(خارجي|مباشر|بنكي)|رقم[[:space:]]+الحساب|iban)' THEN
    v_signals := array_append(v_signals, 'EXTERNAL_PAYMENT');
  END IF;
  RETURN v_signals;
END;
$$;

CREATE OR REPLACE FUNCTION public.conversation_contact_allowed(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    JOIN public.bookings b ON b.id = c.booking_id
    JOIN public.commission_ledger cl ON cl.booking_id = b.id
    WHERE c.id = p_conversation_id
      AND b.status IN ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED')
      AND b.agreed_amount IS NOT NULL
      AND b.commission_rate_snapshot IS NOT NULL
      AND b.commission_amount_snapshot IS NOT NULL
      AND cl.status IN ('PENDING', 'DUE', 'SETTLED', 'DISPUTED')
  );
$$;

CREATE OR REPLACE FUNCTION public.create_marketplace_conversation(
  p_provider_id UUID,
  p_listing_id UUID DEFAULT NULL,
  p_booking_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID := auth.uid();
  v_conversation_id UUID;
  v_booking RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  IF p_provider_id = auth.uid() THEN RETURN jsonb_build_object('success', FALSE, 'error', 'OWN_PROFILE'); END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.provider_profiles pp JOIN public.users u ON u.id = pp.user_id
    WHERE pp.user_id = p_provider_id AND pp.application_status = 'APPROVED'
      AND pp.is_verified = TRUE AND u.role = 'STAFF'
  ) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_AVAILABLE'); END IF;

  IF p_listing_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.service_listings sl
    WHERE sl.id = p_listing_id AND sl.provider_id = p_provider_id AND sl.status = 'PUBLISHED'
  ) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'LISTING_NOT_AVAILABLE'); END IF;

  IF p_booking_id IS NOT NULL THEN
    SELECT id, customer_id, provider_id, listing_id INTO v_booking
    FROM public.bookings WHERE id = p_booking_id;
    IF v_booking IS NULL OR v_booking.customer_id <> auth.uid() OR v_booking.provider_id <> p_provider_id THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_AVAILABLE');
    END IF;
    v_customer_id := v_booking.customer_id;
    p_listing_id := COALESCE(p_listing_id, v_booking.listing_id);
  END IF;

  SELECT id INTO v_conversation_id FROM public.conversations
  WHERE customer_id = v_customer_id AND provider_id = p_provider_id
    AND COALESCE(listing_id, '00000000-0000-0000-0000-000000000000'::UUID)
      = COALESCE(p_listing_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND status = 'ACTIVE'
  ORDER BY (booking_id IS NOT NULL) DESC, created_at DESC LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations(customer_id, provider_id, listing_id, booking_id, customer_read_at)
    VALUES (v_customer_id, p_provider_id, p_listing_id, p_booking_id, NOW())
    RETURNING id INTO v_conversation_id;
    INSERT INTO public.audit_logs(actor_id, action, target, metadata)
    VALUES (auth.uid(), 'CONVERSATION_CREATED', v_conversation_id::TEXT,
      jsonb_build_object('provider_id', p_provider_id, 'listing_id', p_listing_id, 'booking_id', p_booking_id));
  ELSIF p_booking_id IS NOT NULL THEN
    UPDATE public.conversations SET booking_id = COALESCE(booking_id, p_booking_id) WHERE id = v_conversation_id;
  END IF;
  RETURN jsonb_build_object('success', TRUE, 'conversation_id', v_conversation_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.send_conversation_message(
  p_conversation_id UUID,
  p_message_type TEXT,
  p_body TEXT DEFAULT NULL,
  p_media_path TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL,
  p_media_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_conversation RECORD;
  v_message_id UUID;
  v_recipient UUID;
  v_signals TEXT[];
  v_contact_allowed BOOLEAN;
  v_object RECORD;
  v_size BIGINT;
  v_expected_prefix TEXT;
  v_moderation TEXT := 'SAFE';
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  SELECT * INTO v_conversation FROM public.conversations WHERE id = p_conversation_id FOR UPDATE;
  IF v_conversation IS NULL OR auth.uid() NOT IN (v_conversation.customer_id, v_conversation.provider_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'CONVERSATION_NOT_FOUND');
  END IF;
  IF v_conversation.status <> 'ACTIVE' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'CONVERSATION_CLOSED'); END IF;
  IF p_message_type NOT IN ('TEXT', 'IMAGE', 'VIDEO') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_MESSAGE_TYPE'); END IF;
  IF char_length(COALESCE(p_body, '')) > 4000 OR (p_message_type = 'TEXT' AND char_length(btrim(COALESCE(p_body, ''))) < 1) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_MESSAGE');
  END IF;

  v_signals := public.detect_marketplace_contact_signals(p_body);
  v_contact_allowed := public.conversation_contact_allowed(p_conversation_id);
  IF cardinality(v_signals) > 0 AND NOT v_contact_allowed THEN
    INSERT INTO public.marketplace_contact_events(actor_id, conversation_id, surface, target_id, signals, outcome)
    VALUES (auth.uid(), p_conversation_id, 'MESSAGE', p_conversation_id::TEXT, v_signals, 'BLOCKED');
    INSERT INTO public.audit_logs(actor_id, action, target, metadata)
    VALUES (auth.uid(), 'PREBOOKING_CONTACT_BLOCKED', p_conversation_id::TEXT, jsonb_build_object('signals', v_signals));
    RETURN jsonb_build_object('success', FALSE, 'error', 'CONTACT_NOT_ALLOWED', 'signals', v_signals);
  ELSIF cardinality(v_signals) > 0 THEN
    v_moderation := 'ALLOWED_AFTER_BOOKING';
    INSERT INTO public.marketplace_contact_events(actor_id, conversation_id, surface, target_id, signals, outcome)
    VALUES (auth.uid(), p_conversation_id, 'MESSAGE', p_conversation_id::TEXT, v_signals, 'ALLOWED_AFTER_BOOKING');
  END IF;

  IF p_message_type IN ('IMAGE', 'VIDEO') THEN
    IF p_media_path IS NULL OR p_media_type IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'MEDIA_REQUIRED'); END IF;
    v_expected_prefix := p_conversation_id::TEXT || '/' || auth.uid()::TEXT || '/';
    IF left(p_media_path, char_length(v_expected_prefix)) <> v_expected_prefix THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_MEDIA_PATH');
    END IF;
    SELECT name, metadata INTO v_object FROM storage.objects
    WHERE bucket_id = 'message-private' AND name = p_media_path;
    IF v_object IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'MEDIA_NOT_FOUND'); END IF;
    v_size := COALESCE((v_object.metadata->>'size')::BIGINT, 0);
    IF p_message_type = 'IMAGE' AND (p_media_type NOT IN ('image/jpeg','image/png','image/webp') OR v_size < 1 OR v_size > 8388608) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_IMAGE');
    END IF;
    IF p_message_type = 'VIDEO' AND (p_media_type NOT IN ('video/mp4','video/webm') OR v_size < 1 OR v_size > 26214400) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_VIDEO');
    END IF;
    IF COALESCE(v_object.metadata->>'mimetype', v_object.metadata->>'contentType', '') <> p_media_type THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'MEDIA_TYPE_MISMATCH');
    END IF;
  ELSE
    p_media_path := NULL;
    p_media_type := NULL;
  END IF;

  INSERT INTO public.conversation_messages(
    conversation_id, sender_id, message_type, body, media_bucket, media_path,
    media_type, media_metadata, moderation_status
  ) VALUES (
    p_conversation_id, auth.uid(), p_message_type, NULLIF(btrim(p_body), ''),
    CASE WHEN p_media_path IS NULL THEN NULL ELSE 'message-private' END,
    p_media_path, p_media_type, COALESCE(p_media_metadata, '{}'::JSONB), v_moderation
  ) RETURNING id INTO v_message_id;

  v_recipient := CASE WHEN auth.uid() = v_conversation.customer_id THEN v_conversation.provider_id ELSE v_conversation.customer_id END;
  UPDATE public.conversations SET
    last_message_at = NOW(),
    customer_read_at = CASE WHEN auth.uid() = v_conversation.customer_id THEN NOW() ELSE customer_read_at END,
    provider_read_at = CASE WHEN auth.uid() = v_conversation.provider_id THEN NOW() ELSE provider_read_at END
  WHERE id = p_conversation_id;

  INSERT INTO public.notifications(user_id, title, message, type, action_url)
  VALUES (v_recipient, 'وصلك رد جديد 👋',
    CASE p_message_type WHEN 'IMAGE' THEN 'تم إرسال صورة داخل محادثة جسر.' WHEN 'VIDEO' THEN 'تم إرسال فيديو داخل محادثة جسر.' ELSE 'لديك رسالة جديدة داخل جسر.' END,
    'MESSAGE', '/messages/' || p_conversation_id::TEXT);

  RETURN jsonb_build_object('success', TRUE, 'message_id', v_message_id, 'contact_allowed', v_contact_allowed);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_conversation RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  SELECT customer_id, provider_id INTO v_conversation FROM public.conversations WHERE id = p_conversation_id;
  IF v_conversation IS NULL OR auth.uid() NOT IN (v_conversation.customer_id, v_conversation.provider_id) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'CONVERSATION_NOT_FOUND');
  END IF;
  UPDATE public.conversations SET
    customer_read_at = CASE WHEN auth.uid() = customer_id THEN NOW() ELSE customer_read_at END,
    provider_read_at = CASE WHEN auth.uid() = provider_id THEN NOW() ELSE provider_read_at END
  WHERE id = p_conversation_id;
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_conversation_inbox(p_limit INTEGER DEFAULT 40)
RETURNS TABLE(
  conversation_id UUID,
  counterpart_id UUID,
  counterpart_name TEXT,
  counterpart_avatar_path TEXT,
  counterpart_verified BOOLEAN,
  listing_id UUID,
  listing_title TEXT,
  booking_id UUID,
  last_message_type TEXT,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    CASE WHEN auth.uid() = c.customer_id THEN c.provider_id ELSE c.customer_id END,
    COALESCE(u.full_name, CASE WHEN auth.uid() = c.customer_id THEN 'مقدم خدمة' ELSE 'عميل جسر' END),
    CASE WHEN auth.uid() = c.customer_id THEN pp.avatar_path ELSE NULL END,
    CASE WHEN auth.uid() = c.customer_id THEN COALESCE(pp.is_verified, FALSE) ELSE FALSE END,
    c.listing_id,
    sl.title,
    c.booking_id,
    lm.message_type,
    CASE lm.message_type
      WHEN 'IMAGE' THEN 'صورة'
      WHEN 'VIDEO' THEN 'فيديو'
      WHEN 'SYSTEM' THEN COALESCE(lm.body, 'تحديث داخل المحادثة')
      ELSE left(COALESCE(lm.body, ''), 180)
    END,
    c.last_message_at,
    (
      SELECT count(*) FROM public.conversation_messages unread
      WHERE unread.conversation_id = c.id AND unread.sender_id <> auth.uid()
        AND unread.deleted_at IS NULL
        AND unread.created_at > COALESCE(
          CASE WHEN auth.uid() = c.customer_id THEN c.customer_read_at ELSE c.provider_read_at END,
          '-infinity'::TIMESTAMPTZ
        )
    )
  FROM public.conversations c
  LEFT JOIN public.users u ON u.id = CASE WHEN auth.uid() = c.customer_id THEN c.provider_id ELSE c.customer_id END
  LEFT JOIN public.provider_profiles pp ON pp.user_id = c.provider_id
  LEFT JOIN public.service_listings sl ON sl.id = c.listing_id
  LEFT JOIN LATERAL (
    SELECT cm.message_type, cm.body
    FROM public.conversation_messages cm
    WHERE cm.conversation_id = c.id AND cm.deleted_at IS NULL
    ORDER BY cm.created_at DESC, cm.id DESC LIMIT 1
  ) lm ON TRUE
  WHERE auth.uid() IS NOT NULL AND auth.uid() IN (c.customer_id, c.provider_id)
    AND c.status <> 'BLOCKED'
  ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 40), 1), 80);
$$;

CREATE OR REPLACE FUNCTION public.get_my_conversation_context(p_conversation_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id', c.id,
    'customer_id', c.customer_id,
    'provider_id', c.provider_id,
    'listing_id', c.listing_id,
    'listing_slug', sl.slug,
    'listing_title', sl.title,
    'booking_id', c.booking_id,
    'status', c.status,
    'counterpart_id', CASE WHEN auth.uid() = c.customer_id THEN c.provider_id ELSE c.customer_id END,
    'counterpart_name', COALESCE(u.full_name, CASE WHEN auth.uid() = c.customer_id THEN 'مقدم خدمة' ELSE 'عميل جسر' END),
    'counterpart_avatar_path', CASE WHEN auth.uid() = c.customer_id THEN pp.avatar_path ELSE NULL END,
    'counterpart_verified', CASE WHEN auth.uid() = c.customer_id THEN COALESCE(pp.is_verified, FALSE) ELSE FALSE END,
    'contact_allowed', public.conversation_contact_allowed(c.id)
  )
  FROM public.conversations c
  LEFT JOIN public.users u ON u.id = CASE WHEN auth.uid() = c.customer_id THEN c.provider_id ELSE c.customer_id END
  LEFT JOIN public.provider_profiles pp ON pp.user_id = c.provider_id
  LEFT JOIN public.service_listings sl ON sl.id = c.listing_id
  WHERE c.id = p_conversation_id AND auth.uid() IN (c.customer_id, c.provider_id);
$$;

CREATE OR REPLACE FUNCTION public.report_marketplace_content(
  p_target_type TEXT, p_target_id UUID, p_reason TEXT, p_details TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_report_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  IF p_target_type NOT IN ('MESSAGE','LISTING','POST','PROFILE','MEDIA')
    OR p_reason NOT IN ('CONTACT_SHARING','EXTERNAL_PAYMENT','SPAM','HARASSMENT','UNSAFE_CONTENT','OTHER')
    OR char_length(COALESCE(p_details, '')) > 1000 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_REPORT');
  END IF;
  IF p_target_type = 'MESSAGE' AND NOT EXISTS (
    SELECT 1 FROM public.conversation_messages cm JOIN public.conversations c ON c.id = cm.conversation_id
    WHERE cm.id = p_target_id AND auth.uid() IN (c.customer_id, c.provider_id)
  ) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'TARGET_NOT_FOUND'); END IF;
  INSERT INTO public.marketplace_content_reports(reporter_id, target_type, target_id, reason, details)
  VALUES (auth.uid(), p_target_type, p_target_id, p_reason, NULLIF(btrim(p_details), ''))
  ON CONFLICT (reporter_id, target_type, target_id, reason) DO UPDATE SET details = EXCLUDED.details
  RETURNING id INTO v_report_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'MARKETPLACE_CONTENT_REPORTED', p_target_id::TEXT, jsonb_build_object('target_type', p_target_type, 'reason', p_reason));
  RETURN jsonb_build_object('success', TRUE, 'report_id', v_report_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.link_conversation_to_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.provider_id IS NOT NULL THEN
    UPDATE public.conversations
    SET booking_id = NEW.id
    WHERE id = (
      SELECT c.id FROM public.conversations c
      WHERE c.customer_id = NEW.customer_id::UUID AND c.provider_id = NEW.provider_id
        AND (NEW.listing_id IS NULL OR c.listing_id = NEW.listing_id)
        AND c.status = 'ACTIVE' AND c.booking_id IS NULL
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC LIMIT 1
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS link_conversation_after_booking ON public.bookings;
CREATE TRIGGER link_conversation_after_booking
  AFTER INSERT OR UPDATE OF provider_id ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.link_conversation_to_booking();

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS contact_revealed_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.get_booking_provider_contact(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_contact JSONB; v_booking RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501'; END IF;
  SELECT b.id, b.customer_id, b.provider_id, b.status, b.agreed_amount,
    b.commission_rate_snapshot, b.commission_amount_snapshot
  INTO v_booking FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF v_booking IS NULL OR auth.uid() NOT IN (v_booking.customer_id::UUID, v_booking.provider_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF v_booking.status NOT IN ('ASSIGNED','IN_PROGRESS','COMPLETED')
    OR v_booking.agreed_amount IS NULL OR v_booking.commission_rate_snapshot IS NULL
    OR v_booking.commission_amount_snapshot IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.commission_ledger cl WHERE cl.booking_id = p_booking_id AND cl.status <> 'VOID') THEN
    RAISE EXCEPTION 'CONTACT_NOT_AVAILABLE' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object('full_name', u.full_name, 'phone', u.phone)
  INTO v_contact FROM public.users u WHERE u.id = v_booking.provider_id;
  UPDATE public.bookings SET contact_revealed_at = COALESCE(contact_revealed_at, NOW()) WHERE id = p_booking_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'BOOKING_CONTACT_REVEALED', p_booking_id::TEXT, jsonb_build_object('status', v_booking.status));
  RETURN v_contact;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_marketplace_contact_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_text TEXT; v_signals TEXT[]; v_surface TEXT; v_target TEXT;
BEGIN
  IF TG_TABLE_NAME = 'service_listings' THEN
    v_text := concat_ws(' ', NEW.title, NEW.short_description, NEW.description);
    v_surface := 'LISTING'; v_target := NEW.id::TEXT;
  ELSIF TG_TABLE_NAME = 'provider_posts' THEN
    v_text := NEW.content; v_surface := 'POST'; v_target := NEW.id::TEXT;
  ELSE
    v_text := concat_ws(' ', NEW.headline, NEW.bio); v_surface := 'PROFILE'; v_target := NEW.user_id::TEXT;
  END IF;
  v_signals := public.detect_marketplace_contact_signals(v_text);
  IF cardinality(v_signals) > 0 AND auth.uid() IS NOT NULL AND public.current_user_role() NOT IN ('ADMIN','SUPER_ADMIN') THEN
    INSERT INTO public.marketplace_contact_events(actor_id, surface, target_id, signals, outcome)
    VALUES (auth.uid(), v_surface, v_target, v_signals, 'BLOCKED');
    RAISE EXCEPTION 'CONTACT_INFORMATION_NOT_ALLOWED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_listing_contact_content ON public.service_listings;
CREATE TRIGGER guard_listing_contact_content BEFORE INSERT OR UPDATE OF title, short_description, description
  ON public.service_listings FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_contact_content();
DROP TRIGGER IF EXISTS guard_provider_post_contact_content ON public.provider_posts;
CREATE TRIGGER guard_provider_post_contact_content BEFORE INSERT OR UPDATE OF content
  ON public.provider_posts FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_contact_content();
DROP TRIGGER IF EXISTS guard_provider_profile_contact_content ON public.provider_profiles;
CREATE TRIGGER guard_provider_profile_contact_content BEFORE INSERT OR UPDATE OF headline, bio
  ON public.provider_profiles FOR EACH ROW EXECUTE FUNCTION public.guard_marketplace_contact_content();

INSERT INTO storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
VALUES ('message-private', 'message-private', FALSE, 26214400,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/webm'])
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Participants read private message media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-private' AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id::TEXT = split_part(name, '/', 1)
      AND auth.uid() IN (c.customer_id, c.provider_id)
  ));
CREATE POLICY "Participants upload own private message media"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'message-private'
    AND split_part(name, '/', 2) = auth.uid()::TEXT
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::TEXT = split_part(name, '/', 1)
        AND auth.uid() IN (c.customer_id, c.provider_id) AND c.status = 'ACTIVE'
    ));
CREATE POLICY "Senders delete own private message media"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'message-private' AND split_part(name, '/', 2) = auth.uid()::TEXT);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_messages;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_marketplace_contact_signals(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_marketplace_contact_signals(TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.conversation_contact_allowed(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.conversation_contact_allowed(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_marketplace_conversation(UUID, UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_marketplace_conversation(UUID, UUID, UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.send_conversation_message(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_conversation_message(UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.mark_conversation_read(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_conversation_inbox(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_inbox(INTEGER) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_my_conversation_context(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_conversation_context(UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.report_marketplace_content(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_marketplace_content(TEXT, UUID, TEXT, TEXT) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.link_conversation_to_booking() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.link_conversation_to_booking() TO service_role;
REVOKE ALL ON FUNCTION public.guard_marketplace_contact_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_marketplace_contact_content() TO service_role;
REVOKE ALL ON FUNCTION public.get_booking_provider_contact(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_provider_contact(UUID) TO authenticated;
