-- JISR Messaging V2 — Stage 2
-- Replies, reactions, real seen state, secure typing indicator,
-- and delete-for-everyone.
-- Apply AFTER 20260821110000_messaging_v2_stage1.sql

ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID
    REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_preview TEXT
    CHECK (reply_preview IS NULL OR char_length(reply_preview) <= 180),
  ADD COLUMN IF NOT EXISTS reply_message_type TEXT
    CHECK (
      reply_message_type IS NULL
      OR reply_message_type IN (
        'TEXT','IMAGE','VIDEO','SYSTEM','QUOTE','BOOKING_REFERENCE'
      )
    ),
  ADD COLUMN IF NOT EXISTS is_deleted_for_everyone BOOLEAN
    NOT NULL DEFAULT FALSE;

ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS customer_typing_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS provider_typing_until TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.conversation_message_reactions (
  message_id UUID NOT NULL
    REFERENCES public.conversation_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL
    REFERENCES public.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL
    CHECK (reaction IN ('LIKE','LOVE','LAUGH','WOW','SAD')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_message_reactions_message
  ON public.conversation_message_reactions(message_id);

ALTER TABLE public.conversation_message_reactions
  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants read message reactions"
  ON public.conversation_message_reactions;

CREATE POLICY "Participants read message reactions"
  ON public.conversation_message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.conversation_messages cm
      JOIN public.conversations c
        ON c.id = cm.conversation_id
      WHERE cm.id = message_id
        AND auth.uid() IN (c.customer_id, c.provider_id)
    )
  );

-- Reactions are written only through the guarded RPC.
CREATE OR REPLACE FUNCTION public.toggle_message_reaction(
  p_message_id UUID,
  p_reaction TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_reaction NOT IN ('LIKE','LOVE','LAUGH','WOW','SAD') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_REACTION');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.conversation_messages cm
    JOIN public.conversations c
      ON c.id = cm.conversation_id
    WHERE cm.id = p_message_id
      AND cm.is_deleted_for_everyone = FALSE
      AND auth.uid() IN (c.customer_id, c.provider_id)
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'MESSAGE_NOT_FOUND');
  END IF;

  SELECT reaction
  INTO v_existing
  FROM public.conversation_message_reactions
  WHERE message_id = p_message_id
    AND user_id = auth.uid();

  IF v_existing = p_reaction THEN
    DELETE FROM public.conversation_message_reactions
    WHERE message_id = p_message_id
      AND user_id = auth.uid();

    RETURN jsonb_build_object(
      'success', TRUE,
      'action', 'REMOVED'
    );
  END IF;

  INSERT INTO public.conversation_message_reactions(
    message_id,
    user_id,
    reaction
  )
  VALUES (
    p_message_id,
    auth.uid(),
    p_reaction
  )
  ON CONFLICT (message_id, user_id)
  DO UPDATE SET
    reaction = EXCLUDED.reaction,
    created_at = NOW();

  RETURN jsonb_build_object(
    'success', TRUE,
    'action', 'SET'
  );
END;
$$;

