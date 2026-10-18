-- 1. Update existing tiers that match by name/purpose to keep FK integrity
-- Pista Premium
UPDATE public.ticket_tiers 
SET price_cents = 143000, quantity_total = 26, quantity_available = 26, sort_order = 1 
WHERE id = '2fe12b65-3472-4faa-8dd4-22f34d8d9f0e';

-- Pista
UPDATE public.ticket_tiers 
SET price_cents = 61100, quantity_total = 63, quantity_available = 63, sort_order = 2 
WHERE id = '60414f89-d983-48e3-a55d-767cef9156a3';

-- Cadeira Superior
UPDATE public.ticket_tiers 
SET price_cents = 55000, quantity_total = 22, quantity_available = 22, sort_order = 5 
WHERE id = 'c943be9a-3333-40f1-a0cb-7939130f0f80';

-- 2. Delete existing tiers that are no longer needed (if not referenced by orders)
-- Check for Cadeira Inferior (90aaf110-8b4c-41d8-8c2a-ddc881c344c2)
DELETE FROM public.ticket_tiers 
WHERE id = '90aaf110-8b4c-41d8-8c2a-ddc881c344c2'
AND NOT EXISTS (SELECT 1 FROM public.order_items WHERE tier_id = '90aaf110-8b4c-41d8-8c2a-ddc881c344c2');

-- 3. Insert new tiers that didn't exist before
INSERT INTO public.ticket_tiers (
  event_id, 
  name, 
  description, 
  price_cents, 
  fee_cents, 
  quantity_total, 
  quantity_available, 
  sort_order
) VALUES 
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA NÍVEL 1 LATERAL', 'Cadeiras numeradas no nível 1, visão lateral', 55000, 0, 54, 54, 3),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA NÍVEL 1 CENTRAL', 'Cadeiras numeradas no nível 1, visão central', 77000, 0, 12, 12, 4);