-- Preserve earned marketplace commission and create audit-friendly cancellation
-- signals. No existing booking or commission row is rewritten.

CREATE OR REPLACE FUNCTION public.guard_booking_cancellation_after_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT := public.current_user_role();
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.status = 'CANCELLED' AND OLD.status IN ('IN_PROGRESS', 'COMPLETED') THEN
    RAISE EXCEPTION 'CANCELLATION_AFTER_WORK_NOT_ALLOWED' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'CANCELLED' AND OLD.contact_revealed_at IS NOT NULL
    AND v_role NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'CANCELLATION_REQUIRES_ADMIN_REVIEW' USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'CANCELLED' THEN
    INSERT INTO public.audit_logs(actor_id, action, target, metadata)
    VALUES (
      auth.uid(),
      CASE WHEN OLD.contact_revealed_at IS NULL THEN 'BOOKING_CANCELLED_SIGNAL' ELSE 'BOOKING_CANCELLED_AFTER_CONTACT_REVIEW' END,
      OLD.id::TEXT,
      jsonb_build_object(
        'customer_id', OLD.customer_id,
        'provider_id', OLD.provider_id,
        'from_status', OLD.status,
        'contact_revealed', OLD.contact_revealed_at IS NOT NULL,
        'commission_snapshotted', OLD.commission_amount_snapshot IS NOT NULL
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_booking_cancellation_after_contact ON public.bookings;
CREATE TRIGGER guard_booking_cancellation_after_contact
  BEFORE UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.guard_booking_cancellation_after_contact();

REVOKE ALL ON FUNCTION public.guard_booking_cancellation_after_contact() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_booking_cancellation_after_contact() TO service_role;
