-- Update PISTA PREMIUM
UPDATE public.ticket_tiers
SET 
  price_cents = 137000,
  quantity_total = 23,
  quantity_available = 23,
  name = 'PISTA PREMIUM'
WHERE event_id = '3379ea45-7dfa-480e-876f-0ee8eacfe1ae' AND (name ILIKE 'Pista Premium' OR name = 'PISTA PREMIUM');

-- Update PISTA
UPDATE public.ticket_tiers
SET 
  price_cents = 54000,
  quantity_total = 18,
  quantity_available = 18,
  name = 'PISTA'
WHERE event_id = '3379ea45-7dfa-480e-876f-0ee8eacfe1ae' AND (name ILIKE 'Pista' OR name = 'PISTA');

-- Update CADEIRA NÍVEL 1 LATERAL
UPDATE public.ticket_tiers
SET 
  price_cents = 68200,
  quantity_total = 19,
  quantity_available = 19,
  name = 'CADEIRA NÍVEL 1 LATERAL'
WHERE event_id = '3379ea45-7dfa-480e-876f-0ee8eacfe1ae' AND (name ILIKE 'Cadeira Inferior' OR name = 'Cadeira Nível 1 Lateral' OR name = 'CADEIRA NÍVEL 1 LATERAL');

-- Update CADEIRA NÍVEL 1 CENTRAL
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.ticket_tiers WHERE event_id = '3379ea45-7dfa-480e-876f-0ee8eacfe1ae' AND name = 'CADEIRA NÍVEL 1 CENTRAL') THEN
        UPDATE public.ticket_tiers
        SET price_cents = 71500, quantity_total = 11, quantity_available = 11
        WHERE event_id = '3379ea45-7dfa-480e-876f-0ee8eacfe1ae' AND name = 'CADEIRA NÍVEL 1 CENTRAL';
    ELSE
        INSERT INTO public.ticket_tiers (event_id, name, price_cents, quantity_total, quantity_available)
        VALUES ('3379ea45-7dfa-480e-876f-0ee8eacfe1ae', 'CADEIRA NÍVEL 1 CENTRAL', 71500, 11, 11);
    END IF;
END $$;

-- Update CADEIRA SUPERIOR
UPDATE public.ticket_tiers
SET 
  price_cents = 55000,
  quantity_total = 14,
  quantity_available = 14,
  name = 'CADEIRA SUPERIOR'
WHERE event_id = '3379ea45-7dfa-480e-876f-0ee8eacfe1ae' AND (name ILIKE 'Cadeira Superior' OR name = 'CADEIRA SUPERIOR');