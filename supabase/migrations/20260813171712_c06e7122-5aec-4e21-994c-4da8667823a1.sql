-- Fix RLS policy for events to include authenticated users in public reading
DROP POLICY IF EXISTS "events public read published" ON public.events;

CREATE POLICY "events public read published" 
ON public.events 
FOR SELECT 
TO anon, authenticated 
USING (status = 'published');

-- Ensure GRANTS are correct (though they were supposedly fixed before)
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.organizers TO authenticated;
GRANT SELECT ON public.ticket_tiers TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
