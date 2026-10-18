-- Update existing tiers for Oct 30 and Oct 31 to match Oct 28 categories
-- Note: Oct 28 categories are Arquibancada, Cadeira Inferior, Cadeira Superior, Camarote Ídolos, Pista

-- Update for Oct 30 event
UPDATE ticket_tiers SET name = 'Arquibancada', price_cents = 273000, quantity_total = 22, quantity_available = 22 WHERE id = '2e3e2b91-571a-4aa0-919c-a322fe5cf12b';
UPDATE ticket_tiers SET name = 'Cadeira Inferior', price_cents = 480000, quantity_total = 9, quantity_available = 9 WHERE id = '39ccda3c-05a2-4b8c-89fa-59be71667fb2';
UPDATE ticket_tiers SET name = 'Cadeira Superior', price_cents = 319000, quantity_total = 18, quantity_available = 18 WHERE id = '36aed0c7-104a-4251-a73e-1e26f1ac221d';
UPDATE ticket_tiers SET name = 'Pista', price_cents = 297000, quantity_total = 31, quantity_available = 31 WHERE id = '20821de8-0136-4e3c-9efa-1f9f9bc02ff0';
UPDATE ticket_tiers SET name = 'Camarote Ídolos', price_cents = 501000, quantity_total = 21, quantity_available = 21 WHERE id = 'e8527f0a-1a80-4245-bfc3-bf7ba7c371b1';
-- Delete extra tier on Oct 30 if it's not being used in orders
DELETE FROM ticket_tiers WHERE id = '6d16d199-515e-4970-9d36-597f68d89376' AND id NOT IN (SELECT tier_id FROM order_items);

-- Update for Oct 31 event
UPDATE ticket_tiers SET name = 'Arquibancada', price_cents = 273000, quantity_total = 22, quantity_available = 22 WHERE id = 'da7cb0e2-40e2-4ce9-9dcd-db5d808cda42';
UPDATE ticket_tiers SET name = 'Cadeira Inferior', price_cents = 480000, quantity_total = 9, quantity_available = 9 WHERE id = '97ce8b30-8b13-4327-b10e-8d89e8abed1a';
UPDATE ticket_tiers SET name = 'Cadeira Superior', price_cents = 319000, quantity_total = 18, quantity_available = 18 WHERE id = '29462f1f-1d49-45e0-b05e-6023c55c14e4';
UPDATE ticket_tiers SET name = 'Pista', price_cents = 297000, quantity_total = 31, quantity_available = 31 WHERE id = 'd1a7b3cb-737d-4e07-9721-600b80201fd4';
UPDATE ticket_tiers SET name = 'Camarote Ídolos', price_cents = 501000, quantity_total = 21, quantity_available = 21 WHERE id = '7cd05055-175f-4f59-808c-4e2cd35fea55';