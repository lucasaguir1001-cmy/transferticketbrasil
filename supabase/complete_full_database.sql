-- ==============================================================================
-- TRANSFER TICKET BRASIL - SCRIPT UNIFICADO COMPLETO DEFINITIVO (SUPABASE)
-- ==============================================================================
-- Este script limpa com segurança tabelas conflitantes anteriores e recria
-- toda a estrutura completa do banco de dados + catálogo completo de eventos:
--
-- 1. Limpeza segura das tabelas do projeto (sem afetar auth.users)
-- 2. Enums com suporte completo a 'syncpay'
-- 3. Schema 'private' e função 'has_role'
-- 4. Tabelas: profiles, user_roles, organizers, events, ticket_tiers, coupons, orders, order_items, tickets
-- 5. View pública: organizers_public
-- 6. Triggers de atualização e criação de perfil
-- 7. Políticas de Row Level Security (RLS)
-- 8. Carga completa dos eventos (BTS, Iron Maiden, Ed Sheeran, F1, Samba, Tech Summit, etc.)
-- ==============================================================================

-- 1. LIMPEZA SEGURA DE TABELAS E VIEWS ANTERIORES
DROP VIEW IF EXISTS public.organizers_public CASCADE;
DROP TABLE IF EXISTS public.tickets CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;
DROP TABLE IF EXISTS public.ticket_tiers CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.organizers CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. ENUMS
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'user');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'ended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('valid', 'used', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_provider AS ENUM ('stripe', 'mercadopago', 'mock', 'syncpay');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE public.payment_provider ADD VALUE IF NOT EXISTS 'syncpay';
  ALTER TYPE public.payment_provider ADD VALUE IF NOT EXISTS 'mock';
EXCEPTION WHEN others THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.refund_status AS ENUM ('none', 'requested', 'refunded', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.coupon_discount_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 3. SCHEMA PRIVATE & AUTORIZAÇÃO
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
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
     );
$function$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 4. FUNÇÃO AUXILIAR DE TIMESTAMP
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. CRIAÇÃO DAS TABELAS
-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Organizers
CREATE TABLE public.organizers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Events
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
  status public.event_status NOT NULL DEFAULT 'published',
  highlights TEXT[] DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket Tiers
CREATE TABLE public.ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  quantity_total INTEGER NOT NULL DEFAULT 1000 CHECK (quantity_total >= 0),
  quantity_available INTEGER NOT NULL DEFAULT 1000 CHECK (quantity_available >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Coupons
CREATE TABLE public.coupons (
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

-- Orders
CREATE TABLE public.orders (
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

-- Order Items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES public.ticket_tiers(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  unit_fee_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_fee_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets
CREATE TABLE public.tickets (
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

-- 6. VIEW PÚBLICA ORGANIZERS_PUBLIC
CREATE OR REPLACE VIEW public.organizers_public AS
SELECT id, name, slug, bio, avatar_url, created_at
FROM public.organizers;

-- 7. PERMISSÕES DE TABELAS E SCHEMAS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT (id, name, slug, bio, avatar_url, created_at, updated_at) ON public.organizers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;

GRANT SELECT ON public.organizers_public TO anon, authenticated;
GRANT ALL ON public.organizers_public TO service_role;

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

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User Roles Policies
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Organizers Policies
CREATE POLICY "organizers owner read" ON public.organizers FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "organizers owner insert" ON public.organizers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "organizers owner update" ON public.organizers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "organizers owner delete" ON public.organizers FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Events Policies
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
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- Ticket Tiers Policies
CREATE POLICY "tiers public read" ON public.ticket_tiers FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.events e WHERE e.id = ticket_tiers.event_id AND e.status = 'published'::public.event_status));
CREATE POLICY "tiers owner all" ON public.ticket_tiers FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()));

-- Coupons Policies
CREATE POLICY "Organizers manage own coupons" ON public.coupons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = coupons.event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = coupons.event_id AND o.user_id = auth.uid()));

