
CREATE POLICY "tickets organizer update" ON public.tickets
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = tickets.event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = tickets.event_id AND o.user_id = auth.uid()));

CREATE POLICY "orders organizer read" ON public.orders
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.events e ON e.id = t.event_id
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE t.order_id = orders.id AND o.user_id = auth.uid()
  ));
