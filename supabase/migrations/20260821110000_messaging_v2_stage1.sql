-- JISR Messaging V2 Stage 1
-- Fix per-user conversation deletion + raise private chat media limits.
-- Safe additive migration.

-- 1) Media bucket: 500 MB max object.
UPDATE storage.buckets
SET
  public = FALSE,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]::text[]
WHERE id = 'message-private';

-- 2) Repair "delete for me".
-- The older function existed but did not explicitly grant authenticated users
-- EXECUTE. Also, audit logging should never make inbox hiding fail.
CREATE OR REPLACE FUNCTION public.delete_my_conversation(
  p_conversation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_id UUID;
  v_provider_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'UNAUTHORIZED'
    );
  END IF;

  SELECT customer_id, provider_id
  INTO v_customer_id, v_provider_id
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF v_customer_id IS NULL
     OR auth.uid() NOT IN (v_customer_id, v_provider_id) THEN
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

  BEGIN
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
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  RETURN jsonb_build_object('success', TRUE);
END;
$$;

REVOKE ALL
ON FUNCTION public.delete_my_conversation(UUID)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.delete_my_conversation(UUID)
TO authenticated, service_role;

-- 3) Replace send RPC only to raise media ceilings.
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

  IF p_message_type NOT IN ('TEXT', 'IMAGE', 'VIDEO') THEN
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

  v_signals :=
    public.detect_marketplace_contact_signals(p_body);

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

    BEGIN
      INSERT INTO public.audit_logs(
        actor_id,
        action,
        target,
        metadata
      )
      VALUES (
        auth.uid(),
        'PREBOOKING_CONTACT_BLOCKED',
        p_conversation_id::TEXT,
        jsonb_build_object('signals', v_signals)
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

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

  IF p_message_type IN ('IMAGE', 'VIDEO') THEN
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
      COALESCE(
        (v_object.metadata->>'size')::BIGINT,
        0
      );

    -- 25 MB image limit.
    IF p_message_type = 'IMAGE'
       AND (
         p_media_type NOT IN (
           'image/jpeg',
           'image/png',
           'image/webp'
         )
         OR v_size < 1
         OR v_size > 26214400
       ) THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'INVALID_IMAGE'
      );
    END IF;

    -- 500 MB video limit.
    IF p_message_type = 'VIDEO'
       AND (
         p_media_type NOT IN (
           'video/mp4',
           'video/webm'
         )
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
    moderation_status
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
    v_moderation
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
    customer_read_at = CASE
      WHEN auth.uid() = v_conversation.customer_id
        THEN NOW()
      ELSE customer_read_at
    END,
    provider_read_at = CASE
      WHEN auth.uid() = v_conversation.provider_id
        THEN NOW()
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
      WHEN 'IMAGE'
        THEN 'وصلك صورة جديدة داخل جسر.'
      WHEN 'VIDEO'
        THEN 'وصلك فيديو جديد داخل جسر.'
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
ON FUNCTION public.send_conversation_message(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB
)
FROM PUBLIC, anon;

GRANT EXECUTE
ON FUNCTION public.send_conversation_message(
  UUID, TEXT, TEXT, TEXT, TEXT, JSONB
)
TO authenticated, service_role;
