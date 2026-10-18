DROP POLICY IF EXISTS "events public read published" ON public.events;
CREATE POLICY "events public read published" ON public.events 
FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "organizers public read" ON public.organizers;
CREATE POLICY "organizers public read" ON public.organizers 
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read" ON public.ticket_tiers 
FOR SELECT TO anon, authenticated USING (true);