-- JISR Messaging V2 — Stage 4
-- Pin / archive / mute + inbox v2.
-- Apply AFTER Stage 1, 2, 3.

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS customer_pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_pinned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS customer_muted_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_muted_until TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.set_my_conversation_preference(
  p_conversation_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation RECORD;
  v_mute_until TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHORIZED'
    );
  END IF;

  IF p_action NOT IN (
    'PIN',
    'UNPIN',
    'ARCHIVE',
    'UNARCHIVE',
    'MUTE_8H',
    'MUTE_7D',
    'UNMUTE'
  ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_ACTION'
    );
  END IF;

  SELECT customer_id, provider_id
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

  v_mute_until :=
    CASE p_action
      WHEN 'MUTE_8H' THEN NOW() + INTERVAL '8 hours'
      WHEN 'MUTE_7D' THEN NOW() + INTERVAL '7 days'
      ELSE NULL
    END;

  UPDATE public.conversations
  SET
    customer_pinned_at = CASE
      WHEN auth.uid() <> customer_id
        THEN customer_pinned_at
      WHEN p_action = 'PIN'
        THEN NOW()
      WHEN p_action = 'UNPIN'
        THEN NULL
      ELSE customer_pinned_at
    END,
    provider_pinned_at = CASE
      WHEN auth.uid() <> provider_id
        THEN provider_pinned_at
      WHEN p_action = 'PIN'
        THEN NOW()
      WHEN p_action = 'UNPIN'
        THEN NULL
      ELSE provider_pinned_at
    END,

    customer_archived_at = CASE
      WHEN auth.uid() <> customer_id
        THEN customer_archived_at
      WHEN p_action = 'ARCHIVE'
        THEN NOW()
      WHEN p_action = 'UNARCHIVE'
        THEN NULL
      ELSE customer_archived_at
    END,
    provider_archived_at = CASE
      WHEN auth.uid() <> provider_id
        THEN provider_archived_at
      WHEN p_action = 'ARCHIVE'
        THEN NOW()
      WHEN p_action = 'UNARCHIVE'
        THEN NULL
      ELSE provider_archived_at
    END,

    customer_muted_until = CASE
      WHEN auth.uid() <> customer_id
        THEN customer_muted_until
      WHEN p_action IN ('MUTE_8H', 'MUTE_7D')
        THEN v_mute_until
      WHEN p_action = 'UNMUTE'
        THEN NULL
      ELSE customer_muted_until
    END,
    provider_muted_until = CASE
      WHEN auth.uid() <> provider_id
        THEN provider_muted_until
      WHEN p_action IN ('MUTE_8H', 'MUTE_7D')
        THEN v_mute_until
      WHEN p_action = 'UNMUTE'
        THEN NULL
      ELSE provider_muted_until
    END
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

REVOKE ALL
ON FUNCTION public.set_my_conversation_preference(UUID, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.set_my_conversation_preference(UUID, TEXT)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_conversation_inbox_v2(
  p_limit INTEGER DEFAULT 40,
  p_archived BOOLEAN DEFAULT FALSE
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
  unread_count BIGINT,
  pinned_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  muted_until TIMESTAMPTZ
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
      WHEN 'AUDIO' THEN 'تسجيل صوتي'
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
    ),
    CASE
      WHEN auth.uid() = c.customer_id
        THEN c.customer_pinned_at
      ELSE c.provider_pinned_at
    END,
    CASE
      WHEN auth.uid() = c.customer_id
        THEN c.customer_archived_at
      ELSE c.provider_archived_at
    END,
    CASE
      WHEN auth.uid() = c.customer_id
        THEN c.customer_muted_until
      ELSE c.provider_muted_until
    END
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
    AND (
      CASE
        WHEN auth.uid() = c.customer_id
          THEN (c.customer_archived_at IS NOT NULL)
        ELSE (c.provider_archived_at IS NOT NULL)
      END
    ) = p_archived
  ORDER BY
    (
      CASE
        WHEN auth.uid() = c.customer_id
          THEN c.customer_pinned_at
        ELSE c.provider_pinned_at
      END
    ) DESC NULLS LAST,
    c.last_message_at DESC NULLS LAST,
    c.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 40), 1), 80);
$$;

REVOKE ALL
ON FUNCTION public.get_my_conversation_inbox_v2(INTEGER, BOOLEAN)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_my_conversation_inbox_v2(INTEGER, BOOLEAN)
TO authenticated, service_role;

-- New incoming messages automatically return an archived conversation
-- to the recipient's inbox, while preserving the sender's own archive choice.
CREATE OR REPLACE FUNCTION public.unarchive_recipient_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.conversations
  SET
    customer_archived_at = CASE
      WHEN NEW.sender_id <> customer_id
        THEN NULL
      ELSE customer_archived_at
    END,
    provider_archived_at = CASE
      WHEN NEW.sender_id <> provider_id
        THEN NULL
      ELSE provider_archived_at
    END
  WHERE id = NEW.conversation_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS unarchive_recipient_after_message
  ON public.conversation_messages;

CREATE TRIGGER unarchive_recipient_after_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.unarchive_recipient_on_new_message();

REVOKE ALL
ON FUNCTION public.unarchive_recipient_on_new_message()
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE
ON FUNCTION public.unarchive_recipient_on_new_message()
TO service_role;
