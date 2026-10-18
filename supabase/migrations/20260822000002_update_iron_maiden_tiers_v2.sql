-- Update Iron Maiden Oct 25 ticket tiers to the specific values in the image
-- ID: d7cd97f7-1639-4e0a-9c51-878ae193620d

-- First, delete all existing tiers to ensure a clean state matching the image
DELETE FROM public.ticket_tiers 
WHERE event_id = 'd7cd97f7-1639-4e0a-9c51-878ae193620d';

-- Insert tiers from the image
INSERT INTO public.ticket_tiers (event_id, name, description, price_cents, fee_cents, quantity_total, quantity_available, sort_order)
VALUES 
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'PISTA PREMIUM', '', 143000, 14300, 8, 8, 0),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'PISTA', '', 61100, 6110, 9, 9, 1),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA NÍVEL 1 LATERAL', '', 82500, 8250, 17, 17, 2),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA NÍVEL 1 CENTRAL', '', 77000, 7700, 3, 3, 3),
('d7cd97f7-1639-4e0a-9c51-878ae193620d', 'CADEIRA SUPERIOR', '', 55000, 5500, 9, 9, 4);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_tiers TO authenticated;
GRANT ALL ON public.ticket_tiers TO service_role;
