-- Removendo o evento BTS original de Outubro que agora não tem mais tickets/pedidos vinculados
-- (Caso a migração anterior tenha parado no meio, embora pareça ter completado a parte de limpeza)
DELETE FROM public.events WHERE slug = 'bts-2026-world-tour-arirang';

-- Garantindo que os outros 2 BTS estejam ativos e em destaque
UPDATE public.events 
SET status = 'published', featured = true 
WHERE slug IN ('bts-2026-world-tour-30-aug', 'bts-2026-world-tour-31-aug');
