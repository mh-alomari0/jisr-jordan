-- JISR Messaging V2 — Stage 3
-- Voice notes + media gallery support.
-- Apply AFTER Stage 1 and Stage 2.

-- Allow AUDIO messages.
ALTER TABLE public.conversation_messages
  DROP CONSTRAINT IF EXISTS conversation_messages_message_type_check;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_message_type_check
  CHECK (
    message_type IN (
      'TEXT',
      'IMAGE',
      'VIDEO',
      'AUDIO',
      'SYSTEM',
      'QUOTE',
      'BOOKING_REFERENCE'
    )
  );

ALTER TABLE public.conversation_messages
  DROP CONSTRAINT IF EXISTS conversation_messages_media_type_check;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_media_type_check
  CHECK (
    media_type IS NULL
    OR media_type IN (
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/webm',
      'audio/webm',
      'audio/ogg',
      'audio/mp4'
    )
  );

ALTER TABLE public.conversation_messages
  DROP CONSTRAINT IF EXISTS conversation_messages_check;

ALTER TABLE public.conversation_messages
  ADD CONSTRAINT conversation_messages_check
  CHECK (
    (
      message_type = 'TEXT'
      AND body IS NOT NULL
      AND char_length(btrim(body)) BETWEEN 1 AND 4000
      AND media_path IS NULL
    )
    OR (
      message_type IN ('IMAGE', 'VIDEO', 'AUDIO')
      AND media_path IS NOT NULL
    )
    OR (
      message_type IN ('SYSTEM', 'QUOTE', 'BOOKING_REFERENCE')
      AND body IS NOT NULL
    )
  );

-- Private bucket still caps each object at 500 MB.
UPDATE storage.buckets
SET
  public = FALSE,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/webm',
    'audio/ogg',
    'audio/mp4'
  ]::text[]
WHERE id = 'message-private';

-- Rebuild V2 send RPC with AUDIO validation.
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

  IF p_message_type NOT IN ('TEXT','IMAGE','VIDEO','AUDIO') THEN
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
        WHEN 'AUDIO' THEN 'تسجيل صوتي'
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

  IF p_message_type IN ('IMAGE','VIDEO','AUDIO') THEN
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

    IF p_message_type = 'AUDIO'
       AND (
         p_media_type NOT IN (
           'audio/webm',
           'audio/ogg',
           'audio/mp4'
         )
         OR v_size < 1
         OR v_size > 26214400
       ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'INVALID_AUDIO'
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
      WHEN 'AUDIO' THEN 'وصلك تسجيل صوتي جديد داخل جسر.'
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

-- Inbox preview understands voice messages.
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
      WHEN 'AUDIO' THEN 'تسجيل صوتي'
      WHEN 'SYSTEM' THEN COALESCE(lm.body, 'تحديث داخل المحادثة')
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

REVOKE ALL
ON FUNCTION public.get_my_conversation_inbox(INTEGER)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.get_my_conversation_inbox(INTEGER)
TO authenticated, service_role;
