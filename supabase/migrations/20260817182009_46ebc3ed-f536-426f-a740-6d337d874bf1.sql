-- 1. Grant Select to authenticated and anon
GRANT SELECT ON public.events TO authenticated, anon;
GRANT SELECT ON public.organizers TO authenticated, anon;
GRANT SELECT ON public.ticket_tiers TO authenticated, anon;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 2. Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;

-- 3. Create or Update Policies
-- Events: Allow all to see published events
DROP POLICY IF EXISTS "events public read published" ON public.events;
CREATE POLICY "events public read published" ON public.events
FOR SELECT TO anon, authenticated
USING (status = 'published');

-- Organizers: Allow all to see organizers
DROP POLICY IF EXISTS "organizers public read" ON public.organizers;
CREATE POLICY "organizers public read" ON public.organizers
FOR SELECT TO anon, authenticated
USING (true);

-- Ticket Tiers: Allow all to see tiers
DROP POLICY IF EXISTS "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read" ON public.ticket_tiers
FOR SELECT TO anon, authenticated
USING (true);

-- Profiles: Allow users to see their own profile
DROP POLICY IF EXISTS "profiles own read" ON public.profiles;
CREATE POLICY "profiles own read" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- User Roles: Allow users to see their own roles
DROP POLICY IF EXISTS "user_roles own read" ON public.user_roles;
CREATE POLICY "user_roles own read" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);
