-- Keep the contact detector's accumulator explicitly typed for PL/pgSQL and
-- plpgsql_check. This is behavior-preserving and removes the linked DB lint
-- warning about assigning an untyped string literal to TEXT[].
CREATE OR REPLACE FUNCTION public.detect_marketplace_contact_signals(p_text TEXT)
RETURNS TEXT[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_text TEXT := lower(translate(COALESCE(p_text, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'));
  v_compact TEXT;
  v_signals TEXT[] := ARRAY[]::TEXT[];
BEGIN
  v_compact := regexp_replace(v_text, '[[:space:].()_-]+', '', 'g');
  IF v_text ~ '[[:alnum:]._%+-]+[[:space:]]*@[[:space:]]*[[:alnum:].-]+\.[[:alpha:]]{2,}' THEN
    v_signals := array_append(v_signals, 'EMAIL');
  END IF;
  IF v_compact ~ '(\+?962|0)?7(7|8|9)[0-9]{7}' THEN
    v_signals := array_append(v_signals, 'PHONE');
  END IF;
  IF v_text ~ '(https?://|www\.)' THEN
    v_signals := array_append(v_signals, 'EXTERNAL_URL');
  END IF;
  IF v_text ~ '(واتس|واتساب|whatsapp|تلغرام|تيليغرام|telegram|سناب|snapchat|انستغرام|instagram|فيسبوك|facebook)[[:space:][:punct:]]*[@[:alnum:]_+.-]{3,}' THEN
    v_signals := array_append(v_signals, 'SOCIAL_CONTACT');
  END IF;
  IF v_text ~ '(كليك|cliq|paypal|باي[[:space:]]*بال|تحويل[[:space:]]+(خارجي|مباشر|بنكي)|رقم[[:space:]]+الحساب|iban)' THEN
    v_signals := array_append(v_signals, 'EXTERNAL_PAYMENT');
  END IF;
  RETURN v_signals;
END;
$$;

REVOKE ALL ON FUNCTION public.detect_marketplace_contact_signals(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.detect_marketplace_contact_signals(TEXT) TO authenticated, service_role;
