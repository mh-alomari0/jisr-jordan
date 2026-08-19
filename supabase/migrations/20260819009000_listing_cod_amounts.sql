-- Extend the proven COD workflow to listing and accepted-quote bookings.
-- Legacy service bookings continue to resolve their amount from services.price.

CREATE OR REPLACE FUNCTION public.create_cod_payment(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_booking RECORD;
  v_payment RECORD;
  v_amount NUMERIC(10, 2);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED');
  END IF;
  SELECT id, customer_id, service_id, listing_id, service_title, status, agreed_amount
  INTO v_booking
  FROM public.bookings
  WHERE id = p_booking_id
  FOR UPDATE;
  IF v_booking IS NULL OR v_booking.customer_id::TEXT <> auth.uid()::TEXT THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND');
  END IF;
  IF v_booking.status NOT IN ('PENDING', 'CONFIRMED', 'ASSIGNED') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS');
  END IF;

  SELECT id, amount, currency, payment_method, status INTO v_payment
  FROM public.payments
  WHERE booking_id = p_booking_id AND payment_method = 'CASH_ON_DELIVERY'
  ORDER BY created_at DESC LIMIT 1;
  IF v_payment IS NOT NULL THEN
    RETURN jsonb_build_object('success', TRUE, 'payment', to_jsonb(v_payment), 'duplicated', TRUE);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.payments
    WHERE booking_id = p_booking_id AND status IN ('PENDING', 'PROCESSING', 'PAID', 'PAY_ON_COMPLETION')
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_EXISTS');
  END IF;

  v_amount := v_booking.agreed_amount;
  IF v_amount IS NULL AND v_booking.service_id IS NOT NULL THEN
    SELECT price INTO v_amount FROM public.services
    WHERE id::TEXT = v_booking.service_id::TEXT AND is_active = TRUE;
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_AMOUNT');
  END IF;

  INSERT INTO public.payments(
    booking_id, customer_id, amount, currency, payment_method, status, idempotency_key, updated_at
  ) VALUES (
    p_booking_id, auth.uid(), v_amount, 'JOD', 'CASH_ON_DELIVERY', 'PAY_ON_COMPLETION',
    'cod_' || p_booking_id::TEXT || '_' || auth.uid()::TEXT, NOW()
  ) RETURNING id, amount, currency, payment_method, status INTO v_payment;

  UPDATE public.bookings
  SET status = CASE WHEN v_booking.status = 'PENDING' THEN 'CONFIRMED' ELSE status END,
      payment_status = 'PENDING', updated_at = NOW()
  WHERE id = p_booking_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'COD_PAYMENT_SELECTED', p_booking_id::TEXT,
    jsonb_build_object('booking_id', p_booking_id, 'amount', v_amount, 'currency', 'JOD',
      'listing_id', v_booking.listing_id));
  INSERT INTO public.notifications(user_id, title, message, type)
  VALUES (auth.uid(), 'تم اعتماد الدفع نقداً بعد الإنجاز',
    'سيتم تحصيل ' || v_amount::TEXT || ' د.أ نقداً بعد اكتمال خدمة ' || COALESCE(v_booking.service_title, 'الحجز') || '.',
    'PAYMENT');
  RETURN jsonb_build_object('success', TRUE, 'payment', to_jsonb(v_payment));
END;
$$;

REVOKE ALL ON FUNCTION public.create_cod_payment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_cod_payment(UUID) TO authenticated, service_role;

