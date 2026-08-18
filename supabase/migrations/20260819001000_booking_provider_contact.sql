-- Return only the assigned provider fields needed by the booking customer.
-- This avoids granting customers SELECT access to the provider's entire user row.
CREATE OR REPLACE FUNCTION public.get_booking_provider_contact(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_contact JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'full_name', u.full_name,
    'phone', u.phone
  )
  INTO v_contact
  FROM public.bookings b
  JOIN public.users u ON u.id = b.provider_id
  WHERE b.id = p_booking_id
    AND (
      b.customer_id = auth.uid()
      OR b.provider_id = auth.uid()
      OR public.current_user_role() IN ('ADMIN', 'SUPER_ADMIN')
    );

  RETURN v_contact;
END;
$$;

REVOKE ALL ON FUNCTION public.get_booking_provider_contact(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_booking_provider_contact(UUID) TO authenticated;
