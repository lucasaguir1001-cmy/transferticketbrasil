-- Update Iron Maiden Oct 25 ticket tiers to the specific values in the image
-- We delete existing tiers first to ensure a exact match with the request
DELETE FROM public.ticket_tiers 
WHERE event_id = 'd7cd97f7-1639-4e0a-9c51-878ae193620d';

-- Insert tiers exactly as shown in the image:
-- PISTA PREMIUM (R$ 1.430 | 8)
-- PISTA (R$ 611 | 9)
-- CADEIRA NÍVEL 1 LATERAL (R$ 825 | 17)
-- CADEIRA NÍVEL 1 CENTRAL (R$ 770 | 3)
-- CADEIRA SUPERIOR (R$ 550 | 9)

INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
VALUES 
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'PISTA PREMIUM', '', 143000, 14300, 8, 8, 0),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'PISTA', '', 61100, 6110, 9, 9, 1),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA NÍVEL 1 LATERAL', '', 82500, 8250, 17, 17, 2),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA NÍVEL 1 CENTRAL', '', 77000, 7700, 3, 3, 3),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA SUPERIOR', '', 55000, 5500, 9, 9, 4);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_tiers TO authenticated;
GRANT ALL ON public.ticket_tiers TO service_role;