-- Orders Policies
CREATE POLICY "orders owner read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "orders owner insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "orders admin all" ON public.orders FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "orders organizer read" ON public.orders FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t JOIN public.events e ON e.id = t.event_id JOIN public.organizers o ON o.id = e.organizer_id WHERE t.order_id = orders.id AND o.user_id = auth.uid()));

-- Order Items Policies
CREATE POLICY "order items owner read" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order items owner insert" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order items organizer read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ticket_tiers tt JOIN public.events e ON e.id = tt.event_id JOIN public.organizers og ON og.id = e.organizer_id WHERE tt.id = order_items.tier_id AND og.user_id = auth.uid()));

-- Tickets Policies
CREATE POLICY "tickets owner read" ON public.tickets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "tickets organizer read" ON public.tickets FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = event_id AND o.user_id = auth.uid()));
CREATE POLICY "tickets organizer update" ON public.tickets FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = tickets.event_id AND o.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id WHERE e.id = tickets.event_id AND o.user_id = auth.uid()));

-- 9. TRIGGERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = now();
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created_role AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_organizers_updated BEFORE UPDATE ON public.organizers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tiers_updated BEFORE UPDATE ON public.ticket_tiers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER coupons_set_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. ÍNDICES DE PERFORMANCE
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);
CREATE INDEX idx_tiers_event ON public.ticket_tiers(event_id);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);


-- ==============================================================================
-- 11. CARGA COMPLETA DOS ORGANIZADORES E EVENTOS
-- ==============================================================================

-- Organizadores
INSERT INTO public.organizers (name, slug, bio)
VALUES 
  ('Iron Maiden Produções', 'iron-maiden-producoes', 'Official organizer for Iron Maiden World Tour 2026 in Brazil.'),
  ('HYBE Labels', 'hybe-labels', 'The company behind global superstars BTS.'),
  ('Ed Sheeran Produções', 'ed-sheeran-producoes', 'Official organizer for Ed Sheeran Loop Tour 2026 in Brazil.'),
  ('BuyTicket Produções', 'buyticket-producoes', 'A maior produtora de eventos do Brasil.'),
  ('BuyTicket Brasil', 'buyticket-brasil', 'A sua plataforma de ingressos para os melhores eventos.')
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name, 
  bio = EXCLUDED.bio;

-- Evento: BTS
INSERT INTO public.events (
  organizer_id, slug, title, subtitle, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url
)
SELECT
  id,
  'bts-2026-world-tour-arirang',
  'BTS – 2026 World Tour Arirang',
  'The Return of the Kings',
  '🎤 BTS – 2026 World Tour Arirang (São Paulo)

⏰ Horário:
Abertura dos portões: 16h00
Início do show: 20h30

✨ Camarote Enter Experience Open Premium  
Um espaço exclusivo com vista privilegiada do palco, ambiente climatizado, banheiros privativos e serviço completo de Open Bar e Open Food premium, incluindo bebidas como Whisky Macallan 12 Anos, Gin Roku, Vodka Haku e drinks especiais.

🌍 O fenômeno global BTS está de volta!  
Após o lançamento do aguardado álbum ARIRANG, RM, Jin, SUGA, j-hope, Jimin, V e Jung Kook retornam ao Brasil para três apresentações históricas no Estádio MorumBIS. O reencontro oficial com o ARMY brasileiro promete uma megaestrutura de nível mundial e a energia inconfundível dos maiores ícones pop do século XXI.

🔑 Acesso e Transferência:
O comprador acessa o espetáculo com o QR Code do ingresso digital e documento oficial com foto. Ingresso digital entregue via aplicativo Quentro (Android e iOS).

