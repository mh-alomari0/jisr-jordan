-- Quotes are a pre-booking communication surface and must follow the same
-- anti-circumvention rule as listings, profiles, posts, and chat.

ALTER TABLE public.marketplace_contact_events DROP CONSTRAINT IF EXISTS marketplace_contact_events_surface_check;
ALTER TABLE public.marketplace_contact_events ADD CONSTRAINT marketplace_contact_events_surface_check
  CHECK (surface IN ('MESSAGE', 'LISTING', 'PROFILE', 'POST', 'QUOTE'));

CREATE OR REPLACE FUNCTION public.guard_quote_contact_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_text TEXT; v_signals TEXT[];
BEGIN
  v_text := CASE WHEN TG_TABLE_NAME = 'quote_requests' THEN NEW.requirements ELSE NEW.message END;
  v_signals := public.detect_marketplace_contact_signals(v_text);
  IF cardinality(v_signals) > 0 AND auth.uid() IS NOT NULL AND public.current_user_role() NOT IN ('ADMIN','SUPER_ADMIN') THEN
    INSERT INTO public.marketplace_contact_events(actor_id, surface, target_id, signals, outcome)
    VALUES (auth.uid(), 'QUOTE', NEW.id::TEXT, v_signals, 'BLOCKED');
    RAISE EXCEPTION 'CONTACT_INFORMATION_NOT_ALLOWED' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_quote_request_contact ON public.quote_requests;
CREATE TRIGGER guard_quote_request_contact BEFORE INSERT OR UPDATE OF requirements
  ON public.quote_requests FOR EACH ROW EXECUTE FUNCTION public.guard_quote_contact_content();
DROP TRIGGER IF EXISTS guard_provider_quote_contact ON public.provider_quotes;
CREATE TRIGGER guard_provider_quote_contact BEFORE INSERT OR UPDATE OF message
  ON public.provider_quotes FOR EACH ROW EXECUTE FUNCTION public.guard_quote_contact_content();

REVOKE ALL ON FUNCTION public.guard_quote_contact_content() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_quote_contact_content() TO service_role;
