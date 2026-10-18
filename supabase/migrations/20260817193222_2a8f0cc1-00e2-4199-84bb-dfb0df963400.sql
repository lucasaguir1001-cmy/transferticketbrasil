-- 1. Remover eventos específicos
DELETE FROM public.events WHERE id IN ('7cae4dd6-45b4-44d3-86cc-5df974152153', 'b9015963-0505-4ca0-8cd3-3eb46d41c7c2');

-- 2. Replicar evento BTS para o dia 30 de Agosto de 2026
DO $$
DECLARE
    original_event_id UUID := 'd301b0a8-9cc1-4996-8ba3-d9dc09e5af90';
    new_event_30_id UUID := gen_random_uuid();
    new_event_31_id UUID := gen_random_uuid();
BEGIN
    -- Criar evento para dia 30
    INSERT INTO public.events (
        id, title, subtitle, description, slug, image_url, 
        starts_at, ends_at, venue, city, address, 
        organizer_id, category, featured, status
    )
    SELECT 
        new_event_30_id, title, subtitle, description, 'bts-2026-world-tour-30-aug', image_url, 
        '2026-08-30 20:00:00+00', '2026-08-30 23:59:59+00', venue, city, address, 
        organizer_id, category, featured, status
    FROM public.events WHERE id = original_event_id;

    -- Replicar tiers para dia 30
    INSERT INTO public.ticket_tiers (
        event_id, name, description, price_cents, fee_cents, 
        quantity_total, quantity_available, sort_order
    )
    SELECT 
        new_event_30_id, name, description, price_cents, fee_cents, 
        quantity_total, quantity_total, sort_order
    FROM public.ticket_tiers WHERE event_id = original_event_id;

    -- Criar evento para dia 31
    INSERT INTO public.events (
        id, title, subtitle, description, slug, image_url, 
        starts_at, ends_at, venue, city, address, 
        organizer_id, category, featured, status
    )
    SELECT 
        new_event_31_id, title, subtitle, description, 'bts-2026-world-tour-31-aug', image_url, 
        '2026-08-31 20:00:00+00', '2026-08-31 23:59:59+00', venue, city, address, 
        organizer_id, category, featured, status
    FROM public.events WHERE id = original_event_id;

    -- Replicar tiers para dia 31
    INSERT INTO public.ticket_tiers (
        event_id, name, description, price_cents, fee_cents, 
        quantity_total, quantity_available, sort_order
    )
    SELECT 
        new_event_31_id, name, description, price_cents, fee_cents, 
        quantity_total, quantity_total, sort_order
    FROM public.ticket_tiers WHERE event_id = original_event_id;
END $$;
