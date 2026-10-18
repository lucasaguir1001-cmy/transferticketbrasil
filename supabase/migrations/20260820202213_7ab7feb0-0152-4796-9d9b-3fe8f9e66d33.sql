
-- Atualizar tiers existentes para evitar erro de FK em order_items
UPDATE public.ticket_tiers 
SET 
  name = 'PISTA PREMIUM',
  price_cents = 143000,
  quantity_available = 8,
  quantity_total = 8,
  sort_order = 1
WHERE id = '2fe12b65-3472-4faa-8dd4-22f34d8d9f0e';

UPDATE public.ticket_tiers 
SET 
  name = 'PISTA',
  price_cents = 61100,
  quantity_available = 9,
  quantity_total = 9,
  sort_order = 2
WHERE id = '60414f89-d983-48e3-a55d-767cef9156a3';

UPDATE public.ticket_tiers 
SET 
  name = 'CADEIRA NÍVEL 1 LATERAL',
  price_cents = 82500,
  quantity_available = 17,
  quantity_total = 17,
  sort_order = 3
WHERE id = 'de06b582-27dd-421a-b125-60410f774cf5';

UPDATE public.ticket_tiers 
SET 
  name = 'CADEIRA NÍVEL 1 CENTRAL',
  price_cents = 77000,
  quantity_available = 3,
  quantity_total = 3,
  sort_order = 4
WHERE id = '3a02e09c-0664-4e0d-9d5f-27eec81b5f20';

UPDATE public.ticket_tiers 
SET 
  name = 'CADEIRA SUPERIOR',
  price_cents = 55000,
  quantity_available = 9,
  quantity_total = 9,
  sort_order = 5
WHERE id = 'c943be9a-3333-40f1-a0cb-7939130f0f80';

-- Se sobrar algum tier que não está na imagem e não tem pedido, podemos tentar deletar ou apenas zerar
-- O 'Meia Professor' foi criado na rodada anterior, vamos atualizar ele também se necessário ou remover
DELETE FROM public.ticket_tiers 
WHERE event_id = 'd7cd97f7-1639-4e0a-9c51-878ae193620d' 
AND id NOT IN (
  '2fe12b65-3472-4faa-8dd4-22f34d8d9f0e', 
  '60414f89-d983-48e3-a55d-767cef9156a3', 
  'de06b582-27dd-421a-b125-60410f774cf5', 
  '3a02e09c-0664-4e0d-9d5f-27eec81b5f20', 
  'c943be9a-3333-40f1-a0cb-7939130f0f80'
);