💲 Sobre os valores:  
A TransferTicketBrasil é um marketplace secundário: os preços são estabelecidos pelos vendedores com base na oferta, demanda e localização do assento.',
  'Shows',
  'São Paulo',
  'Estádio do Morumbis',
  'Praça Roberto Gomes Pedrosa, 1 - Morumbi, São Paulo - SP',
  '2026-10-28 20:00:00+00',
  '2026-10-31 23:59:59+00',
  'published',
  true,
  'https://2da743d0613562afbb5c3a87cfff928c.cdn.bubble.io/d291/f1775751641247x238321688655577020/1cc6881c-8a6d-4c11-9b42-d0122e737e45-bts1920x720landing.gif'
FROM public.organizers WHERE slug = 'hybe-labels'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

-- Lotes BTS (inseridos buscando dinamicamente o ID do evento por slug)
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('Arquibancada', 'Visão panorâmica do estádio Morumbis', 330000, 33000, 27, 27, 1),
    ('Cadeira Superior', 'Excelente visão elevada com assentos numerados', 373000, 37300, 24, 24, 2),
    ('Cadeira Inferior', 'Próximo ao campo e visão lateral do palco', 605000, 60500, 7, 7, 3),
    ('Pista', 'Acesso à pista com visão frontal do palco', 385000, 38500, 44, 44, 4),
    ('Camarote Ídolos', 'Camarote com vista privilegiada e serviços exclusivos', 495000, 49500, 26, 26, 5),
    ('Camarote Stadium', 'Experiência máxima VIP com open bar e open food', 924000, 92400, 2, 2, 6)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'bts-2026-world-tour-arirang';

-- Evento: Iron Maiden SP (25/10)
INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'iron-maiden-sao-paulo-25-10',
  'Iron Maiden - Run For Your Lives World Tour 2026 - São Paulo',
  'Iron Maiden traz a lendária turnê Run For Your Lives World Tour 2026 para São Paulo! Uma noite histórica com convidados especiais.',
  'Shows',
  'São Paulo',
  'Allianz Parque',
  'Av. Francisco Matarazzo, 1705 - Água Branca, São Paulo - SP',
  '2026-10-25 16:00:00+00',
  'published',
  true,
  'https://access-ace-finder.lovable.app/__l5e/assets-v1/eb58a984-75eb-42d8-967a-115f013d508e/iron-maiden-banner.png'
FROM public.organizers WHERE slug = 'iron-maiden-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

-- Lotes Iron Maiden SP (25/10)
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('PISTA PREMIUM', 'Área colada no palco com acesso exclusivo', 143000, 14300, 8, 8, 1),
    ('PISTA', 'Área de pista geral com visão frontal', 61100, 6110, 9, 9, 2),
    ('CADEIRA NÍVEL 1 LATERAL', 'Cadeiras cobertas com visão lateral perfeita', 82500, 8250, 17, 17, 3),
    ('CADEIRA NÍVEL 1 CENTRAL', 'Cadeiras cobertas na área nobre central', 77000, 7700, 3, 3, 4),
    ('CADEIRA SUPERIOR', 'Visão panorâmica com assento garantido', 55000, 5500, 9, 9, 5)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'iron-maiden-sao-paulo-25-10';

-- Evento: Iron Maiden SP Extra (27/10)
INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'iron-maiden-sao-paulo-27-10',
  'Iron Maiden - Run For Your Lives World Tour 2026 - São Paulo (Data Extra)',
  'Data extra confirmada! Iron Maiden traz a Run For Your Lives World Tour 2026 para São Paulo.',
  'Shows',
  'São Paulo',
  'Allianz Parque',
  'Av. Francisco Matarazzo, 1705 - Água Branca, São Paulo - SP',
  '2026-10-27 16:00:00+00',
  'published',
  false,
  'https://access-ace-finder.lovable.app/__l5e/assets-v1/eb58a984-75eb-42d8-967a-115f013d508e/iron-maiden-banner.png'
FROM public.organizers WHERE slug = 'iron-maiden-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

