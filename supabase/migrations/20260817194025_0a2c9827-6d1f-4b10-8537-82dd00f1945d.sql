UPDATE public.events 
SET starts_at = '2026-08-28 20:00:00+00', 
    slug = 'bts-2026-world-tour-arirang-aug-28' 
WHERE title ILIKE '%BTS%' AND (starts_at = '2026-10-28 20:00:00+00' OR slug = 'bts-2026-world-tour-arirang-oct-28');