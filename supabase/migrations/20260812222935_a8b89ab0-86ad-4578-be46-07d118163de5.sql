
-- Correction: Add events with correct columns (email does not exist in organizers)

DO $$ 
DECLARE
    v_buyticket_id UUID;
    v_hybe_id UUID;
    v_event_id UUID;
BEGIN
    -- 1. Organizer: BuyTicket Produções
    INSERT INTO public.organizers (name, slug, bio)
    VALUES ('BuyTicket Produções', 'buyticket-producoes', 'A maior produtora de eventos do Brasil.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_buyticket_id;

    -- Events for BuyTicket Produções
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (v_buyticket_id, 'Samba do Trabalhador', 'samba-do-trabalhador-2026', 'O melhor samba do Rio de Janeiro', 'Venha curtir uma tarde inesquecível com muito samba de raiz e alegria.', 'Shows', 'Rio de Janeiro', 'Renascença Clube', 'Rua Barão de Mesquita, 123', '2026-09-10 17:00:00+00', 'published', true, 'samba')
    ON CONFLICT (slug) DO UPDATE SET status = 'published' RETURNING id INTO v_event_id;
    
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
    VALUES (v_event_id, 'Pista Comum', 4000, 500, 500, 1), (v_event_id, 'Área VIP', 12000, 100, 100, 2)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (v_buyticket_id, 'Brasil Tech Summit', 'brasil-tech-summit-2026', 'Tecnologia e Inovação', 'A maior conferência de tecnologia do país.', 'Cursos', 'São Paulo', 'Expo Center Norte', 'Rua José Bernardo Pinto, 333', '2026-10-15 09:00:00+00', 'published', true, 'tech')
    ON CONFLICT (slug) DO UPDATE SET status = 'published' RETURNING id INTO v_event_id;

    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
    VALUES (v_event_id, 'Ingresso Padrão', 25000, 1000, 1000, 1), (v_event_id, 'Passaporte Premium', 45000, 200, 200, 2)
    ON CONFLICT DO NOTHING;

    -- 2. Organizer: HYBE Labels
    INSERT INTO public.organizers (name, slug, bio)
    VALUES ('HYBE Labels', 'hybe-labels', 'The company behind global superstars BTS.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_hybe_id;

    -- BTS Event
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url)
    VALUES (v_hybe_id, 'BTS - 2026 World Tour Arirang', 'bts-2026-world-tour-arirang', 'The Return of the Kings', 'The most anticipated world tour of the decade.', 'Shows', 'São Paulo', 'Estádio do Morumbis', 'Praça Roberto Gomes Pedrosa, 1', '2026-10-28 20:00:00+00', '2026-10-31 23:59:59+00', 'published', true, 'https://2da743d0613562afbb5c3a87cfff928c.cdn.bubble.io/d291/f1775751641247x238321688655577020/1cc6881c-8a6d-4c11-9b42-d0122e737e45-bts1920x720landing.gif')
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
