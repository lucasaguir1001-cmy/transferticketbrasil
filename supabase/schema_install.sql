-- ==============================================================================
-- SCHEMA COMPLETO E SEGURO (IDEMPOTENTE) PARA O SUPABASE
-- Pode ser executado em bancos novos ou já existentes no SQL Editor do Supabase.
-- ==============================================================================

-- 1. ENUMS (Tipos personalizados)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'user');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_status') THEN
    CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'ended', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticket_status') THEN
    CREATE TYPE public.ticket_status AS ENUM ('valid', 'used', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_provider') THEN
    CREATE TYPE public.payment_provider AS ENUM ('stripe', 'mercadopago', 'mock', 'syncpay');
  ELSE
    -- Garante que o valor 'syncpay' esteja presente
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'syncpay' AND enumtypid = 'public.payment_provider'::regtype) THEN
      ALTER TYPE public.payment_provider ADD VALUE 'syncpay';
    END IF;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'refund_status') THEN
    CREATE TYPE public.refund_status AS ENUM ('none', 'requested', 'refunded', 'failed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'coupon_discount_type') THEN
    CREATE TYPE public.coupon_discount_type AS ENUM ('percent', 'fixed');
  END IF;
END $$;

-- 2. SCHEMA PRIVADO PARA ROLES
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 3. TABELAS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- View segura de organizadores para leitura pública (excluindo user_id interno)
CREATE OR REPLACE VIEW public.organizers_public AS
SELECT id, name, slug, bio, avatar_url, created_at
FROM public.organizers;

GRANT SELECT ON public.organizers_public TO anon, authenticated;
GRANT ALL ON public.organizers_public TO service_role;

CREATE TABLE IF NOT EXISTS public.events (
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
  status public.event_status NOT NULL DEFAULT 'draft',
  highlights TEXT[] DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_tiers (
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

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type public.coupon_discount_type NOT NULL,
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider public.payment_provider NOT NULL,
  provider_ref TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'BRL',
  buyer_email TEXT,
  buyer_name TEXT,
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  mp_preference_id TEXT,
  mp_payment_id TEXT,
  refund_status public.refund_status NOT NULL DEFAULT 'none',
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_fee_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id),
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  status public.ticket_status NOT NULL DEFAULT 'valid',
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FUNÇÕES DO SISTEMA
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL
     AND _user_id = auth.uid()
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = _user_id AND ur.role = _role
     );
$$;

-- 5. PERMISSÕES E ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT (id, name, slug, bio, avatar_url, created_at, updated_at) ON public.organizers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;

GRANT SELECT ON public.events TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

GRANT SELECT ON public.ticket_tiers TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ticket_tiers TO authenticated;
GRANT ALL ON public.ticket_tiers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

REVOKE ALL ON FUNCTION private.has_role(UUID, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(UUID, public.app_role) TO authenticated, service_role;

-- 6. TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_organizers_updated ON public.organizers;
CREATE TRIGGER trg_organizers_updated BEFORE UPDATE ON public.organizers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_events_updated ON public.events;
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tiers_updated ON public.ticket_tiers;
CREATE TRIGGER trg_tiers_updated BEFORE UPDATE ON public.ticket_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_updated ON public.tickets;
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS coupons_set_updated_at ON public.coupons;
CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Políticas Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Políticas User Roles
DROP POLICY IF EXISTS "users view own roles" ON public.user_roles;
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Políticas Organizers
DROP POLICY IF EXISTS "organizers public read" ON public.organizers;
CREATE POLICY "organizers public read" ON public.organizers FOR SELECT USING (true);

DROP POLICY IF EXISTS "organizers owner insert" ON public.organizers;
CREATE POLICY "organizers owner insert" ON public.organizers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "organizers owner update" ON public.organizers;
CREATE POLICY "organizers owner update" ON public.organizers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "organizers owner delete" ON public.organizers;
CREATE POLICY "organizers owner delete" ON public.organizers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Políticas Events
DROP POLICY IF EXISTS "events public read published" ON public.events;
CREATE POLICY "events public read published" ON public.events FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "events owner read all" ON public.events;
CREATE POLICY "events owner read all" ON public.events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "events owner insert" ON public.events;
CREATE POLICY "events owner insert" ON public.events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "events owner update" ON public.events;
CREATE POLICY "events owner update" ON public.events FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "events owner delete" ON public.events;
CREATE POLICY "events owner delete" ON public.events FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "events admin all" ON public.events;
CREATE POLICY "events admin all" ON public.events FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Políticas Ticket Tiers
DROP POLICY IF EXISTS "tiers public read" ON public.ticket_tiers;
CREATE POLICY "tiers public read" ON public.ticket_tiers FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.status = 'published'));

DROP POLICY IF EXISTS "tiers owner all" ON public.ticket_tiers;
CREATE POLICY "tiers owner all" ON public.ticket_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()));

-- Políticas Coupons
DROP POLICY IF EXISTS "Organizers manage own coupons" ON public.coupons;
CREATE POLICY "Organizers manage own coupons" ON public.coupons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = coupons.event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = coupons.event_id AND o.user_id = auth.uid()));

