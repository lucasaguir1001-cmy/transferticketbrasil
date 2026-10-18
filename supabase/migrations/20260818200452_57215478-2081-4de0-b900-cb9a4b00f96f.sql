UPDATE public.events 
SET image_url = 'https://b13507ba-683c-4600-b47b-060b76660927.lovableproject.com/__l5e/assets-v1/3edf752b-c83b-4523-a6e2-cdb2042548fb/iron-maiden-banner-v5.png' 
WHERE title ILIKE '%Iron Maiden%';

UPDATE public.events 
SET image_url = 'https://b13507ba-683c-4600-b47b-060b76660927.lovableproject.com/__l5e/assets-v1/d8312b4d-2ba0-4ede-bdc4-a5d6697359db/bts-banner-v2.png' 
WHERE title ILIKE '%BTS%';

UPDATE public.events 
SET image_url = 'https://b13507ba-683c-4600-b47b-060b76660927.lovableproject.com/__l5e/assets-v1/dbfcdffa-80b5-45cf-bf3e-e05eff09afce/f1-banner-v2.png' 
WHERE title ILIKE '%F1%' OR title ILIKE '%Formula 1%' OR title ILIKE '%Fórmula 1%';