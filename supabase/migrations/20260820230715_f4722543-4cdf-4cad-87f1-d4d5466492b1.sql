-- Update ticket tiers for BTS Oct 31 based on image-51.png
-- ID for Oct 31 event is b5952da5-dd03-419d-8c09-af805907b135
-- Data from image:
-- Arquibancada: R$ 3.300,00 (7 units)
-- Cadeira Superior: R$ 4.004,00 (31 units)
-- Cadeira Inferior: R$ 3.850,00 (6 units)
-- Pista: R$ 4.400,00 (20 units)
-- Camarote Stadium: R$ 0,00 (0 units or hidden)
-- Camarote Ídolos: R$ 5.499,00 (22 units)

-- Update existing tiers for transparency/consistency
UPDATE ticket_tiers SET price_cents = 330000, quantity_total = 7, quantity_available = 7, sort_order = 1 WHERE name = 'Arquibancada' AND event_id = 'b5952da5-dd03-419d-8c09-af805907b135';
UPDATE ticket_tiers SET price_cents = 400400, quantity_total = 31, quantity_available = 31, sort_order = 2 WHERE name = 'Cadeira Superior' AND event_id = 'b5952da5-dd03-419d-8c09-af805907b135';
UPDATE ticket_tiers SET price_cents = 385000, quantity_total = 6, quantity_available = 6, sort_order = 3 WHERE name = 'Cadeira Inferior' AND event_id = 'b5952da5-dd03-419d-8c09-af805907b135';
UPDATE ticket_tiers SET price_cents = 440000, quantity_total = 20, quantity_available = 20, sort_order = 4 WHERE name = 'Pista' AND event_id = 'b5952da5-dd03-419d-8c09-af805907b135';
UPDATE ticket_tiers SET price_cents = 549900, quantity_total = 22, quantity_available = 22, sort_order = 6 WHERE name = 'Camarote Ídolos' AND event_id = 'b5952da5-dd03-419d-8c09-af805907b135';

-- Handle Camarote Stadium (set to 0 per image)
UPDATE ticket_tiers SET price_cents = 0, quantity_total = 0, quantity_available = 0, sort_order = 5 WHERE name = 'Camarote Stadium' AND event_id = 'b5952da5-dd03-419d-8c09-af805907b135';
-- If it doesn't exist, we don't necessarily need to create a zero-value tier unless requested, but image shows it.
INSERT INTO ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available, sort_order)
SELECT 'b5952da5-dd03-419d-8c09-af805907b135', 'Camarote Stadium', 0, 0, 0, 5
WHERE NOT EXISTS (
    SELECT 1 FROM ticket_tiers WHERE event_id = 'b5952da5-dd03-419d-8c09-af805907b135' AND name = 'Camarote Stadium'
);