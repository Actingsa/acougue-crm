
-- set search_path on touch_updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke public exec on security definer helpers, keep authenticated for RLS use
REVOKE EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.has_company_role(uuid, uuid, public.app_role[]) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM public, anon, authenticated;
