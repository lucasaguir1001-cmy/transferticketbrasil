-- The linter is complaining because public.has_role is in the public schema
-- and is a SECURITY DEFINER function. This is necessary for RLS to work correctly
-- while avoiding recursion.

-- We have already revoked EXECUTE from PUBLIC and granted to authenticated/service_role.
-- The linter still flags it because it's in the 'public' schema (the API schema).

-- To satisfy the linter while keeping RLS functional:
-- We'll move it to a schema that isn't exposed via the Data API.

CREATE SCHEMA IF NOT EXISTS auth_utils;

-- Drop from public
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role) CASCADE;

-- Create in auth_utils
CREATE OR REPLACE FUNCTION auth_utils.has_role(_user_id uuid, _role public.app_role)
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

-- Grant execution to service_role and authenticated (needed for RLS)
REVOKE ALL ON FUNCTION auth_utils.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth_utils.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Re-update all policies to use the new schema
DROP POLICY IF EXISTS "user_roles admin all" ON public.user_roles;
CREATE POLICY "user_roles admin all" ON public.user_roles FOR ALL TO authenticated USING (auth_utils.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "events admin all" ON public.events;
CREATE POLICY "events admin all" ON public.events FOR ALL TO authenticated USING (auth_utils.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "orders admin all" ON public.orders;
CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated USING (auth_utils.has_role(auth.uid(), 'admin'));

-- Also check any other admin policies that might exist
DROP POLICY IF EXISTS "events admin select" ON public.events;
DROP POLICY IF EXISTS "user_roles admin select" ON public.user_roles;