-- Repeated approval must not create duplicate notifications or audit events.
CREATE OR REPLACE FUNCTION public.review_provider_application(p_provider_id UUID, p_actor_id UUID, p_decision TEXT, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE
  v_profile RECORD; v_is_service_role BOOLEAN := COALESCE(auth.role(), '') = 'service_role';
  v_title TEXT; v_message TEXT; v_type TEXT;
BEGIN
  IF NOT v_is_service_role AND (auth.uid() IS NULL OR auth.uid() <> p_actor_id OR public.current_user_role() NOT IN ('ADMIN', 'SUPER_ADMIN')) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN'); END IF;
  IF p_decision NOT IN ('APPROVE', 'REJECT', 'SUSPEND') THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_DECISION'); END IF;
  IF LENGTH(COALESCE(p_reason, '')) > 500 THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_REASON'); END IF;
  SELECT id, application_status INTO v_profile FROM public.provider_profiles WHERE user_id = p_provider_id FOR UPDATE;
  IF v_profile IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PROVIDER_NOT_FOUND'); END IF;

  IF p_decision = 'APPROVE' THEN
    IF v_profile.application_status <> 'PENDING_VERIFICATION' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_STATUS'); END IF;
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
REVOKE ALL ON FUNCTION public.review_provider_application(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_provider_application(UUID, UUID, TEXT, TEXT) TO authenticated, service_role;

