-- Add BTS World Tour Arirang
DO $$ 
DECLARE
    v_organizer_id UUID;
    v_event_id UUID;
BEGIN
    -- Ensure organizer exists
    INSERT INTO public.organizers (name, slug, email, bio)
    VALUES ('HYBE Labels', 'hybe-labels', 'support@hybe.com', 'The company behind global superstars BTS.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_organizer_id;

    -- Create Event
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, ends_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'BTS - 2026 World Tour Arirang', 
        'bts-2026-world-tour-arirang', 
        'The Return of the Kings', 
        'The most anticipated world tour of the decade. BTS returns to Brazil for a historic residency at Estádio do Morumbis.', 
        'Shows', 
        'São Paulo', 
        'Estádio do Morumbis', 
        'Praça Roberto Gomes Pedrosa, 1 - Morumbi', 
        '2026-10-28 20:00:00+00', 
        '2026-10-31 23:59:59+00', 
        'published', 
        true,
        'https://2da743d0613562afbb5c3a87cfff928c.cdn.bubble.io/d291/f1775751641247x238321688655577020/1cc6881c-8a6d-4c11-9b42-d0122e737e45-bts1920x720landing.gif'
    )
    ON CONFLICT (slug) DO UPDATE SET image_url = EXCLUDED.image_url
    RETURNING id INTO v_event_id;

    -- Add Tiers (Estimated based on standard stadium tour prices in Brazil)
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
    VALUES 
        (v_event_id, 'Pista Premium Arirang', 120000, 5000, 1),
        (v_event_id, 'Pista Comum', 65000, 15000, 2),
        (v_event_id, 'Cadeira Inferior', 45000, 8000, 3),
        (v_event_id, 'Cadeira Superior', 35000, 10000, 4),
        (v_event_id, 'Arquibancada', 25000, 15000, 5)
    ON CONFLICT DO NOTHING;

END $$;
