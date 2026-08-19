-- Role changes are operational security events, not ordinary profile updates.
-- Provider roles remain exclusively controlled by provider review/suspension.
DROP POLICY IF EXISTS "Super admins update non-super-admin users" ON public.users;

CREATE OR REPLACE FUNCTION public.set_user_role_by_super_admin(
  p_target_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_target RECORD;
BEGIN
  IF auth.uid() IS NULL OR public.current_user_role() <> 'SUPER_ADMIN' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'FORBIDDEN');
  END IF;
  IF p_target_id = auth.uid() THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'SELF_ROLE_CHANGE');
  END IF;
  IF p_new_role NOT IN ('CUSTOMER', 'ADMIN') THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_ROLE');
  END IF;

  SELECT id, role INTO v_target
  FROM public.users
  WHERE id = p_target_id
  FOR UPDATE;

  IF v_target IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'USER_NOT_FOUND'); END IF;
  IF v_target.role = 'SUPER_ADMIN' THEN RETURN jsonb_build_object('success', FALSE, 'error', 'PROTECTED_ROLE'); END IF;
  IF v_target.role = 'STAFF' OR EXISTS (
    SELECT 1 FROM public.provider_profiles
    WHERE user_id = p_target_id AND application_status = 'APPROVED'
  ) THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'USE_PROVIDER_WORKFLOW');
  END IF;

  UPDATE public.users SET role = p_new_role, updated_at = NOW() WHERE id = p_target_id;
  INSERT INTO public.audit_logs (actor_id, action, target, metadata)
  VALUES (auth.uid(), 'USER_ROLE_CHANGED', p_target_id::TEXT,
    jsonb_build_object('from_role', v_target.role, 'to_role', p_new_role));
  RETURN jsonb_build_object('success', TRUE, 'role', p_new_role);
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_role_by_super_admin(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role_by_super_admin(UUID, TEXT) TO authenticated;

