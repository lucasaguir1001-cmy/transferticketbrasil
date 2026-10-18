-- Atualizar o nome do organizador para Live Nation Brasil
UPDATE public.organizers 
SET name = 'Live Nation Brasil' 
WHERE id = '79974bc0-9240-4783-b6b2-48804773fad7';

-- Atualizar o horário dos eventos do BTS para 19:00
UPDATE public.events 
SET starts_at = (starts_at::date + interval '19 hours')
WHERE title ILIKE '%BTS%';