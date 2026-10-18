UPDATE public.events 
SET starts_at = starts_at::date + time '19:00:00'
WHERE title ILIKE '%Iron Maiden%';