-- Políticas Orders
DROP POLICY IF EXISTS "orders owner read" ON public.orders;
CREATE POLICY "orders owner read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders owner insert" ON public.orders;
CREATE POLICY "orders owner insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "orders admin all" ON public.orders;
CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "orders organizer read" ON public.orders;
CREATE POLICY "orders organizer read" ON public.orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.events e ON e.id = t.event_id
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE t.order_id = orders.id AND o.user_id = auth.uid()
  ));

-- Políticas Order Items
DROP POLICY IF EXISTS "order items owner read" ON public.order_items;
CREATE POLICY "order items owner read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "order items owner insert" ON public.order_items;
CREATE POLICY "order items owner insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "order items organizer read" ON public.order_items;
CREATE POLICY "order items organizer read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.ticket_tiers tt
    JOIN public.events e ON e.id = tt.event_id
    JOIN public.organizers og ON og.id = e.organizer_id
    WHERE tt.id = order_items.tier_id AND og.user_id = auth.uid()
  ));

-- Políticas Tickets
DROP POLICY IF EXISTS "tickets owner read" ON public.tickets;
CREATE POLICY "tickets owner read" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tickets organizer read" ON public.tickets;
CREATE POLICY "tickets organizer read" ON public.tickets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()));

DROP POLICY IF EXISTS "tickets organizer update" ON public.tickets;
CREATE POLICY "tickets organizer update" ON public.tickets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = tickets.event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = tickets.event_id AND o.user_id = auth.uid()));

-- 8. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(status);
CREATE INDEX IF NOT EXISTS idx_events_starts_at ON public.events(starts_at);
CREATE INDEX IF NOT EXISTS idx_tiers_event ON public.ticket_tiers(event_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event ON public.tickets(event_id);

-- 9. DADOS INICIAIS (ORGANIZADORES, EVENTOS E LOTES)
DO $$
DECLARE
    v_buyticket_id UUID;
    v_hybe_id UUID;
    v_event_id UUID;
BEGIN
    -- Produtora BuyTicket
    INSERT INTO public.organizers (name, slug, bio)
    VALUES ('BuyTicket Produções', 'buyticket-producoes', 'A maior produtora de eventos do Brasil.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_buyticket_id;

    -- Evento: Samba do Trabalhador
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (v_buyticket_id, 'Samba do Trabalhador', 'samba-do-trabalhador-2026', 'O melhor samba do Rio de Janeiro', 'Venha curtir uma tarde inesquecível com muito samba de raiz e alegria.', 'Shows', 'Rio de Janeiro', 'Renascença Clube', 'Rua Barão de Mesquita, 123', '2026-09-10 17:00:00+00', 'published', true, 'samba')
    ON CONFLICT (slug) DO UPDATE SET status = 'published' RETURNING id INTO v_event_id;

    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
    VALUES (v_event_id, 'Pista Comum', 4000, 500, 500, 1), (v_event_id, 'Área VIP', 12000, 100, 100, 2)
    ON CONFLICT DO NOTHING;

    -- Evento: Brasil Tech Summit
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (v_buyticket_id, 'Brasil Tech Summit', 'brasil-tech-summit-2026', 'Tecnologia e Inovação', 'A maior conferência de tecnologia do país.', 'Cursos', 'São Paulo', 'Expo Center Norte', 'Rua José Bernardo Pinto, 333', '2026-10-15 09:00:00+00', 'published', true, 'tech')
    ON CONFLICT (slug) DO UPDATE SET status = 'published' RETURNING id INTO v_event_id;

    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
    VALUES (v_event_id, 'Ingresso Padrão', 25000, 1000, 1000, 1), (v_event_id, 'Passaporte Premium', 45000, 200, 200, 2)
    ON CONFLICT DO NOTHING;

    -- Produtora HYBE
    INSERT INTO public.organizers (name, slug, bio)
    VALUES ('HYBE Labels', 'hybe-labels', 'Empresa responsável pelo grupo global BTS.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_hybe_id;

    -- Evento: BTS
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url)
    VALUES (v_hybe_id, 'BTS - 2026 World Tour Arirang', 'bts-2026-world-tour-arirang', 'O Retorno Mais Esperado', 'A maior turnê mundial de K-pop desembarca no Brasil.', 'Shows', 'São Paulo', 'Estádio do Morumbis', 'Praça Roberto Gomes Pedrosa, 1', '2026-10-28 20:00:00+00', '2026-10-31 23:59:59+00', 'published', true, 'https://2da743d0613562afbb5c3a87cfff928c.cdn.bubble.io/d291/f1775751641247x238321688655577020/1cc6881c-8a6d-4c11-9b42-d0122e737e45-bts1920x720landing.gif')
    ON CONFLICT (slug) DO UPDATE SET status = 'published' RETURNING id INTO v_event_id;

    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
    VALUES 
        (v_event_id, 'Pista Premium Arirang', 120000, 5000, 5000, 1),
        (v_event_id, 'Pista Comum', 65000, 15000, 15000, 2),
        (v_event_id, 'Cadeira Inferior', 45000, 8000, 8000, 3),
        (v_event_id, 'Cadeira Superior', 35000, 10000, 10000, 4),
        (v_event_id, 'Arquibancada', 25000, 15000, 15000, 5)
    ON CONFLICT DO NOTHING;
END $$;