-- Lotes Iron Maiden SP Extra
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('Pista Premium', 'Área exclusiva em frente ao palco', 120000, 12000, 1000, 1000, 1),
    ('Pista', 'Acesso à pista geral', 60000, 6000, 5000, 5000, 2),
    ('Cadeira Inferior', 'Cadeiras no anel inferior', 75000, 7500, 3000, 3000, 3),
    ('Cadeira Superior', 'Cadeiras no anel superior', 35000, 3500, 4000, 4000, 4)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'iron-maiden-sao-paulo-27-10';

-- Evento: Iron Maiden Curitiba (28/10)
INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'iron-maiden-curitiba-28-10',
  'Iron Maiden - Run For Your Lives World Tour 2026 - Curitiba',
  'Iron Maiden traz a Run For Your Lives World Tour 2026 para Curitiba! Um show monumental na Arena da Baixada.',
  'Shows',
  'Curitiba',
  'Arena da Baixada',
  'Rua Buenos Aires, 1260 - Água Verde, Curitiba - PR',
  '2026-10-28 19:10:00+00',
  'published',
  true,
  'https://access-ace-finder.lovable.app/__l5e/assets-v1/eb58a984-75eb-42d8-967a-115f013d508e/iron-maiden-banner.png'
FROM public.organizers WHERE slug = 'iron-maiden-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

-- Lotes Iron Maiden Curitiba
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('Pista Premium', 'Área próxima ao palco', 110000, 11000, 800, 800, 1),
    ('Pista', 'Pista comum Arena da Baixada', 55000, 5500, 4000, 4000, 2),
    ('Cadeira Inferior', 'Cadeiras inferiores cobertas', 70000, 7000, 2500, 2500, 3),
    ('Cadeira Superior', 'Cadeiras superiores', 32000, 3200, 3500, 3500, 4)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'iron-maiden-curitiba-28-10';

-- Eventos: Ed Sheeran (05/12 e 06/12)
INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'ed-sheeran-loop-tour-sp-dec-05',
  'Ed Sheeran - Loop Tour - 2026',
  'Ed Sheeran traz a aclamada Loop Tour para o Brasil em 2026. Prepare-se para uma experiência única no Allianz Parque.',
  'Shows',
  'São Paulo',
  'Allianz Parque',
  'Av. Francisco Matarazzo, 1705 - Água Branca, São Paulo - SP',
  '2026-12-05 20:00:00+00',
  'published',
  true,
  'https://id-preview--b13507ba-683c-4600-b47b-060b76660927.lovable.app/__l5e/assets-v1/56d45311-5674-454d-bde2-8f1783249a3c/ed-sheeran-banner.png'
FROM public.organizers WHERE slug = 'ed-sheeran-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('Pista Premium', 'Acesso privilegiado próximo ao palco giratório', 85000, 8500, 218, 218, 1),
    ('Pista', 'Acesso geral na pista do estádio', 45000, 4500, 500, 500, 2)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'ed-sheeran-loop-tour-sp-dec-05';

INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'ed-sheeran-loop-tour-sp-dec-06',
  'Ed Sheeran - Loop Tour - 2026 (Data Extra)',
  'Data extra confirmada! Ed Sheeran traz a aclamada Loop Tour para o Brasil em 2026 no Allianz Parque.',
  'Shows',
  'São Paulo',
  'Allianz Parque',
  'Av. Francisco Matarazzo, 1705 - Água Branca, São Paulo - SP',
  '2026-12-06 20:00:00+00',
  'published',
  true,
  'https://id-preview--b13507ba-683c-4600-b47b-060b76660927.lovable.app/__l5e/assets-v1/56d45311-5674-454d-bde2-8f1783249a3c/ed-sheeran-banner.png'
FROM public.organizers WHERE slug = 'ed-sheeran-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('Pista Premium', 'Acesso privilegiado próximo ao palco giratório', 85000, 8500, 50, 50, 1),
    ('Pista', 'Acesso geral na pista do estádio', 45000, 4500, 500, 500, 2)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'ed-sheeran-loop-tour-sp-dec-06';

