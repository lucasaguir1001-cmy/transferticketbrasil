-- Drop all policies that depend on the function first
DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "events admin all" ON public.events;
DROP POLICY IF EXISTS "orders admin all" ON public.orders;

-- Now drop the functions
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
DROP FUNCTION IF EXISTS private.has_role(uuid, public.app_role);

-- Create the single, clean function in public
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Revoke and grant
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Re-add the policies using the correct function name
CREATE POLICY "user_roles admin all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "events admin all" ON public.events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Re-verify public read policies
DROP POLICY IF EXISTS "events public read published" ON public.events;
CREATE POLICY "events public read published" ON public.events
FOR SELECT TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "organizers public read" ON public.organizers;
CREATE POLICY "organizers public read" ON public.organizers
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read" ON public.ticket_tiers
FOR SELECT TO anon, authenticated
USING (true);

-- Final re-grant to ensure permissions are correct
GRANT SELECT ON public.events TO anon, authenticated;
GRANT SELECT ON public.organizers TO anon, authenticated;
GRANT SELECT ON public.ticket_tiers TO anon, authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;