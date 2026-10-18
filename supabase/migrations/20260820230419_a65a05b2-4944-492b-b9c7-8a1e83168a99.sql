-- Update ticket tiers for BTS Oct 30 (MorumBIS) based on the image provided previously
-- ID for Oct 30 event is 35cc25c0-01dc-45f7-802e-db3870b651e1
-- Data from image-47.png:
-- Arquibancada: R$ 3.300,00 (27 units)
-- Cadeira Superior: R$ 3.730,00 (24 units)
-- Cadeira Inferior: R$ 6.050,00 (7 units)
-- Pista: R$ 3.850,00 (44 units)
-- Camarote Stadium: R$ 9.240,00 (2 units)
-- Camarote Ídolos: R$ 4.950,00 (26 units)

-- First, ensure all expected tiers exist or are updated for the Oct 30 event
UPDATE ticket_tiers SET price_cents = 330000, quantity_total = 27, quantity_available = 27, sort_order = 1 WHERE name = 'Arquibancada' AND event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1';
UPDATE ticket_tiers SET price_cents = 373000, quantity_total = 24, quantity_available = 24, sort_order = 2 WHERE name = 'Cadeira Superior' AND event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1';
UPDATE ticket_tiers SET price_cents = 605000, quantity_total = 7, quantity_available = 7, sort_order = 3 WHERE name = 'Cadeira Inferior' AND event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1';
UPDATE ticket_tiers SET price_cents = 385000, quantity_total = 44, quantity_available = 44, sort_order = 4 WHERE name = 'Pista' AND event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1';
UPDATE ticket_tiers SET price_cents = 495000, quantity_total = 26, quantity_available = 26, sort_order = 6 WHERE name = 'Camarote Ídolos' AND event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1';

-- Insert Camarote Stadium if it doesn't exist for this event
INSERT INTO ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
SELECT '35cc25c0-01dc-45f7-802e-db3870b651e1', 'Camarote Stadium', 924000, 2, 2, 5
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_tiers WHERE event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1' AND name = 'Camarote Stadium'
);

-- If it already exists, update it
UPDATE ticket_tiers SET price_cents = 924000, quantity_total = 2, quantity_available = 2, sort_order = 5 WHERE name = 'Camarote Stadium' AND event_id = '35cc25c0-01dc-45f7-802e-db3870b651e1';