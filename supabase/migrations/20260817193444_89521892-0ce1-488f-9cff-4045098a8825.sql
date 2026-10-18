-- Para remover o evento duplicado (BTS Outubro), precisamos lidar com os pedidos de teste vinculados.
-- Em um ambiente de produção não deletaríamos ordens, mas aqui se trata de limpeza de dados de teste/duplicados.

-- 1. Deletar os itens de pedido e os tickets
DELETE FROM public.tickets WHERE event_id = 'd301b0a8-9cc1-4996-8ba3-d9dc09e5af90';
DELETE FROM public.order_items WHERE tier_id IN (SELECT id FROM public.ticket_tiers WHERE event_id = 'd301b0a8-9cc1-4996-8ba3-d9dc09e5af90');

-- 2. Deletar os pedidos (que agora não têm mais itens associados)
DELETE FROM public.orders WHERE id IN ('037e8832-e2e6-4678-9359-c5b31ccdced2', '9cdcf25c-e7c5-4f69-bcdb-0446949c6baf', '0c8f549b-f37e-4cc8-ab5c-13c76b4919a2');

-- 3. Deletar os tiers e o evento
DELETE FROM public.ticket_tiers WHERE event_id = 'd301b0a8-9cc1-4996-8ba3-d9dc09e5af90';
DELETE FROM public.events WHERE id = 'd301b0a8-9cc1-4996-8ba3-d9dc09e5af90';
