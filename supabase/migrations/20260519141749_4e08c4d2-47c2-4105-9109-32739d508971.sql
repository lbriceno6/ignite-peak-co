
REVOKE EXECUTE ON FUNCTION public.notify_admins(text,text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid,text,text,text,text) FROM PUBLIC, anon, authenticated;
