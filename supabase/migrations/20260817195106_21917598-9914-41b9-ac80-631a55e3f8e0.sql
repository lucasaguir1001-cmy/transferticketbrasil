DO $$
DECLARE
    org_id UUID;
    f1_image_url TEXT := 'https://access-ace-finder.lovable.app/__l5e/assets-v1/bfa09637-3bca-406e-886f-10b8fdd846af/f1-hero.png';
BEGIN
    SELECT id INTO org_id FROM public.organizers WHERE slug = 'buyticket-producoes' LIMIT 1;
    
    IF org_id IS NULL THEN
        INSERT INTO public.organizers (name, slug)
        VALUES ('BuyTicket Produções', 'buyticket-producoes')
        RETURNING id INTO org_id;
    END IF;

    -- Clean up previous attempts if any
    DELETE FROM public.ticket_tiers WHERE event_id IN (SELECT id FROM public.events WHERE slug LIKE 'f1-2026-%');
    DELETE FROM public.events WHERE slug LIKE 'f1-2026-%';

    -- 1. Passaportes
    INSERT INTO public.events (title, slug, category, city, venue, address, starts_at, ends_at, image_url, organizer_id, status, featured, description)
    VALUES ('Fórmula 1 2026 - Passaportes', 'f1-2026-passaportes', 'Esportes', 'São Paulo', 'Autódromo de Interlagos', 'Av. Sen. Teotônio Vilela, 261', '2026-11-06 08:00:00', '2026-11-08 20:00:00', f1_image_url, org_id, 'published', true, 'Passaporte para os 3 dias de Grande Prêmio de São Paulo 2026.');

    INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
    VALUES ((SELECT id FROM public.events WHERE slug = 'f1-2026-passaportes'), 'Passaporte 3 Dias', 'Acesso aos dias 06, 07 e 08 de Novembro', 250000, 25000, 100, 100, 1);

    -- 2. Sexta-feira
    INSERT INTO public.events (title, slug, category, city, venue, address, starts_at, ends_at, image_url, organizer_id, status, featured, description)
    VALUES ('Fórmula 1 2026 - Sexta', 'f1-2026-sexta', 'Esportes', 'São Paulo', 'Autódromo de Interlagos', 'Av. Sen. Teotônio Vilela, 261', '2026-11-06 08:00:00', '2026-11-06 18:00:00', f1_image_url, org_id, 'published', true, 'Treinos Livres - Grande Prêmio de São Paulo 2026.');

    INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
    VALUES ((SELECT id FROM public.events WHERE slug = 'f1-2026-sexta'), 'Ingresso Individual - Sexta', 'Acesso apenas na sexta-feira', 80000, 8000, 81, 81, 1);

    -- 3. Sábado
    INSERT INTO public.events (title, slug, category, city, venue, address, starts_at, ends_at, image_url, organizer_id, status, featured, description)
    VALUES ('Fórmula 1 2026 - Sábado', 'f1-2026-sabado', 'Esportes', 'São Paulo', 'Autódromo de Interlagos', 'Av. Sen. Teotônio Vilela, 261', '2026-11-07 08:00:00', '2026-11-07 18:00:00', f1_image_url, org_id, 'published', true, 'Treino Classificatório - Grande Prêmio de São Paulo 2026.');

    INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
    VALUES ((SELECT id FROM public.events WHERE slug = 'f1-2026-sabado'), 'Ingresso Individual - Sábado', 'Acesso apenas no sábado', 120000, 12000, 72, 72, 1);

    -- 4. Domingo
    INSERT INTO public.events (title, slug, category, city, venue, address, starts_at, ends_at, image_url, organizer_id, status, featured, description)
    VALUES ('Fórmula 1 2026 - Domingo', 'f1-2026-domingo', 'Esportes', 'São Paulo', 'Autódromo de Interlagos', 'Av. Sen. Teotônio Vilela, 261', '2026-11-08 08:00:00', '2026-11-08 18:00:00', f1_image_url, org_id, 'published', true, 'Corrida - Grande Prêmio de São Paulo 2026.');

    INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
    VALUES ((SELECT id FROM public.events WHERE slug = 'f1-2026-domingo'), 'Ingresso Individual - Domingo', 'Acesso apenas no domingo', 150000, 15000, 117, 117, 1);
END $$;