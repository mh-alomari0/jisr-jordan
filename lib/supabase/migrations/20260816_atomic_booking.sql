-- ====================================================================
-- JISR JORDAN - ATOMIC BOOKING FUNCTION (PREVENTS DOUBLE BOOKING)
-- ====================================================================

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
SET search_path = public
AS $$
DECLARE
  v_existing_booking UUID;
  v_new_booking_id UUID;
BEGIN
  -- 1. فحص مفتاح التكرار (Idempotency Key) لمنع تكرار الطلب عند الضغط المزدوج
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
    SELECT id INTO v_existing_booking 
    FROM public.bookings
    WHERE idempotency_key = p_idempotency_key;

    IF v_existing_booking IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'booking_id', v_existing_booking, 'duplicated', true);
    END IF;
  END IF;

  -- 2. التحقق من عدم وجود حجز آخر متقاطع في نفس الموعد والتاريخ
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE (
      (p_provider_id IS NOT NULL AND provider_id = p_provider_id) OR
      (p_provider_id IS NULL AND service_id = p_service_id)
    )
    AND booking_date = p_booking_date
    AND status IN ('CONFIRMED', 'PENDING', 'IN_PROGRESS')
    AND (p_start_time, p_end_time) OVERLAPS (start_time, end_time)
    FOR UPDATE
  ) THEN
    RAISE EXCEPTION 'SLOT_OCCUPIED: الموعد المطلوب محجوز بالفعل' USING ERRCODE = 'P0001';
  END IF;

  -- 3. إنشاء الحجز بشكل آمن
  INSERT INTO public.bookings (
    customer_id, service_id, provider_id, booking_date, start_time, end_time, status, idempotency_key, phone, address, notes
  ) VALUES (
    p_customer_id, p_service_id, p_provider_id, p_booking_date, p_start_time, p_end_time, 'PENDING', p_idempotency_key, p_phone, p_address, p_notes
  ) RETURNING id INTO v_new_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', v_new_booking_id);
END;
$$;