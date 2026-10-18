CREATE POLICY "order items organizer read" ON public.order_items
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.ticket_tiers tt
  JOIN public.events e ON e.id = tt.event_id
  JOIN public.organizers og ON og.id = e.organizer_id
  WHERE tt.id = order_items.tier_id AND og.user_id = auth.uid()
));

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _user_id AND ur.role = _role
     )
$function$;

REVOKE ALL ON FUNCTION private.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;