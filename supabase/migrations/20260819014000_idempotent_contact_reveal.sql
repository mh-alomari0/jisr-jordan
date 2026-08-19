-- Make booking contact reveal idempotent: repeated detail views return the same
-- operational contact without creating duplicate audit events.

CREATE OR REPLACE FUNCTION public.get_booking_provider_contact(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_contact JSONB; v_booking RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501'; END IF;
  SELECT b.id, b.customer_id, b.provider_id, b.status, b.agreed_amount,
    b.commission_rate_snapshot, b.commission_amount_snapshot, b.contact_revealed_at
  INTO v_booking FROM public.bookings b WHERE b.id = p_booking_id FOR UPDATE;
  IF v_booking IS NULL OR auth.uid() NOT IN (v_booking.customer_id::UUID, v_booking.provider_id) THEN
    RAISE EXCEPTION 'FORBIDDEN' USING ERRCODE = '42501';
  END IF;
  IF v_booking.status NOT IN ('ASSIGNED','IN_PROGRESS','COMPLETED')
    OR v_booking.agreed_amount IS NULL OR v_booking.commission_rate_snapshot IS NULL
    OR v_booking.commission_amount_snapshot IS NULL
    OR NOT EXISTS (SELECT 1 FROM public.commission_ledger cl WHERE cl.booking_id = p_booking_id AND cl.status <> 'VOID') THEN
    RAISE EXCEPTION 'CONTACT_NOT_AVAILABLE' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object('full_name', u.full_name, 'phone', u.phone)
  INTO v_contact FROM public.users u WHERE u.id = v_booking.provider_id;
  IF v_booking.contact_revealed_at IS NULL THEN
    UPDATE public.bookings SET contact_revealed_at = NOW() WHERE id = p_booking_id;
    INSERT INTO public.audit_logs(actor_id, action, target, metadata)
    VALUES (auth.uid(), 'BOOKING_CONTACT_REVEALED', p_booking_id::TEXT, jsonb_build_object('status', v_booking.status));
  END IF;
  RETURN v_contact;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_provider_contact(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_provider_contact(UUID) TO authenticated;
