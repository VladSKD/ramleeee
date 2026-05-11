-- Fix search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Lock down SECURITY DEFINER function exec
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Tighten consents insert: must be self when authenticated, or null user (anonymous banner only)
DROP POLICY IF EXISTS "consents_insert_any" ON public.consents;
CREATE POLICY "consents_insert_self_or_anon" ON public.consents
  FOR INSERT TO authenticated, anon
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR (auth.uid() IS NULL AND user_id IS NULL)
  );