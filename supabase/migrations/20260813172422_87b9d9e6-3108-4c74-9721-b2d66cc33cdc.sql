-- The role 'public' in Postgres policies corresponds to 'anon' and 'authenticated' in Supabase
-- However, we should be explicit to avoid any ambiguity in how the gateway handles it.

-- 1. Grant SELECT permission to authenticated and anon roles
GRANT SELECT ON public.events TO authenticated, anon;
GRANT SELECT ON public.organizers TO authenticated, anon;
GRANT SELECT ON public.ticket_tiers TO authenticated, anon;
GRANT SELECT ON public.user_roles TO authenticated, anon;
GRANT SELECT ON public.profiles TO authenticated, anon;

-- 2. Update the policy to be explicitly available to BOTH anon and authenticated
DROP POLICY IF EXISTS "events public read published" ON public.events;
CREATE POLICY "events public read published" 
ON public.events 
FOR SELECT 
TO anon, authenticated 
USING (status = 'published');

-- 3. Ensure other related tables are also readable
DROP POLICY IF EXISTS "organizers public read" ON public.organizers;
CREATE POLICY "organizers public read"
ON public.organizers
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read"
ON public.ticket_tiers
FOR SELECT
TO anon, authenticated
USING (true);
