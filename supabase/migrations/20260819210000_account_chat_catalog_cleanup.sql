-- JISR JORDAN — account controls, conversation deletion, beauty catalog, and music cleanup
-- Date: 2026-08-19
-- Additive / idempotent migration.

-- ============================================================
-- 1. ACCOUNT DELETION REQUESTS
-- We keep transaction/history rows intact and process destructive
-- account removal separately instead of breaking RESTRICT FKs.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REJECTED')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000)
);

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own deletion request"
  ON public.account_deletion_requests;
CREATE POLICY "Users manage own deletion request"
  ON public.account_deletion_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage deletion requests"
  ON public.account_deletion_requests;
CREATE POLICY "Admins manage deletion requests"
  ON public.account_deletion_requests
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'))
  WITH CHECK (public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- ============================================================
-- 2. PER-USER CONVERSATION DELETE/HIDE
-- Deleting from one user's inbox does not destroy the other user's
-- history. A fresh message restores the conversation automatically.
-- ============================================================
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS customer_deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.delete_my_conversation(
  p_conversation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation public.conversations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF v_conversation IS NULL
     OR auth.uid() NOT IN (
       v_conversation.customer_id,
       v_conversation.provider_id
     ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CONVERSATION_NOT_FOUND'
    );
  END IF;

  UPDATE public.conversations
  SET
    customer_deleted_at = CASE
      WHEN auth.uid() = customer_id THEN NOW()
      ELSE customer_deleted_at
    END,
    provider_deleted_at = CASE
      WHEN auth.uid() = provider_id THEN NOW()
      ELSE provider_deleted_at
    END
  WHERE id = p_conversation_id;

  INSERT INTO public.audit_logs(
    actor_id,
    action,
    target,
    metadata
  )
  VALUES (
    auth.uid(),
    'CONVERSATION_REMOVED_FROM_INBOX',
    p_conversation_id::TEXT,
    '{}'::JSONB
  );

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_deleted_conversation_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET
    customer_deleted_at = NULL,
    provider_deleted_at = NULL
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restore_deleted_conversation_after_message
  ON public.conversation_messages;
CREATE TRIGGER restore_deleted_conversation_after_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.restore_deleted_conversation_on_message();

CREATE OR REPLACE FUNCTION public.get_my_conversation_inbox(
  p_limit INTEGER DEFAULT 40
)
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
    CASE
      WHEN auth.uid() = c.customer_id
        THEN c.provider_id
      ELSE c.customer_id
    END,
    COALESCE(
      u.full_name,
      CASE
        WHEN auth.uid() = c.customer_id
          THEN 'مقدم خدمة'
        ELSE 'عميل جسر'
      END
    ),
    CASE
      WHEN auth.uid() = c.customer_id
        THEN pp.avatar_path
      ELSE NULL
    END,
    CASE
      WHEN auth.uid() = c.customer_id
        THEN COALESCE(pp.is_verified, FALSE)
      ELSE FALSE
    END,
    c.listing_id,
    sl.title,
    c.booking_id,
    lm.message_type,
    CASE lm.message_type
      WHEN 'IMAGE' THEN 'صورة'
      WHEN 'VIDEO' THEN 'فيديو'
      WHEN 'SYSTEM'
        THEN COALESCE(lm.body, 'تحديث داخل المحادثة')
      ELSE left(COALESCE(lm.body, ''), 180)
    END,
    c.last_message_at,
    (
      SELECT count(*)
      FROM public.conversation_messages unread
      WHERE unread.conversation_id = c.id
        AND unread.sender_id <> auth.uid()
        AND unread.deleted_at IS NULL
        AND unread.created_at > COALESCE(
          CASE
            WHEN auth.uid() = c.customer_id
              THEN c.customer_read_at
            ELSE c.provider_read_at
          END,
          '-infinity'::TIMESTAMPTZ
        )
    )
  FROM public.conversations c
  LEFT JOIN public.users u
    ON u.id = CASE
      WHEN auth.uid() = c.customer_id
        THEN c.provider_id
      ELSE c.customer_id
    END
  LEFT JOIN public.provider_profiles pp
    ON pp.user_id = c.provider_id
  LEFT JOIN public.service_listings sl
    ON sl.id = c.listing_id
  LEFT JOIN LATERAL (
    SELECT cm.message_type, cm.body
    FROM public.conversation_messages cm
    WHERE cm.conversation_id = c.id
      AND cm.deleted_at IS NULL
    ORDER BY cm.created_at DESC, cm.id DESC
    LIMIT 1
  ) lm ON TRUE
  WHERE auth.uid() IS NOT NULL
    AND auth.uid() IN (c.customer_id, c.provider_id)
    AND c.status <> 'BLOCKED'
    AND (
      (auth.uid() = c.customer_id AND c.customer_deleted_at IS NULL)
      OR
      (auth.uid() = c.provider_id AND c.provider_deleted_at IS NULL)
    )
  ORDER BY
    c.last_message_at DESC NULLS LAST,
    c.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 40), 1), 80);
