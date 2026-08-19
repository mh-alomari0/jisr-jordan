-- Persist blocked contact attempts made through first-party server actions.
-- Database triggers still provide the independent enforcement layer.

CREATE OR REPLACE FUNCTION public.record_marketplace_contact_block(
  p_surface TEXT,
  p_target_id TEXT,
  p_signals TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_event_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('success', FALSE, 'error', 'UNAUTHORIZED'); END IF;
  IF p_surface NOT IN ('LISTING','PROFILE','POST','QUOTE') OR cardinality(COALESCE(p_signals, '{}')) < 1 THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'INVALID_EVENT');
  END IF;
  INSERT INTO public.marketplace_contact_events(actor_id, surface, target_id, signals, outcome)
  VALUES (auth.uid(), p_surface, p_target_id, p_signals, 'BLOCKED') RETURNING id INTO v_event_id;
  INSERT INTO public.audit_logs(actor_id, action, target, metadata)
  VALUES (auth.uid(), 'PREBOOKING_CONTACT_BLOCKED', COALESCE(p_target_id, v_event_id::TEXT), jsonb_build_object('surface', p_surface, 'signals', p_signals));
  RETURN jsonb_build_object('success', TRUE, 'event_id', v_event_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_marketplace_contact_block(TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_marketplace_contact_block(TEXT, TEXT, TEXT[]) TO authenticated, service_role;
