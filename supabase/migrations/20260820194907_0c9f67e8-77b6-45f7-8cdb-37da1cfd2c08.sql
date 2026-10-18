-- Update ticket tiers for Iron Maiden Oct 25 based on image-34.png
-- Event ID: d7cd97f7-1639-4e0a-9c51-878ae193620d

-- Repurpose existing tier 60414f89-d983-48e3-a55d-767cef9156a3 (Pista) as 'Meia Estudante'
UPDATE public.ticket_tiers 
SET name = 'Meia Estudante', price_cents = 61100, quantity_available = 9, quantity_total = 9, sort_order = 1 
WHERE id = '60414f89-d983-48e3-a55d-767cef9156a3';

-- Repurpose existing tier de06b582-27dd-421a-b125-60410f774cf5 (CADEIRA NÍVEL 1 LATERAL) as 'Inteira'
UPDATE public.ticket_tiers 
SET name = 'Inteira', price_cents = 73700, quantity_available = 54, quantity_total = 54, sort_order = 2 
WHERE id = 'de06b582-27dd-421a-b125-60410f774cf5';

-- Repurpose existing tier c943be9a-3333-40f1-a0cb-7939130f0f80 (Cadeira Superior) as 'Meia Idoso'
UPDATE public.ticket_tiers 
SET name = 'Meia Idoso', price_cents = 0, quantity_available = 0, quantity_total = 0, sort_order = 3 
WHERE id = 'c943be9a-3333-40f1-a0cb-7939130f0f80';

-- Repurpose existing tier 3a02e09c-0664-4e0d-9d5f-27eec81b5f20 (CADEIRA NÍVEL 1 CENTRAL) as 'Meia PCD'
UPDATE public.ticket_tiers 
SET name = 'Meia PCD', price_cents = 0, quantity_available = 0, quantity_total = 0, sort_order = 4 
WHERE id = '3a02e09c-0664-4e0d-9d5f-27eec81b5f20';

-- Repurpose existing tier 2fe12b65-3472-4faa-8dd4-22f34d8d9f0e (Pista Premium) as 'Meia Jovem Baixa Renda'
UPDATE public.ticket_tiers 
SET name = 'Meia Jovem Baixa Renda', price_cents = 0, quantity_available = 0, quantity_total = 0, sort_order = 5 
WHERE id = '2fe12b65-3472-4faa-8dd4-22f34d8d9f0e';

-- Add missing 'Meia Professor' as a new tier
INSERT INTO public.ticket_tiers (event_id, name, price_cents, fee_cents, quantity_available, quantity_total, sort_order)
VALUES ('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'Meia Professor', 0, 0, 0, 0, 6);
