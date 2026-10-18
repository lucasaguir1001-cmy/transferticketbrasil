
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ORGANIZERS
CREATE TABLE public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organizers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "organizers public read" ON public.organizers FOR SELECT USING (true);
CREATE POLICY "organizers owner insert" ON public.organizers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "organizers owner update" ON public.organizers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "organizers owner delete" ON public.organizers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- EVENTS
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'ended', 'cancelled');

CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT,
  category TEXT,
  city TEXT,
  venue TEXT,
  address TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status event_status NOT NULL DEFAULT 'draft',
  highlights TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events public read published" ON public.events FOR SELECT USING (status = 'published');
CREATE POLICY "events owner read all" ON public.events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));
CREATE POLICY "events owner insert" ON public.events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));
CREATE POLICY "events owner update" ON public.events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));
CREATE POLICY "events owner delete" ON public.events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));
CREATE POLICY "events admin all" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- TICKET TIERS
CREATE TABLE public.ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  quantity_total INTEGER NOT NULL CHECK (quantity_total >= 0),
  quantity_available INTEGER NOT NULL CHECK (quantity_available >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ticket_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_tiers TO authenticated;
GRANT ALL ON public.ticket_tiers TO service_role;
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tiers public read" ON public.ticket_tiers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published'));
CREATE POLICY "tiers owner all" ON public.ticket_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()));

-- ORDERS
CREATE TYPE public.payment_provider AS ENUM ('stripe', 'mercadopago');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider payment_provider NOT NULL,
  provider_ref TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  buyer_email TEXT,
  buyer_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders owner read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders owner insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_fee_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items owner read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order items owner insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- TICKETS
CREATE TYPE public.ticket_status AS ENUM ('valid', 'used', 'cancelled');

CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id),
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status ticket_status NOT NULL DEFAULT 'valid',
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tickets owner read" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tickets organizer read" ON public.tickets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()));

-- updated_at triggers
CREATE TRIGGER trg_organizers_updated BEFORE UPDATE ON public.organizers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tiers_updated BEFORE UPDATE ON public.ticket_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_tiers_event ON public.ticket_tiers(event_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);
