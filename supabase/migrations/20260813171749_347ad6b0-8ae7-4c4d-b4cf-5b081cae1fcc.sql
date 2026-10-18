-- Ensure the authenticated role has the necessary grants for ALL related tables
GRANT SELECT ON public.events TO authenticated;
GRANT SELECT ON public.organizers TO authenticated;
GRANT SELECT ON public.ticket_tiers TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Force refreshing the policy to be absolutely sure
DROP POLICY IF EXISTS "events public read published" ON public.events;
CREATE POLICY "events public read published" 
ON public.events 
FOR SELECT 
TO public, anon, authenticated 
USING (status = 'published');

-- Check organizers as well, they might be filtering events out if the join fails
DROP POLICY IF EXISTS "organizers public read" ON public.organizers;
CREATE POLICY "organizers public read"
ON public.organizers
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Check ticket_tiers
DROP POLICY IF EXISTS "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read"
ON public.ticket_tiers
FOR SELECT
TO public, anon, authenticated
USING (true);
