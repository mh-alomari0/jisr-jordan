-- Provider-first marketplace invariant: any offer exposed to customers must be
-- attached to an active service type in the same taxonomy category. Drafts and
-- historical bookings remain untouched.

CREATE OR REPLACE FUNCTION public.enforce_listing_service_type_for_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('PENDING_REVIEW', 'PUBLISHED') AND (
    NEW.legacy_service_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = NEW.legacy_service_id
        AND s.category_id = NEW.category_id
        AND s.is_active = TRUE
    )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'LISTING_SERVICE_TYPE_REQUIRED';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_listing_service_type_for_publication ON public.service_listings;
CREATE TRIGGER enforce_listing_service_type_for_publication
  BEFORE INSERT OR UPDATE OF status, legacy_service_id, category_id
  ON public.service_listings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_listing_service_type_for_publication();

REVOKE ALL ON FUNCTION public.enforce_listing_service_type_for_publication() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_listing_service_type_for_publication() TO service_role;