$$;

-- ============================================================
-- 3. BEAUTY & CARE — restore as a real marketplace category
-- ============================================================
INSERT INTO public.service_categories (
  id,
  parent_id,
  slug,
  name_ar,
  description_ar,
  icon,
  display_order,
  requires_moderation,
  is_active
)
VALUES (
  '20000000-0000-4000-8000-000000000009',
  NULL,
  'beauty-care',
  'جمال وعناية',
  'خدمات العناية الشخصية والجمال والحلاقة والعناية بالشعر والبشرة والأظافر.',
  'sparkles',
  35,
  FALSE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = TRUE;

INSERT INTO public.service_categories (
  id, parent_id, slug, name_ar, description_ar,
  icon, display_order, requires_moderation, is_active
)
VALUES
(
  '27000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000009',
  'hair-care',
  'العناية بالشعر',
  'قص وتصفيف وعناية بالشعر.',
  'scissors',
  10,
  FALSE,
  TRUE
),
(
  '27000000-0000-4000-8000-000000000002',
  '20000000-0000-4000-8000-000000000009',
  'barber-grooming',
  'حلاقة وعناية شخصية',
  'حلاقة وتحديد وتهذيب وعناية شخصية.',
  'scissors',
  20,
  FALSE,
  TRUE
),
(
  '27000000-0000-4000-8000-000000000003',
  '20000000-0000-4000-8000-000000000009',
  'skin-care',
  'العناية بالبشرة',
  'تنظيف وعناية غير طبية بالبشرة.',
  'sparkles',
  30,
  FALSE,
  TRUE
),
(
  '27000000-0000-4000-8000-000000000004',
  '20000000-0000-4000-8000-000000000009',
  'nail-care',
  'العناية بالأظافر',
  'ترتيب وعناية تجميلية بالأظافر.',
  'hand',
  40,
  FALSE,
  TRUE
),
(
  '27000000-0000-4000-8000-000000000005',
  '20000000-0000-4000-8000-000000000009',
  'makeup-beauty',
  'مكياج وتجميل',
  'خدمات مكياج وتجميل للمناسبات والاستخدام الشخصي.',
  'palette',
  50,
  FALSE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  parent_id = EXCLUDED.parent_id,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  description_ar = EXCLUDED.description_ar,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  is_active = TRUE;

INSERT INTO public.services (
  id,
  title,
  description,
  price,
  category,
  icon,
  is_active,
  category_id
)
VALUES
(
  '11000000-0000-4000-8000-000000000001',
  'قص وتصفيف شعر',
  'قص وتصفيف شعر حسب الطلب مع تحديد التفاصيل قبل الموعد.',
  10.00,
  'BEAUTY',
  'scissors',
  TRUE,
  '27000000-0000-4000-8000-000000000001'
),
(
  '11000000-0000-4000-8000-000000000002',
  'تسريح شعر للمناسبات',
  'تسريح وتصفيف شعر للمناسبات بعد الاتفاق على النمط المطلوب.',
  20.00,
  'BEAUTY',
  'sparkles',
  TRUE,
  '27000000-0000-4000-8000-000000000001'
),
(
  '11000000-0000-4000-8000-000000000003',
  'حلاقة وتهذيب',
  'حلاقة وتهذيب مع تحديد الخدمة المطلوبة مسبقاً.',
  8.00,
  'BEAUTY',
  'scissors',
  TRUE,
  '27000000-0000-4000-8000-000000000002'
),
(
  '11000000-0000-4000-8000-000000000004',
  'تنظيف وعناية بالبشرة',
  'جلسة عناية تجميلية غير طبية للبشرة حسب نوع الخدمة المتفق عليها.',
  18.00,
  'BEAUTY',
  'sparkles',
  TRUE,
  '27000000-0000-4000-8000-000000000003'
),
(
  '11000000-0000-4000-8000-000000000005',
  'عناية بالأظافر',
  'تنظيف وترتيب وعناية تجميلية بالأظافر.',
  12.00,
  'BEAUTY',
  'hand',
  TRUE,
  '27000000-0000-4000-8000-000000000004'
),
(
  '11000000-0000-4000-8000-000000000006',
  'مكياج مناسبة',
  'مكياج للمناسبات بعد الاتفاق على المتطلبات والنمط.',
  25.00,
  'BEAUTY',
  'palette',
  TRUE,
  '27000000-0000-4000-8000-000000000005'
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  category = EXCLUDED.category,
  icon = EXCLUDED.icon,
  is_active = TRUE,
  category_id = EXCLUDED.category_id;

-- ============================================================
-- 4. REMOVE MUSIC-RELATED OPTIONS
-- We deactivate instead of deleting history.
-- ============================================================
UPDATE public.service_categories
SET is_active = FALSE
WHERE
  lower(slug) ~ '(music|musician|dj|audio-entertainment)'
  OR name_ar ~ '(موسيقى|موسيق|دي جي|ديجاي|عازف|غناء|مطرب|فرقة موسيق)';

UPDATE public.services
SET is_active = FALSE
WHERE
  lower(COALESCE(title, '')) ~ '(music|musician|dj)'
  OR COALESCE(title, '') ~ '(موسيقى|موسيق|دي جي|ديجاي|عازف|غناء|مطرب|فرقة موسيق)'
  OR COALESCE(description, '') ~ '(موسيقى|دي جي|ديجاي|عازف|غناء|مطرب|فرقة موسيق)';

UPDATE public.service_listings
SET status = 'PAUSED'
WHERE
  category_id IN (
    SELECT id
    FROM public.service_categories
    WHERE is_active = FALSE
      AND (
        lower(slug) ~ '(music|musician|dj|audio-entertainment)'
        OR name_ar ~ '(موسيقى|موسيق|دي جي|ديجاي|عازف|غناء|مطرب|فرقة موسيق)'
      )
  )
  OR title ~ '(موسيقى|موسيق|دي جي|ديجاي|عازف|غناء|مطرب|فرقة موسيق)';

-- ============================================================
-- 5. REMOVE EVENTS CATEGORY COMPLETELY FROM THE MARKETPLACE
-- User preference: do not surface event-related services.
-- We deactivate the whole subtree instead of deleting rows so
-- existing historical references stay valid.
-- ============================================================
WITH RECURSIVE event_tree AS (
  SELECT id
  FROM public.service_categories
  WHERE slug = 'events'
  UNION ALL
  SELECT child.id
  FROM public.service_categories child
  JOIN event_tree parent ON child.parent_id = parent.id
)
UPDATE public.service_categories
SET is_active = FALSE
WHERE id IN (SELECT id FROM event_tree);

UPDATE public.services
SET is_active = FALSE
WHERE category_id IN (
  WITH RECURSIVE event_tree AS (
    SELECT id
    FROM public.service_categories
    WHERE slug = 'events'
    UNION ALL
    SELECT child.id
    FROM public.service_categories child
    JOIN event_tree parent ON child.parent_id = parent.id
  )
  SELECT id FROM event_tree
);

UPDATE public.service_listings
SET status = 'PAUSED'
WHERE category_id IN (
  WITH RECURSIVE event_tree AS (
    SELECT id
    FROM public.service_categories
    WHERE slug = 'events'
    UNION ALL
    SELECT child.id
    FROM public.service_categories child
    JOIN event_tree parent ON child.parent_id = parent.id
  )
  SELECT id FROM event_tree
);