-- Eventos: Fórmula 1 2026 (Passaportes, Sexta, Sábado, Domingo)
INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url
)
SELECT
  id,
  'f1-2026-passaportes',
  'Fórmula 1 2026 - Passaportes',
  'Passaporte para os 3 dias de Grande Prêmio de São Paulo 2026.',
  'Esportes',
  'São Paulo',
  'Autódromo de Interlagos',
  'Av. Sen. Teotônio Vilela, 261 - Interlagos, São Paulo - SP',
  '2026-11-06 08:00:00+00',
  '2026-11-08 20:00:00+00',
  'published',
  true,
  'https://access-ace-finder.lovable.app/__l5e/assets-v1/bfa09637-3bca-406e-886f-10b8fdd846af/f1-hero.png'
FROM public.organizers WHERE slug = 'buyticket-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, 'Passaporte 3 Dias', 'Acesso aos dias 06, 07 e 08 de Novembro', 250000, 25000, 100, 100, 1
FROM public.events e WHERE e.slug = 'f1-2026-passaportes';

INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url
)
SELECT
  id,
  'f1-2026-sexta',
  'Fórmula 1 2026 - Sexta',
  'Treinos Livres - Grande Prêmio de São Paulo 2026.',
  'Esportes',
  'São Paulo',
  'Autódromo de Interlagos',
  'Av. Sen. Teotônio Vilela, 261 - Interlagos, São Paulo - SP',
  '2026-11-06 08:00:00+00',
  '2026-11-06 18:00:00+00',
  'published',
  true,
  'https://access-ace-finder.lovable.app/__l5e/assets-v1/bfa09637-3bca-406e-886f-10b8fdd846af/f1-hero.png'
FROM public.organizers WHERE slug = 'buyticket-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, 'Ingresso Individual - Sexta', 'Acesso apenas na sexta-feira aos treinos livres', 80000, 8000, 81, 81, 1
FROM public.events e WHERE e.slug = 'f1-2026-sexta';

INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url
)
SELECT
  id,
  'f1-2026-sabado',
  'Fórmula 1 2026 - Sábado',
  'Treino Classificatório - Grande Prêmio de São Paulo 2026.',
  'Esportes',
  'São Paulo',
  'Autódromo de Interlagos',
  'Av. Sen. Teotônio Vilela, 261 - Interlagos, São Paulo - SP',
  '2026-11-07 08:00:00+00',
  '2026-11-07 18:00:00+00',
  'published',
  true,
  'https://access-ace-finder.lovable.app/__l5e/assets-v1/bfa09637-3bca-406e-886f-10b8fdd846af/f1-hero.png'
FROM public.organizers WHERE slug = 'buyticket-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, 'Ingresso Individual - Sábado', 'Acesso apenas no sábado ao treino classificatório', 120000, 12000, 72, 72, 1
FROM public.events e WHERE e.slug = 'f1-2026-sabado';

INSERT INTO public.events (
  organizer_id, slug, title, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url
)
SELECT
  id,
  'f1-2026-domingo',
  'Fórmula 1 2026 - Domingo',
  'Corrida - Grande Prêmio de São Paulo 2026.',
  'Esportes',
  'São Paulo',
  'Autódromo de Interlagos',
  'Av. Sen. Teotônio Vilela, 261 - Interlagos, São Paulo - SP',
  '2026-11-08 08:00:00+00',
  '2026-11-08 18:00:00+00',
  'published',
  true,
  'https://access-ace-finder.lovable.app/__l5e/assets-v1/bfa09637-3bca-406e-886f-10b8fdd846af/f1-hero.png'
FROM public.organizers WHERE slug = 'buyticket-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, 'Ingresso Individual - Domingo', 'Acesso apenas no domingo para o grande dia da corrida', 150000, 15000, 117, 117, 1
FROM public.events e WHERE e.slug = 'f1-2026-domingo';

