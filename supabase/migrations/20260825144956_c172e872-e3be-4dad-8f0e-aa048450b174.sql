-- 1) ticket_tiers: public read only for tiers of published events
DROP POLICY "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read" ON public.ticket_tiers
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = ticket_tiers.event_id AND e.status = 'published'::event_status
  ));

-- 2) organizers: owner can read own full row (needed once public read is removed)
CREATE POLICY "organizers owner read" ON public.organizers
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 3) Public-safe view exposing only non-sensitive columns (no user_id)
CREATE OR REPLACE VIEW public.organizers_public AS
SELECT id, name, slug, bio, avatar_url, created_at
FROM public.organizers;
GRANT SELECT ON public.organizers_public TO anon, authenticated;
GRANT ALL ON public.organizers_public TO service_role;

-- 4) Remove broad public read from the base table
DROP POLICY "organizers public read" ON public.organizers;
REVOKE SELECT ON public.organizers FROM anon;