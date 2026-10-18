-- Re-grant permissions to be absolutely sure
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.organizers TO anon, authenticated;
GRANT SELECT ON public.ticket_tiers TO anon, authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Ensure RLS is enabled correctly
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;