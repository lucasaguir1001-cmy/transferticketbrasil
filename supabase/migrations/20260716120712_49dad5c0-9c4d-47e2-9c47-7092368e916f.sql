
GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

GRANT SELECT ON public.ticket_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_tiers TO authenticated;
GRANT ALL ON public.ticket_tiers TO service_role;

GRANT SELECT ON public.organizers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
