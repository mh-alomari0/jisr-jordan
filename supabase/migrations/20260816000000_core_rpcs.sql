-- ====================================================================
-- JISR JORDAN - CORE DATABASE FUNCTIONS & RPC MIGRATION
-- ====================================================================

-- 1. دالة الحجز الذري لمنع التضارب والحجز المزدوج (Concurrency Control)
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
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key != '' THEN
    SELECT id INTO v_existing_booking FROM public.bookings WHERE idempotency_key = p_idempotency_key;
    IF v_existing_booking IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'booking_id', v_existing_booking, 'duplicated', true);
    END IF;
  END IF;

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

  INSERT INTO public.bookings (
    customer_id, service_id, provider_id, booking_date, start_time, end_time, status, idempotency_key, phone, address, notes
  ) VALUES (
    p_customer_id, p_service_id, p_provider_id, p_booking_date, p_start_time, p_end_time, 'PENDING', p_idempotency_key, p_phone, p_address, p_notes
  ) RETURNING id INTO v_new_booking_id;

  RETURN jsonb_build_object('success', true, 'booking_id', v_new_booking_id);
END;
$$;

-- 2. دالة التجهيل وحذف الحساب الآمن وفق معايير الخصوصية
CREATE OR REPLACE FUNCTION public.delete_user_account_securely(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.bookings
  SET phone = '0000000000', address = 'تم مسح العنوان بناءً على طلب العميل', notes = NULL, updated_at = NOW()
  WHERE customer_id = p_user_id;

  DELETE FROM public.users WHERE id = p_user_id;
  RETURN true;
END;
$$;