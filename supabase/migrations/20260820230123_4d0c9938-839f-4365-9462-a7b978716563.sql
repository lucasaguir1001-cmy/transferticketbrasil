-- Update sort_order for Oct 30 and Oct 31 BTS events to match Oct 28 order
-- Order: Arquibancada (1), Cadeira Superior (2), Cadeira Inferior (3), Pista (4), Camarote Ídolos (5)

UPDATE ticket_tiers SET sort_order = 1 WHERE name = 'Arquibancada' AND event_id IN (SELECT id FROM events WHERE title ILIKE '%BTS%' AND (starts_at::date = '2026-10-30' OR starts_at::date = '2026-10-31'));
UPDATE ticket_tiers SET sort_order = 2 WHERE name = 'Cadeira Superior' AND event_id IN (SELECT id FROM events WHERE title ILIKE '%BTS%' AND (starts_at::date = '2026-10-30' OR starts_at::date = '2026-10-31'));
UPDATE ticket_tiers SET sort_order = 3 WHERE name = 'Cadeira Inferior' AND event_id IN (SELECT id FROM events WHERE title ILIKE '%BTS%' AND (starts_at::date = '2026-10-30' OR starts_at::date = '2026-10-31'));
UPDATE ticket_tiers SET sort_order = 4 WHERE name = 'Pista' AND event_id IN (SELECT id FROM events WHERE title ILIKE '%BTS%' AND (starts_at::date = '2026-10-30' OR starts_at::date = '2026-10-31'));
UPDATE ticket_tiers SET sort_order = 5 WHERE name = 'Camarote Ídolos' AND event_id IN (SELECT id FROM events WHERE title ILIKE '%BTS%' AND (starts_at::date = '2026-10-30' OR starts_at::date = '2026-10-31'));