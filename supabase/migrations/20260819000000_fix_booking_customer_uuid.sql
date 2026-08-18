-- The live legacy schema keeps service_id as TEXT but customer_id is UUID.
-- Correct the runtime function without rewriting either populated column.
CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_customer_id UUID,
  p_service_id UUID,
  p_provider_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_idempotency_key TEXT,
  p_phone TEXT,
  p_address TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_existing RECORD;
  v_new_booking_id UUID;
  v_service_title TEXT;
  v_is_service_role BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
BEGIN
  IF NOT v_is_service_role AND (auth.uid() IS NULL OR auth.uid() <> p_customer_id) THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  IF p_provider_id IS NOT NULL THEN
    RAISE EXCEPTION 'PROVIDER_SELECTION_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;

  IF p_booking_date < CURRENT_DATE OR p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'INVALID_BOOKING_TIME' USING ERRCODE = '22007';
  END IF;

  IF p_idempotency_key IS NULL
     OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,120}$'
     OR LENGTH(BTRIM(p_phone)) NOT BETWEEN 8 AND 20
     OR LENGTH(BTRIM(p_address)) NOT BETWEEN 5 AND 500
     OR LENGTH(COALESCE(p_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'INVALID_BOOKING_DATA' USING ERRCODE = '22023';
  END IF;

  SELECT title INTO v_service_title
  FROM public.services
  WHERE id = p_service_id AND is_active = TRUE;

  IF v_service_title IS NULL THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, customer_id INTO v_existing
  FROM public.bookings
  WHERE idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.customer_id <> p_customer_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_CONFLICT' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object(
      'success', TRUE,
      'booking_id', v_existing.id,
      'duplicated', TRUE
    );
  END IF;

  INSERT INTO public.bookings (
    customer_id, service_id, provider_id, service_title,
    booking_date, booking_time, start_time, end_time,
    area, phone, address, notes, status, idempotency_key, updated_at
  ) VALUES (
    p_customer_id, p_service_id::TEXT, NULL, v_service_title,
    p_booking_date, p_start_time::TEXT, p_start_time, p_end_time,
    p_address, p_phone, p_address, NULLIF(BTRIM(p_notes), ''),
    'PENDING', p_idempotency_key, NOW()
  )
  RETURNING id INTO v_new_booking_id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'booking_id', v_new_booking_id,
    'service_title', v_service_title
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_atomic(UUID, UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(UUID, UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
