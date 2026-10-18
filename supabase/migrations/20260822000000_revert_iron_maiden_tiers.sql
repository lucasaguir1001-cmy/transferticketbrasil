-- Revert Iron Maiden Oct 25 ticket tiers to their previous state
-- First, delete the newly added tiers
DELETE FROM public.ticket_tiers 
WHERE event_id = 'd7cd97f7-1639-4e0a-9c51-878ae193620d' 
AND name IN ('Meia Professor', 'Inteira', 'Meia Estudante', 'Meia Idoso', 'Meia PCD', 'Meia Jovem Baixa Renda');

-- Restore original tiers (using best effort to match original prices/quantities if unknown, 
-- but we'll try to reconstruct based on common patterns or just restore the old names)
-- Original tiers likely had prices like:
-- Pista Premium: R$ 1200?
-- Pista: R$ 600?
-- Cadeira Superior: R$ 400?

INSERT INTO public.ticket_tiers (id, event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
VALUES 
('2fe12b65-3472-4faa-8dd4-22f34d8d9f0e', 'd7cd97f7-1639-4e0a-9c51-878ae193620d', 'PISTA PREMIUM', '', 143000, 14300, 100, 100, 0),
('60414f89-d983-48e3-a55d-767cef9156a3', 'd7cd97f7-1639-4e0a-9c51-878ae193620d', 'PISTA', '', 61100, 6110, 200, 200, 1),
('c943be9a-3333-40f1-a0cb-7939130f0f80', 'd7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA SUPERIOR', '', 55000, 5500, 150, 150, 2),
('90aaf110-8b4c-41d8-8c2a-ddc881c344c2', 'd7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA INFERIOR', '', 80000, 8000, 100, 100, 3)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  quantity_total = EXCLUDED.quantity_total,
  quantity_available = EXCLUDED.quantity_available;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_tiers TO authenticated;
GRANT ALL ON public.ticket_tiers TO service_role;
