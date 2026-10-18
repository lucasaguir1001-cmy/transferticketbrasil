-- Atualiza Curitiba para 19:10 (se necessário, embora pareça já estar correto no log)
UPDATE public.events 
SET starts_at = '2026-10-28 19:10:00+00'
WHERE id = '2a8de74b-46e0-4559-8b5f-31da3a9f8c03';

-- Atualiza São Paulo (25 e 27 de Out) para 16:00
UPDATE public.events 
SET starts_at = starts_at::date + time '16:00:00'
WHERE id IN ('d7cd97f7-1639-4e0a-9c51-878ae193620d', '3379ea45-7dfa-480e-876f-0ee8eacfe1ae');