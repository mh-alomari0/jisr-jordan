-- Persist core marketplace notifications and audit events inside the same
-- transaction as the business change. This removes best-effort gaps and makes
-- retries safe because duplicate/invalid transitions return before inserts.

CREATE OR REPLACE FUNCTION public.create_booking_atomic(
  p_customer_id UUID, p_service_id UUID, p_provider_id UUID,
  p_booking_date DATE, p_start_time TIME, p_end_time TIME,
  p_idempotency_key TEXT, p_phone TEXT, p_address TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
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
  IF p_idempotency_key IS NULL OR p_idempotency_key !~ '^[A-Za-z0-9_-]{8,120}$'
     OR LENGTH(BTRIM(p_phone)) NOT BETWEEN 8 AND 20
     OR LENGTH(BTRIM(p_address)) NOT BETWEEN 5 AND 500
     OR LENGTH(COALESCE(p_notes, '')) > 1000 THEN
    RAISE EXCEPTION 'INVALID_BOOKING_DATA' USING ERRCODE = '22023';
  END IF;

  SELECT title INTO v_service_title FROM public.services
  WHERE id = p_service_id AND is_active = TRUE;
  IF v_service_title IS NULL THEN
    RAISE EXCEPTION 'SERVICE_NOT_AVAILABLE' USING ERRCODE = 'P0002';
  END IF;

  SELECT id, customer_id INTO v_existing FROM public.bookings
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.customer_id <> p_customer_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_CONFLICT' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('success', TRUE, 'booking_id', v_existing.id, 'duplicated', TRUE);
  END IF;

  INSERT INTO public.bookings (
    customer_id, service_id, provider_id, service_title, booking_date,
    booking_time, start_time, end_time, area, phone, address, notes,
    status, idempotency_key, updated_at
  ) VALUES (
    p_customer_id, p_service_id::TEXT, NULL, v_service_title, p_booking_date,
    p_start_time::TEXT, p_start_time, p_end_time, p_address, p_phone, p_address,
    NULLIF(BTRIM(p_notes), ''), 'PENDING', p_idempotency_key, NOW()
  ) RETURNING id INTO v_new_booking_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    p_customer_id,
    'تم استلام طلب الحجز #' || LEFT(v_new_booking_id::TEXT, 8),
    'تم استلام طلب خدمة ' || v_service_title || ' بتاريخ ' || p_booking_date::TEXT || '. سنبلغك عند تأكيده.',
    'BOOKING'
  );
  INSERT INTO public.audit_logs (actor_id, action, target, metadata)
  VALUES (p_customer_id, 'BOOKING_CREATED', v_new_booking_id::TEXT,
          jsonb_build_object('booking_id', v_new_booking_id, 'service_id', p_service_id));

  RETURN jsonb_build_object('success', TRUE, 'booking_id', v_new_booking_id, 'service_title', v_service_title);
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_booking_status(p_booking_id UUID, p_new_status TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_booking RECORD;
  v_role TEXT := public.current_user_role();
  v_is_service_role BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
  v_transition_allowed BOOLEAN := FALSE;
  v_actor_allowed BOOLEAN := FALSE;
  v_title TEXT;
  v_message TEXT;
  v_type TEXT := 'BOOKING';
BEGIN
  SELECT id, customer_id, provider_id, status, payment_status, service_title
  INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_booking IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND'); END IF;

  v_transition_allowed := CASE v_booking.status
    WHEN 'PENDING' THEN p_new_status IN ('CONFIRMED', 'CANCELLED')
    WHEN 'CONFIRMED' THEN p_new_status IN ('ASSIGNED', 'CANCELLED')
    WHEN 'ASSIGNED' THEN p_new_status IN ('IN_PROGRESS', 'CANCELLED')
    WHEN 'IN_PROGRESS' THEN p_new_status = 'COMPLETED'
    WHEN 'COMPLETED' THEN p_new_status = 'REFUNDED'
    ELSE FALSE END;
  IF NOT v_transition_allowed THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_TRANSITION'); END IF;
  IF p_new_status = 'ASSIGNED' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'USE_ASSIGNMENT_FLOW'); END IF;

  IF v_is_service_role OR v_role IN ('ADMIN', 'SUPER_ADMIN') THEN v_actor_allowed := TRUE;
  ELSIF v_booking.customer_id::TEXT = auth.uid()::TEXT THEN
    v_actor_allowed := p_new_status = 'CANCELLED' AND v_booking.status IN ('PENDING', 'CONFIRMED', 'ASSIGNED');
  ELSIF v_booking.provider_id = auth.uid() THEN
    v_actor_allowed := ((v_booking.status = 'ASSIGNED' AND p_new_status = 'IN_PROGRESS')
      OR (v_booking.status = 'IN_PROGRESS' AND p_new_status = 'COMPLETED'))
      AND EXISTS (SELECT 1 FROM public.provider_profiles pp WHERE pp.user_id = auth.uid()
        AND pp.is_verified = TRUE AND pp.application_status = 'APPROVED');
  END IF;
  IF NOT v_actor_allowed THEN RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN'); END IF;

  IF p_new_status = 'CANCELLED' AND (v_booking.payment_status = 'PAID' OR EXISTS (
    SELECT 1 FROM public.payments WHERE booking_id = p_booking_id AND status = 'PAID'
  )) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PAID_BOOKING_REQUIRES_REFUND'); END IF;

  UPDATE public.bookings SET status = p_new_status, updated_at = NOW() WHERE id = p_booking_id;
  IF p_new_status = 'COMPLETED' THEN
    UPDATE public.payments SET status = 'PAID', updated_at = NOW()
    WHERE booking_id = p_booking_id AND payment_method = 'CASH_ON_DELIVERY' AND status = 'PAY_ON_COMPLETION';
    IF FOUND THEN UPDATE public.bookings SET payment_status = 'PAID' WHERE id = p_booking_id; END IF;
  ELSIF p_new_status = 'REFUNDED' THEN
    UPDATE public.payments SET status = 'REFUNDED', updated_at = NOW()
    WHERE booking_id = p_booking_id AND status = 'PAID';
    UPDATE public.bookings SET payment_status = 'REFUNDED' WHERE id = p_booking_id;
  END IF;

  SELECT CASE p_new_status
    WHEN 'CONFIRMED' THEN 'تم تأكيد الحجز'
    WHEN 'IN_PROGRESS' THEN 'بدأ مقدم الخدمة العمل'
    WHEN 'COMPLETED' THEN 'اكتملت الخدمة'
    WHEN 'CANCELLED' THEN 'تم إلغاء الحجز'
    WHEN 'REFUNDED' THEN 'تم رد قيمة الحجز' END,
    CASE p_new_status
    WHEN 'CONFIRMED' THEN 'تم تأكيد حجز خدمة ' || COALESCE(v_booking.service_title, 'منزلية') || '.'
    WHEN 'IN_PROGRESS' THEN 'بدأ مقدم الخدمة تنفيذ الحجز #' || LEFT(p_booking_id::TEXT, 8) || '.'
    WHEN 'COMPLETED' THEN 'اكتمل الحجز #' || LEFT(p_booking_id::TEXT, 8) || '. يمكنك الآن إضافة تقييمك.'
    WHEN 'CANCELLED' THEN 'أُلغي الحجز #' || LEFT(p_booking_id::TEXT, 8) || '.'
    WHEN 'REFUNDED' THEN 'تم تسجيل رد قيمة الحجز #' || LEFT(p_booking_id::TEXT, 8) || '.' END
  INTO v_title, v_message;
  IF p_new_status = 'REFUNDED' THEN v_type := 'PAYMENT'; END IF;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (v_booking.customer_id::UUID, v_title, v_message, v_type);
  IF v_booking.provider_id IS NOT NULL AND p_new_status IN ('CANCELLED', 'COMPLETED', 'REFUNDED') THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (v_booking.provider_id, v_title, v_message, v_type);
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, target, metadata)
  VALUES (auth.uid(), 'BOOKING_STATUS_CHANGED', p_booking_id::TEXT,
    jsonb_build_object('from_status', v_booking.status, 'to_status', p_new_status));

  RETURN jsonb_build_object('success', TRUE, 'status', p_new_status);
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_provider_to_booking(p_booking_id UUID, p_provider_id UUID, p_assigned_by UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_booking RECORD;
  v_is_service_role BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
BEGIN
  IF NOT v_is_service_role AND (auth.uid() IS NULL OR auth.uid() <> p_assigned_by
    OR public.current_user_role() NOT IN ('ADMIN', 'SUPER_ADMIN')) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;
  SELECT id, customer_id, status, service_id, service_title, booking_date, start_time, end_time
  INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_booking IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND'); END IF;
  IF v_booking.status <> 'CONFIRMED' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_profiles pp JOIN public.users u ON u.id = pp.user_id
    WHERE pp.user_id = p_provider_id AND pp.is_verified = TRUE
      AND pp.application_status = 'APPROVED' AND u.role = 'STAFF') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_VERIFIED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_services ps WHERE ps.provider_id = p_provider_id
    AND ps.service_id::TEXT = v_booking.service_id::TEXT AND ps.is_active = TRUE) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_ELIGIBLE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.provider_schedules ps WHERE ps.provider_id = p_provider_id
    AND ps.day_of_week = EXTRACT(DOW FROM v_booking.booking_date)::INT AND ps.is_active = TRUE
    AND ps.start_time <= v_booking.start_time AND ps.end_time >= v_booking.end_time) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_UNAVAILABLE');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_provider_id::TEXT || ':' || v_booking.booking_date::TEXT || ':' || v_booking.start_time::TEXT, 0));
  IF EXISTS (SELECT 1 FROM public.bookings WHERE provider_id = p_provider_id
    AND booking_date = v_booking.booking_date AND id <> p_booking_id
    AND status IN ('ASSIGNED', 'IN_PROGRESS')
    AND (start_time, end_time) OVERLAPS (v_booking.start_time, v_booking.end_time)) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'SCHEDULE_CONFLICT');
  END IF;

  UPDATE public.bookings SET provider_id = p_provider_id, status = 'ASSIGNED', updated_at = NOW() WHERE id = p_booking_id;
  INSERT INTO public.audit_logs (actor_id, action, target, metadata)
  VALUES (p_assigned_by, 'PROVIDER_ASSIGNED', p_booking_id::TEXT,
    jsonb_build_object('provider_id', p_provider_id, 'booking_id', p_booking_id));
  INSERT INTO public.notifications (user_id, title, message, type) VALUES
    (p_provider_id, 'تم تعيين حجز جديد لك #' || LEFT(p_booking_id::TEXT, 8),
      'خدمة ' || COALESCE(v_booking.service_title, 'منزلية') || ' بتاريخ ' || v_booking.booking_date::TEXT || '.', 'BOOKING'),
    (v_booking.customer_id::UUID, 'تم تعيين مقدم خدمة لحجزك',
      'تم تعيين مقدم خدمة معتمد للحجز #' || LEFT(p_booking_id::TEXT, 8) || '.', 'BOOKING');
  RETURN jsonb_build_object('success', TRUE, 'booking_id', p_booking_id, 'provider_id', p_provider_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_as_provider(p_user_id UUID, p_bio TEXT, p_service_areas TEXT[], p_experience TEXT, p_service_ids UUID[])
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_existing RECORD;
  v_is_service_role BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
BEGIN
  IF NOT v_is_service_role AND (auth.uid() IS NULL OR auth.uid() <> p_user_id) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN'); END IF;
  IF LENGTH(BTRIM(p_bio)) < 10 OR COALESCE(array_length(p_service_areas, 1), 0) = 0
    OR COALESCE(array_length(p_service_ids, 1), 0) = 0 THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_APPLICATION'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_user_id AND role IN ('CUSTOMER', 'STAFF')) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_ACCOUNT_ROLE'); END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_service_ids) requested(id) LEFT JOIN public.services s
    ON s.id = requested.id AND s.is_active = TRUE WHERE s.id IS NULL) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_SERVICE'); END IF;
  SELECT id, application_status INTO v_existing FROM public.provider_profiles WHERE user_id = p_user_id FOR UPDATE;
  IF v_existing IS NOT NULL AND v_existing.application_status = 'APPROVED' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'ALREADY_APPROVED'); END IF;
  IF v_existing IS NOT NULL AND v_existing.application_status = 'PENDING_VERIFICATION' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'ALREADY_PENDING'); END IF;

  INSERT INTO public.provider_profiles (user_id, bio, service_areas, experience, application_status, application_notes, applied_at, is_verified, updated_at)
  VALUES (p_user_id, BTRIM(p_bio), p_service_areas, NULLIF(BTRIM(p_experience), ''), 'PENDING_VERIFICATION', NULL, NOW(), FALSE, NOW())
  ON CONFLICT (user_id) DO UPDATE SET bio = EXCLUDED.bio, service_areas = EXCLUDED.service_areas,
    experience = EXCLUDED.experience, application_status = 'PENDING_VERIFICATION', application_notes = NULL,
    applied_at = NOW(), is_verified = FALSE, updated_at = NOW();
  DELETE FROM public.provider_services WHERE provider_id = p_user_id;
  INSERT INTO public.provider_services (provider_id, service_id) SELECT p_user_id, requested.id FROM unnest(p_service_ids) requested(id);
  INSERT INTO public.audit_logs (actor_id, action, target, metadata) VALUES (p_user_id, 'PROVIDER_APPLICATION_SUBMITTED', p_user_id::TEXT, '{}'::JSONB);
  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (p_user_id, 'تم استلام طلب الانضمام', 'طلبك للانضمام كمقدم خدمة قيد مراجعة الإدارة.', 'INFO');
  INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, 'طلب مقدم خدمة جديد', 'يوجد طلب مقدم خدمة جديد بانتظار المراجعة.', 'INFO'
    FROM public.users WHERE role IN ('ADMIN', 'SUPER_ADMIN');
  RETURN jsonb_build_object('success', TRUE, 'status', 'PENDING_VERIFICATION');