REVOKE ALL
ON FUNCTION public.toggle_message_reaction(UUID, TEXT)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.toggle_message_reaction(UUID, TEXT)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_conversation_typing(
  p_conversation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_conversation RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
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

  UPDATE public.conversations
  SET
    customer_typing_until = CASE
      WHEN auth.uid() = customer_id
        THEN NOW() + INTERVAL '4 seconds'
      ELSE customer_typing_until
    END,
    provider_typing_until = CASE
      WHEN auth.uid() = provider_id
        THEN NOW() + INTERVAL '4 seconds'
      ELSE provider_typing_until
    END
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

REVOKE ALL
ON FUNCTION public.set_conversation_typing(UUID)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.set_conversation_typing(UUID)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.delete_my_message_for_everyone(
  p_message_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_temp
AS $$
DECLARE
  v_message RECORD;
  v_media_path TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT
    cm.id,
    cm.sender_id,
    cm.conversation_id,
    cm.created_at,
    cm.media_path,
    cm.is_deleted_for_everyone,
    c.customer_id,
    c.provider_id
  INTO v_message
  FROM public.conversation_messages cm
  JOIN public.conversations c
    ON c.id = cm.conversation_id
  WHERE cm.id = p_message_id
  FOR UPDATE;

  IF v_message IS NULL
     OR v_message.sender_id <> auth.uid()
     OR auth.uid() NOT IN (
       v_message.customer_id,
       v_message.provider_id
     ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'MESSAGE_NOT_FOUND'
    );
  END IF;

  IF v_message.is_deleted_for_everyone THEN
    RETURN jsonb_build_object('success', TRUE);
  END IF;

  -- Similar to large chat apps, deletion for everyone has a window.
  IF v_message.created_at < NOW() - INTERVAL '24 hours' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'DELETE_WINDOW_EXPIRED'
    );
  END IF;

  v_media_path := v_message.media_path;

  UPDATE public.conversation_messages
  SET
    message_type = 'SYSTEM',
    body = 'تم حذف هذه الرسالة',
    media_bucket = NULL,
    media_path = NULL,
    media_type = NULL,
    media_metadata = '{}'::JSONB,
    reply_to_message_id = NULL,
    reply_preview = NULL,
    reply_message_type = NULL,
    is_deleted_for_everyone = TRUE,
    edited_at = NOW()
  WHERE id = p_message_id;

  DELETE FROM public.conversation_message_reactions
  WHERE message_id = p_message_id;

  IF v_media_path IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'message-private'
      AND name = v_media_path;
  END IF;

  BEGIN
    INSERT INTO public.audit_logs(
      actor_id,
      action,
      target,
      metadata
    )
    VALUES (
      auth.uid(),
      'MESSAGE_DELETED_FOR_EVERYONE',
      p_message_id::TEXT,
      jsonb_build_object(
        'conversation_id',
        v_message.conversation_id
      )
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

REVOKE ALL
ON FUNCTION public.delete_my_message_for_everyone(UUID)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.delete_my_message_for_everyone(UUID)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.send_conversation_message_v2(
  p_conversation_id UUID,
  p_message_type TEXT,
  p_body TEXT DEFAULT NULL,
  p_media_path TEXT DEFAULT NULL,
  p_media_type TEXT DEFAULT NULL,
  p_media_metadata JSONB DEFAULT '{}'::JSONB,
  p_reply_to_message_id UUID DEFAULT NULL
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
  v_reply RECORD;
  v_reply_preview TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT *
  INTO v_conversation
  FROM public.conversations
  WHERE id = p_conversation_id
  FOR UPDATE;

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

  IF v_conversation.status <> 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CONVERSATION_CLOSED'
    );
  END IF;

  IF p_message_type NOT IN ('TEXT','IMAGE','VIDEO') THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_MESSAGE_TYPE'
    );
  END IF;

  IF char_length(COALESCE(p_body, '')) > 4000
     OR (
       p_message_type = 'TEXT'
       AND char_length(btrim(COALESCE(p_body, ''))) < 1
     ) THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'INVALID_MESSAGE'
    );
  END IF;

  IF p_reply_to_message_id IS NOT NULL THEN
    SELECT
      id,
      conversation_id,
      message_type,
      body,
      is_deleted_for_everyone
    INTO v_reply
    FROM public.conversation_messages
    WHERE id = p_reply_to_message_id;

    IF v_reply IS NULL
       OR v_reply.conversation_id <> p_conversation_id
       OR v_reply.is_deleted_for_everyone = TRUE THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'INVALID_REPLY'
      );
    END IF;

    v_reply_preview :=
      CASE v_reply.message_type
        WHEN 'IMAGE' THEN 'صورة'
        WHEN 'VIDEO' THEN 'فيديو'
        ELSE left(COALESCE(v_reply.body, 'رسالة'), 180)
      END;
  END IF;

  v_signals := public.detect_marketplace_contact_signals(p_body);
  v_contact_allowed :=
    public.conversation_contact_allowed(p_conversation_id);

  IF cardinality(v_signals) > 0
     AND NOT v_contact_allowed THEN
    INSERT INTO public.marketplace_contact_events(
      actor_id,
      conversation_id,
      surface,
      target_id,
      signals,
      outcome
    )
    VALUES (
      auth.uid(),
      p_conversation_id,
      'MESSAGE',
      p_conversation_id::TEXT,
      v_signals,
      'BLOCKED'
    );

    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'CONTACT_NOT_ALLOWED',
      'signals', v_signals
    );
  ELSIF cardinality(v_signals) > 0 THEN
    v_moderation := 'ALLOWED_AFTER_BOOKING';

    INSERT INTO public.marketplace_contact_events(
      actor_id,
      conversation_id,
      surface,
      target_id,
      signals,
      outcome
    )
    VALUES (
      auth.uid(),
      p_conversation_id,
      'MESSAGE',
      p_conversation_id::TEXT,
      v_signals,
      'ALLOWED_AFTER_BOOKING'
    );
  END IF;

  IF p_message_type IN ('IMAGE','VIDEO') THEN
    IF p_media_path IS NULL OR p_media_type IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'MEDIA_REQUIRED'
      );
    END IF;

    v_expected_prefix :=
      p_conversation_id::TEXT || '/' ||
      auth.uid()::TEXT || '/';

    IF left(
      p_media_path,
      char_length(v_expected_prefix)
    ) <> v_expected_prefix THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'INVALID_MEDIA_PATH'
      );
    END IF;

    SELECT name, metadata
    INTO v_object
    FROM storage.objects
    WHERE bucket_id = 'message-private'
      AND name = p_media_path;

    IF v_object IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'MEDIA_NOT_FOUND'
      );
    END IF;

    v_size :=
      COALESCE((v_object.metadata->>'size')::BIGINT, 0);

    IF p_message_type = 'IMAGE'
       AND (
         p_media_type NOT IN (
           'image/jpeg','image/png','image/webp'
         )
         OR v_size < 1
         OR v_size > 26214400
       ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'INVALID_IMAGE'
      );
    END IF;

    IF p_message_type = 'VIDEO'
       AND (
         p_media_type NOT IN ('video/mp4','video/webm')
         OR v_size < 1
         OR v_size > 524288000
       ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'INVALID_VIDEO'
      );
    END IF;

    IF COALESCE(
      v_object.metadata->>'mimetype',
      v_object.metadata->>'contentType',
      ''
    ) <> p_media_type THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'MEDIA_TYPE_MISMATCH'
      );
    END IF;
  ELSE
    p_media_path := NULL;
    p_media_type := NULL;
  END IF;

  INSERT INTO public.conversation_messages(
    conversation_id,
    sender_id,
    message_type,
    body,
    media_bucket,
    media_path,
    media_type,
    media_metadata,
    moderation_status,
    reply_to_message_id,
    reply_preview,
    reply_message_type
  )
  VALUES (
    p_conversation_id,
    auth.uid(),
    p_message_type,
    NULLIF(btrim(p_body), ''),
    CASE
      WHEN p_media_path IS NULL THEN NULL
      ELSE 'message-private'
    END,
    p_media_path,
    p_media_type,
    COALESCE(p_media_metadata, '{}'::JSONB),
    v_moderation,
    p_reply_to_message_id,
    v_reply_preview,
    CASE
      WHEN p_reply_to_message_id IS NULL THEN NULL
      ELSE v_reply.message_type
    END
  )
  RETURNING id INTO v_message_id;

  v_recipient :=
    CASE
      WHEN auth.uid() = v_conversation.customer_id
        THEN v_conversation.provider_id
      ELSE v_conversation.customer_id
    END;

  UPDATE public.conversations
  SET
    last_message_at = NOW(),
    customer_deleted_at = NULL,
    provider_deleted_at = NULL,
    customer_typing_until = CASE
      WHEN auth.uid() = customer_id THEN NULL
      ELSE customer_typing_until
    END,
    provider_typing_until = CASE
      WHEN auth.uid() = provider_id THEN NULL
      ELSE provider_typing_until
    END,
    customer_read_at = CASE
      WHEN auth.uid() = customer_id THEN NOW()
      ELSE customer_read_at
    END,
    provider_read_at = CASE
      WHEN auth.uid() = provider_id THEN NOW()
      ELSE provider_read_at
    END
  WHERE id = p_conversation_id;

  INSERT INTO public.notifications(
    user_id,
    title,
    message,
    type,
    action_url
  )
  VALUES (
    v_recipient,
    'وصلك رد جديد 👋',
    CASE p_message_type
      WHEN 'IMAGE' THEN 'وصلك صورة جديدة داخل جسر.'
      WHEN 'VIDEO' THEN 'وصلك فيديو جديد داخل جسر.'
      ELSE 'عندك رسالة جديدة داخل جسر.'
    END,
    'MESSAGE',
    '/messages/' || p_conversation_id::TEXT
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'message_id', v_message_id,
    'contact_allowed', v_contact_allowed
  );
