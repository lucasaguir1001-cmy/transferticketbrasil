-- Adding ticket tiers for Ed Sheeran Dec 05
INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
VALUES 
((SELECT id FROM public.events WHERE slug = 'ed-sheeran-loop-tour-sp-dec-05' LIMIT 1), 'Pista Premium', 85000, 218, 218, 1),
((SELECT id FROM public.events WHERE slug = 'ed-sheeran-loop-tour-sp-dec-05' LIMIT 1), 'Pista', 45000, 500, 500, 2);

-- Adding ticket tiers for Ed Sheeran Dec 06
INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
VALUES 
((SELECT id FROM public.events WHERE slug = 'ed-sheeran-loop-tour-sp-dec-06' LIMIT 1), 'Pista Premium', 85000, 50, 50, 1),
((SELECT id FROM public.events WHERE slug = 'ed-sheeran-loop-tour-sp-dec-06' LIMIT 1), 'Pista', 45000, 500, 500, 2);