END;
$$;

CREATE OR REPLACE FUNCTION public.review_provider_application(p_provider_id UUID, p_actor_id UUID, p_decision TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_profile RECORD;
  v_is_service_role BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
  v_title TEXT;
  v_message TEXT;
  v_type TEXT;
BEGIN
  IF NOT v_is_service_role AND (auth.uid() IS NULL OR auth.uid() <> p_actor_id
    OR public.current_user_role() NOT IN ('ADMIN', 'SUPER_ADMIN')) THEN RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN'); END IF;
  IF p_decision NOT IN ('APPROVE', 'REJECT', 'SUSPEND') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_DECISION'); END IF;
  IF LENGTH(COALESCE(p_reason, '')) > 500 THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_REASON'); END IF;
  SELECT id, application_status INTO v_profile FROM public.provider_profiles WHERE user_id = p_provider_id FOR UPDATE;
  IF v_profile IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_FOUND'); END IF;

  IF p_decision = 'APPROVE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = p_provider_id AND role IN ('CUSTOMER', 'STAFF')) THEN
      RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_ACCOUNT_ROLE'); END IF;
    UPDATE public.provider_profiles SET application_status = 'APPROVED', is_verified = TRUE, application_notes = NULL, updated_at = NOW() WHERE user_id = p_provider_id;
    UPDATE public.users SET role = 'STAFF', updated_at = NOW() WHERE id = p_provider_id AND role IN ('CUSTOMER', 'STAFF');
    v_title := 'تم اعتمادك كمقدم خدمة'; v_message := 'تهانينا، تم اعتماد طلبك ويمكنك الآن استخدام بوابة مقدمي الخدمة.'; v_type := 'SUCCESS';
  ELSIF p_decision = 'REJECT' THEN
    IF v_profile.application_status <> 'PENDING_VERIFICATION' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
    UPDATE public.provider_profiles SET application_status = 'REJECTED', is_verified = FALSE,
      application_notes = NULLIF(BTRIM(p_reason), ''), updated_at = NOW() WHERE user_id = p_provider_id;
    UPDATE public.users SET role = 'CUSTOMER', updated_at = NOW() WHERE id = p_provider_id AND role = 'STAFF';
    v_title := 'تحديث طلب الانضمام كمقدم خدمة';
    v_message := CASE WHEN NULLIF(BTRIM(p_reason), '') IS NULL THEN 'تعذر اعتماد طلبك حالياً. يمكنك تحديث بياناتك وإعادة التقديم.' ELSE 'تعذر اعتماد طلبك حالياً. السبب: ' || BTRIM(p_reason) END;
    v_type := 'WARNING';
  ELSE
    IF v_profile.application_status <> 'APPROVED' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
    UPDATE public.provider_profiles SET application_status = 'SUSPENDED', is_verified = FALSE, updated_at = NOW() WHERE user_id = p_provider_id;
    UPDATE public.users SET role = 'CUSTOMER', updated_at = NOW() WHERE id = p_provider_id AND role = 'STAFF';
    v_title := 'تم إيقاف حساب مقدم الخدمة'; v_message := 'تم إيقاف صلاحية مقدم الخدمة مؤقتاً. تواصل مع الإدارة للمراجعة.'; v_type := 'WARNING';
  END IF;
  INSERT INTO public.audit_logs (actor_id, action, target, metadata)
    VALUES (p_actor_id, 'PROVIDER_' || p_decision, p_provider_id::TEXT, jsonb_build_object('reason', p_reason));
  INSERT INTO public.notifications (user_id, title, message, type) VALUES (p_provider_id, v_title, v_message, v_type);
  RETURN jsonb_build_object('success', TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_cod_payment(p_booking_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_booking RECORD; v_payment RECORD; v_amount NUMERIC(10, 2);
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  SELECT id, customer_id, service_id, service_title, status INTO v_booking FROM public.bookings WHERE id = p_booking_id FOR UPDATE;
  IF v_booking IS NULL OR v_booking.customer_id::TEXT <> auth.uid()::TEXT THEN RETURN jsonb_build_object('success', FALSE, 'error', 'BOOKING_NOT_FOUND'); END IF;
  IF v_booking.status NOT IN ('PENDING', 'CONFIRMED') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
  SELECT id, amount, currency, payment_method, status INTO v_payment FROM public.payments
    WHERE booking_id = p_booking_id AND payment_method = 'CASH_ON_DELIVERY' ORDER BY created_at DESC LIMIT 1;
  IF v_payment IS NOT NULL THEN RETURN jsonb_build_object('success', TRUE, 'payment', to_jsonb(v_payment), 'duplicated', TRUE); END IF;
  IF EXISTS (SELECT 1 FROM public.payments WHERE booking_id = p_booking_id AND status IN ('PENDING', 'PROCESSING', 'PAID', 'PAY_ON_COMPLETION')) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'PAYMENT_EXISTS'); END IF;
  SELECT price INTO v_amount FROM public.services WHERE id::TEXT = v_booking.service_id::TEXT AND is_active = TRUE;
  IF v_amount IS NULL OR v_amount <= 0 THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_AMOUNT'); END IF;
  INSERT INTO public.payments (booking_id, customer_id, amount, currency, payment_method, status, idempotency_key, updated_at)
    VALUES (p_booking_id, auth.uid(), v_amount, 'JOD', 'CASH_ON_DELIVERY', 'PAY_ON_COMPLETION',
      'cod_' || p_booking_id::TEXT || '_' || auth.uid()::TEXT, NOW())
    RETURNING id, amount, currency, payment_method, status INTO v_payment;
  UPDATE public.bookings SET status = CASE WHEN v_booking.status = 'PENDING' THEN 'CONFIRMED' ELSE status END,
    payment_status = 'PENDING', updated_at = NOW() WHERE id = p_booking_id;
  INSERT INTO public.audit_logs (actor_id, action, target, metadata)
    VALUES (auth.uid(), 'COD_PAYMENT_SELECTED', p_booking_id::TEXT,
      jsonb_build_object('booking_id', p_booking_id, 'amount', v_amount, 'currency', 'JOD'));
  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (auth.uid(), 'تم اعتماد الدفع نقداً بعد الإنجاز',
      'سيتم تحصيل ' || v_amount::TEXT || ' د.أ نقداً بعد اكتمال خدمة ' || COALESCE(v_booking.service_title, 'الحجز') || '.', 'PAYMENT');
  RETURN jsonb_build_object('success', TRUE, 'payment', to_jsonb(v_payment));
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking_atomic(UUID, UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_booking_status(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_provider_to_booking(UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_as_provider(UUID, TEXT, TEXT[], TEXT, UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_provider_application(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_cod_payment(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_booking_atomic(UUID, UUID, UUID, DATE, TIME, TIME, TEXT, TEXT, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.transition_booking_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_provider_to_booking(UUID, UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_as_provider(UUID, TEXT, TEXT[], TEXT, UUID[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_provider_application(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_cod_payment(UUID) TO authenticated, service_role;