END;
$$;

REVOKE ALL
ON FUNCTION public.send_conversation_message_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB, UUID
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.send_conversation_message_v2(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB, UUID
)
TO authenticated, service_role;

-- Rebuild context so the client can render real "seen" and typing state.
CREATE OR REPLACE FUNCTION public.get_my_conversation_context(
  p_conversation_id UUID
)
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
    'counterpart_id',
      CASE
        WHEN auth.uid() = c.customer_id
          THEN c.provider_id
        ELSE c.customer_id
      END,
    'counterpart_name',
      COALESCE(
        u.full_name,
        CASE
          WHEN auth.uid() = c.customer_id
            THEN 'مقدم خدمة'
          ELSE 'عميل جسر'
        END
      ),
    'counterpart_avatar_path',
      CASE
        WHEN auth.uid() = c.customer_id
          THEN pp.avatar_path
        ELSE NULL
      END,
    'counterpart_verified',
      CASE
        WHEN auth.uid() = c.customer_id
          THEN COALESCE(pp.is_verified, FALSE)
        ELSE FALSE
      END,
    'contact_allowed',
      public.conversation_contact_allowed(c.id),
    'counterpart_read_at',
      CASE
        WHEN auth.uid() = c.customer_id
          THEN c.provider_read_at
        ELSE c.customer_read_at
      END,
    'counterpart_typing_until',
      CASE
        WHEN auth.uid() = c.customer_id
          THEN c.provider_typing_until
        ELSE c.customer_typing_until
      END
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
  WHERE c.id = p_conversation_id
    AND auth.uid() IN (c.customer_id, c.provider_id);
$$;

REVOKE ALL
ON FUNCTION public.get_my_conversation_context(UUID)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_my_conversation_context(UUID)
TO authenticated, service_role;

-- Ensure live updates can drive message state.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime
        ADD TABLE public.conversations;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime
        ADD TABLE public.conversation_message_reactions;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END;
$$;
