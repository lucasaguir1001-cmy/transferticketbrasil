-- First, ensure the organizer exists using the unique slug
INSERT INTO public.organizers (name, slug, bio)
VALUES ('Iron Maiden Produções', 'iron-maiden-producoes', 'Official organizer for Iron Maiden World Tour 2026 in Brazil.')
ON CONFLICT (slug) DO UPDATE SET bio = EXCLUDED.bio, name = EXCLUDED.name;

-- Event 1: São Paulo (25/10/2026)
INSERT INTO public.events (
    title, slug, description, starts_at, city, venue, category, organizer_id, 
    image_url, status, featured
) 
SELECT 
    'Iron Maiden - Run For Your Lives World Tour 2026 - São Paulo',
    'iron-maiden-sao-paulo-25-10',
    'Iron Maiden brings the Run For Your Lives World Tour 2026 to São Paulo! A legendary night with special guests Alter Bridge.',
    '2026-10-25 20:00:00+00',
    'São Paulo',
    'Allianz Parque',
    'Shows',
    id,
    'https://access-ace-finder.lovable.app/__l5e/assets-v1/eb58a984-75eb-42d8-967a-115f013d508e/iron-maiden-banner.png',
    'published',
    true
FROM public.organizers WHERE slug = 'iron-maiden-producoes'
ON CONFLICT (slug) DO NOTHING;

-- Event 2: São Paulo (27/10/2026)
INSERT INTO public.events (
    title, slug, description, starts_at, city, venue, category, organizer_id, 
    image_url, status, featured
) 
SELECT 
    'Iron Maiden - Run For Your Lives World Tour 2026 - São Paulo (Data Extra)',
    'iron-maiden-sao-paulo-27-10',
    'Iron Maiden brings the Run For Your Lives World Tour 2026 to São Paulo! Extra date due to high demand.',
    '2026-10-27 20:00:00+00',
    'São Paulo',
    'Allianz Parque',
    'Shows',
    id,
    'https://access-ace-finder.lovable.app/__l5e/assets-v1/eb58a984-75eb-42d8-967a-115f013d508e/iron-maiden-banner.png',
    'published',
    false
FROM public.organizers WHERE slug = 'iron-maiden-producoes'
ON CONFLICT (slug) DO NOTHING;

-- Event 3: Curitiba (28/10/2026)
INSERT INTO public.events (
    title, slug, description, starts_at, city, venue, category, organizer_id, 
    image_url, status, featured
) 
SELECT 
    'Iron Maiden - Run For Your Lives World Tour 2026 - Curitiba',
    'iron-maiden-curitiba-28-10',
    'Iron Maiden brings the Run For Your Lives World Tour 2026 to Curitiba! A monumental show at Arena da Baixada.',
    '2026-10-28 20:00:00+00',
    'Curitiba',
    'Arena da Baixada',
    'Shows',
    id,
    'https://access-ace-finder.lovable.app/__l5e/assets-v1/eb58a984-75eb-42d8-967a-115f013d508e/iron-maiden-banner.png',
    'published',
    true
FROM public.organizers WHERE slug = 'iron-maiden-producoes'
ON CONFLICT (slug) DO NOTHING;

-- Add tickets for São Paulo (25/10)
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, quantity_total, quantity_available)
SELECT id, 'Pista Premium', 'Area closest to the stage', 120000, 1000, 1000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-25-10'
UNION ALL
SELECT id, 'Pista', 'General admission floor', 60000, 5000, 5000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-25-10'
UNION ALL
SELECT id, 'Cadeira Inferior', 'Lower level seats', 75000, 3000, 3000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-25-10'
UNION ALL
SELECT id, 'Cadeira Superior', 'Upper level seats', 35000, 4000, 4000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-25-10'
ON CONFLICT DO NOTHING;

-- Add tickets for São Paulo (27/10)
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, quantity_total, quantity_available)
SELECT id, 'Pista Premium', 'Area closest to the stage', 120000, 1000, 1000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-27-10'
UNION ALL
SELECT id, 'Pista', 'General admission floor', 60000, 5000, 5000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-27-10'
UNION ALL
SELECT id, 'Cadeira Inferior', 'Lower level seats', 75000, 3000, 3000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-27-10'
UNION ALL
SELECT id, 'Cadeira Superior', 'Upper level seats', 35000, 4000, 4000 FROM public.events WHERE slug = 'iron-maiden-sao-paulo-27-10'
ON CONFLICT DO NOTHING;

-- Add tickets for Curitiba (28/10)
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, quantity_total, quantity_available)
SELECT id, 'Pista Premium', 'Area closest to the stage', 110000, 800, 800 FROM public.events WHERE slug = 'iron-maiden-curitiba-28-10'
UNION ALL
SELECT id, 'Pista', 'General admission floor', 55000, 4000, 4000 FROM public.events WHERE slug = 'iron-maiden-curitiba-28-10'
UNION ALL
SELECT id, 'Cadeira Inferior', 'Lower level seats', 70000, 2500, 2500 FROM public.events WHERE slug = 'iron-maiden-curitiba-28-10'
UNION ALL
SELECT id, 'Cadeira Superior', 'Upper level seats', 32000, 3500, 3500 FROM public.events WHERE slug = 'iron-maiden-curitiba-28-10'
ON CONFLICT DO NOTHING;