-- Eventos Gerais (Samba, Tech Summit, Copa do Brasil, Festival de Verão)
INSERT INTO public.events (
  organizer_id, slug, title, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'samba-do-trabalhador-2026',
  'Samba do Trabalhador',
  'O melhor samba do Rio de Janeiro',
  'Venha curtir uma tarde inesquecível com muito samba de raiz e alegria.',
  'Shows',
  'Rio de Janeiro',
  'Renascença Clube',
  'Rua Barão de Mesquita, 123 - Andaraí, Rio de Janeiro - RJ',
  '2026-09-10 17:00:00+00',
  'published',
  false,
  'samba'
FROM public.organizers WHERE slug = 'buyticket-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('Pista Comum', 'Acesso ao setor geral', 4000, 400, 500, 500, 1),
    ('Área VIP', 'Acesso à área VIP com bar exclusivo', 12000, 1200, 100, 100, 2)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'samba-do-trabalhador-2026';

INSERT INTO public.events (
  organizer_id, slug, title, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'brasil-tech-summit-2026',
  'Brasil Tech Summit',
  'Tecnologia e Inovação',
  'A maior conferência de tecnologia do país, reunindo os maiores especialistas da área.',
  'Cursos',
  'São Paulo',
  'Expo Center Norte',
  'Rua José Bernardo Pinto, 333 - Vila Guilherme, São Paulo - SP',
  '2026-10-15 09:00:00+00',
  'published',
  false,
  'tech'
FROM public.organizers WHERE slug = 'buyticket-producoes'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, t.name, t.description, t.price_cents, t.fee_cents, t.quantity_total, t.quantity_available, t.sort_order
FROM public.events e
CROSS JOIN (
  VALUES
    ('Ingresso Padrão', 'Acesso a todas as palestras dos 2 dias', 25000, 2500, 1000, 1000, 1),
    ('Passaporte Premium', 'Acesso VIP, lounge executivo e workshops', 45000, 4500, 200, 200, 2)
) AS t(name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
WHERE e.slug = 'brasil-tech-summit-2026';

INSERT INTO public.events (
  organizer_id, slug, title, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'final-copa-do-brasil-2026',
  'Final Copa do Brasil 2026',
  'O jogo do ano',
  'Acompanhe a grande decisão do torneio mais democrático do país em uma atmosfera eletrizante.',
  'Esportes',
  'Rio de Janeiro',
  'Maracanã',
  'Av. Pres. Castelo Branco, Portão 3 - Maracanã, Rio de Janeiro - RJ',
  '2026-11-22 16:00:00+00',
  'published',
  false,
  'football'
FROM public.organizers WHERE slug = 'buyticket-brasil'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, 'Arquibancada Central', 'Acesso à grande decisão da Copa do Brasil', 30000, 3000, 20000, 20000, 1
FROM public.events e WHERE e.slug = 'final-copa-do-brasil-2026';

INSERT INTO public.events (
  organizer_id, slug, title, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url
)
SELECT
  id,
  'festival-de-verao-buyticket-2026',
  'Festival de Verão BuyTicket',
  'O maior festival do litoral',
  'Três dias de música, praia e curtição com as maiores estrelas do Brasil.',
  'Festivais',
  'Salvador',
  'Arena Fonte Nova',
  'Ladeira da Fonte das Pedras, s/n - Nazaré, Salvador - BA',
  '2026-12-15 14:00:00+00',
  'published',
  false,
  'sertanejo'
FROM public.organizers WHERE slug = 'buyticket-brasil'
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  description = EXCLUDED.description,
  starts_at = EXCLUDED.starts_at,
  status = EXCLUDED.status,
  featured = EXCLUDED.featured,
  image_url = EXCLUDED.image_url;

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
SELECT e.id, 'Passaporte 3 Dias', 'Acesso a todos os 3 dias do festival', 80000, 8000, 5000, 5000, 1
FROM public.events e WHERE e.slug = 'festival-de-verao-buyticket-2026';

-- ==============================================================================
-- FIM DO SCRIPT - BANCO DE DADOS CONFIGURADO COM SUCESSO!
-- ==============================================================================
