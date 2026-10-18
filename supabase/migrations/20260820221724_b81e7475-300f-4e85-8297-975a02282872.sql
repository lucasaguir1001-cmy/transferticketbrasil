-- Atualizar Arquibancada
UPDATE public.ticket_tiers 
SET price_cents = 330000, quantity_total = 22, quantity_available = 22, sort_order = 1 
WHERE id = '10678f4f-c16a-46eb-b1f1-f37a6b86741f';

-- Atualizar Cadeira Superior
UPDATE public.ticket_tiers 
SET name = 'Cadeira Superior', price_cents = 319000, quantity_total = 18, quantity_available = 18, sort_order = 2 
WHERE id = 'ee84b5b9-495e-44b3-b809-6b41458783f8';

-- Atualizar Cadeira Inferior
UPDATE public.ticket_tiers 
SET price_cents = 611100, quantity_total = 9, quantity_available = 9, sort_order = 3 
WHERE id = '9990cc62-d6d0-4aa1-bf06-956265fbb3e7';

-- Atualizar Pista (era Pista Comum)
UPDATE public.ticket_tiers 
SET name = 'Pista', price_cents = 363000, quantity_total = 31, quantity_available = 31, sort_order = 4 
WHERE id = '4a2ab894-5332-4640-a13f-6cc363a43a7c';

-- Atualizar Camarote Ídolos (era Pista Premium Arirang)
UPDATE public.ticket_tiers 
SET name = 'Camarote Ídolos', price_cents = 506000, quantity_total = 21, quantity_available = 21, sort_order = 5 
WHERE id = '98b6c130-8ffc-4756-b7ca-dbf4c9589419';
