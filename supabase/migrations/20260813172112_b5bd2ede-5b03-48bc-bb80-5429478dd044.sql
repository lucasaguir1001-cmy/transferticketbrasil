-- Add RLS policy for anonymous users to see organizers, which is needed for fetchEvents
DROP POLICY IF EXISTS "organizers public read" ON public.organizers;
CREATE POLICY "organizers public read"
ON public.organizers
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Ensure all published events are readable by everyone
DROP POLICY IF EXISTS "events public read published" ON public.events;
CREATE POLICY "events public read published" 
ON public.events 
FOR SELECT 
TO public, anon, authenticated 
USING (status = 'published');

-- Ensure ticket tiers are readable by everyone
DROP POLICY IF EXISTS "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read"
ON public.ticket_tiers
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Confirm GRANTs for both anon and authenticated roles
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.organizers TO anon, authenticated;
GRANT SELECT ON public.ticket_tiers TO anon, authenticated;
