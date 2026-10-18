-- Seeding more events from buyticketbrasil.com patterns
DO $$ 
DECLARE
    v_organizer_id UUID;
BEGIN
    -- Ensure organizer exists
    INSERT INTO public.organizers (name, slug, email, bio)
    VALUES ('BuyTicket Brasil', 'buyticket-brasil', 'suporte@buyticketbrasil.com', 'A sua plataforma de ingressos para os melhores eventos.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_organizer_id;

    -- Event 1: Zayn Konnakol Tour (Found in scrape)
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'Zayn Konnakol Tour', 
        'zayn-konnakol-tour-2026', 
        'Uma jornada musical única', 
        'Prepare-se para uma experiência transcendental com a turnê Zayn Konnakol, unindo ritmos ancestrais e sonoridades contemporâneas.', 
        'Shows', 
        'São Paulo', 
        'Allianz Parque', 
        'Av. Francisco Matarazzo, 1705', 
        '2026-10-10 22:00:00+00', 
        'published', 
        true,
        'electronic'
    );

    -- Event 2: Festival de Verão BuyTicket
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'Festival de Verão BuyTicket', 
        'festival-de-verao-buyticket-2026', 
        'O maior festival do litoral', 
        'Três dias de música, praia e curtição com as maiores estrelas do Brasil.', 
        'Festivais', 
        'Salvador', 
        'Arena Fonte Nova', 
        'Ladeira da Fonte das Pedras, s/n', 
        '2026-12-15 14:00:00+00', 
        'published', 
        true,
        'sertanejo'
    );

    -- Event 3: O Fantasma da Ópera
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'O Fantasma da Ópera', 
        'o-fantasma-da-opera-brasil', 
        'O clássico dos clássicos', 
        'O musical mais famoso do mundo volta ao Brasil para uma temporada curta e emocionante.', 
        'Teatro', 
        'São Paulo', 
        'Teatro Renault', 
        'Av. Brigadeiro Luís Antônio, 411', 
        '2026-09-05 20:00:00+00', 
        'published', 
        false,
        'comedy'
    );

    -- Event 4: Final da Copa do Brasil
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'Final Copa do Brasil 2026', 
        'final-copa-do-brasil-2026', 
        'O jogo do ano', 
        'Acompanhe a grande decisão do torneio mais democrático do país em uma atmosfera eletrizante.', 
        'Esportes', 
        'Rio de Janeiro', 
        'Maracanã', 
        'Av. Pres. Castelo Branco, Portão 3', 
        '2026-11-22 16:00:00+00', 
        'published', 
        true,
        'football'
    );

    -- Add Tiers for Zayn
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
    SELECT id, 'Pista Premium', 45000, 200, 1 FROM public.events WHERE slug = 'zayn-konnakol-tour-2026';
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
    SELECT id, 'Pista Comum', 22000, 1000, 2 FROM public.events WHERE slug = 'zayn-konnakol-tour-2026';

    -- Add Tiers for Festival
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
    SELECT id, 'Passaporte 3 Dias', 80000, 5000, 1 FROM public.events WHERE slug = 'festival-de-verao-buyticket-2026';

    -- Add Tiers for Teatro
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
    SELECT id, 'Setor A', 35000, 300, 1 FROM public.events WHERE slug = 'o-fantasma-da-opera-brasil';

    -- Add Tiers for Football
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
    SELECT id, 'Arquibancada Central', 30000, 20000, 1 FROM public.events WHERE slug = 'final-copa-do-brasil-2026';

END $$;
