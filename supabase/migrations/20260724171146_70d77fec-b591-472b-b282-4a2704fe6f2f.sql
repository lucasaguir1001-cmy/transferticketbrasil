-- Remove blanket column access from anon, then grant only safe columns
REVOKE SELECT ON public.organizers FROM anon;
GRANT SELECT (id, name, slug, bio, avatar_url, created_at, updated_at) ON public.organizers TO anon;

-- Ensure authenticated still has full access (for owner reads and joins)
GRANT SELECT ON public.organizers TO authenticated;