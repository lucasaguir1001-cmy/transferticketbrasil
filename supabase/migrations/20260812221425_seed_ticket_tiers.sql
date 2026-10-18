-- Add ticket tiers to seeded events
DO $$ 
DECLARE
    v_event_id UUID;
BEGIN
    -- For Samba
    SELECT id INTO v_event_id FROM public.events WHERE slug = 'samba-do-trabalhador-2026';
    IF v_event_id IS NOT NULL THEN
        INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
        VALUES 
            (v_event_id, 'Pista Comum', 4000, 500, 1),
            (v_event_id, 'Área VIP', 12000, 100, 2);
    END IF;

    -- For Tech Summit
    SELECT id INTO v_event_id FROM public.events WHERE slug = 'brasil-tech-summit-2026';
    IF v_event_id IS NOT NULL THEN
        INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_available, sort_order)
        VALUES 
            (v_event_id, 'Ingresso Padrão', 25000, 1000, 1),
            (v_event_id, 'Passaporte Premium', 45000, 200, 2);
    END IF;
END $$;
