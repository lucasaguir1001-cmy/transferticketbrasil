DO $$
DECLARE
    v_organizer_id UUID := '79974bc0-9240-4783-b6b2-48804773fad7'; -- HYBE Labels
    v_event_id UUID;
BEGIN
    -- Create the event for Oct 28
    INSERT INTO public.events (
        title, 
        slug, 
        description, 
        starts_at, 
        venue, 
        city, 
        image_url, 
        organizer_id, 
        featured, 
        status, 
        category
    ) VALUES (
        'BTS - 2026 World Tour Arirang',
        'bts-2026-world-tour-arirang-oct-28',
        'The most anticipated world tour of the decade.',
        '2026-10-28 20:00:00+00',
        'Estádio do Morumbis',
        'São Paulo',
        'https://2da743d0613562afbb5c3a87cfff928c.cdn.bubble.io/d291/f1775751641247x238321688655577020/1cc6881c-8a6d-4c11-9b42-d0122e737e45-bts1920x720landing.gif',
        v_organizer_id,
        true,
        'published',
        'Concertos'
    ) RETURNING id INTO v_event_id;

    -- Add ticket tiers for this event
    INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
    VALUES 
        (v_event_id, 'Pista Premium Arirang', 120000, 5000, 5000, 1),
        (v_event_id, 'Pista Comum', 65000, 15000, 15000, 2),
        (v_event_id, 'Cadeira Inferior', 45000, 8000, 8000, 3),
        (v_event_id, 'Cadeira Superior', 35000, 10000, 10000, 4),
        (v_event_id, 'Arquibancada', 25000, 15000, 15000, 5);
END $$;