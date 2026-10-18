-- Atualizando Arquibancada (R$ 3.300, 27 unid)
UPDATE public.ticket_tiers 
SET price_cents = 330000, quantity_total = 27, quantity_available = 27 
WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name ILIKE '%Arquibancada%';

-- Atualizando Cadeira Superior (R$ 3.730, 24 unid)
UPDATE public.ticket_tiers 
SET price_cents = 373000, quantity_total = 24, quantity_available = 24 
WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name ILIKE '%Cadeira Superior%';

-- Atualizando Cadeira Inferior (R$ 6.050, 7 unid)
UPDATE public.ticket_tiers 
SET price_cents = 605000, quantity_total = 7, quantity_available = 7 
WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name ILIKE '%Cadeira Inferior%';

-- Atualizando Pista (R$ 3.850, 44 unid)
UPDATE public.ticket_tiers 
SET price_cents = 385000, quantity_total = 44, quantity_available = 44 
WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name ILIKE '%Pista%';

-- Atualizando Camarote Stadium (R$ 9.240, 2 unid) - Pode não existir, vamos tentar inserir se não houver
INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available)
SELECT '35cc25c0-01dc-45f7-802e-db3870b651e1', 'Camarote Stadium', 924000, 2, 2
WHERE NOT EXISTS (SELECT 1 FROM public.ticket_tiers WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name = 'Camarote Stadium');

UPDATE public.ticket_tiers 
SET price_cents = 924000, quantity_total = 2, quantity_available = 2 
WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name = 'Camarote Stadium';

-- Atualizando Camarote Ídolos (R$ 4.950, 26 unid)
UPDATE public.ticket_tiers 
SET price_cents = 495000, quantity_total = 26, quantity_available = 26 
WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name ILIKE '%Camarote Ídolos%';