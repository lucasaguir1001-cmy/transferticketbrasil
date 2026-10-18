-- Update dates to October (10) for all BTS events
UPDATE public.events 
SET starts_at = starts_at + interval '2 months',
    slug = REPLACE(slug, 'aug', 'oct')
WHERE slug LIKE 'bts%';
