-- Insert Organizer
INSERT INTO public.organizers (name, slug)
VALUES ('Ed Sheeran Produções', 'ed-sheeran-producoes');

-- Get Organizer ID and Insert Events
DO $$
DECLARE
  v_org_id uuid;
BEGIN
  SELECT id INTO v_org_id FROM public.organizers WHERE name = 'Ed Sheeran Produções' LIMIT 1;

  INSERT INTO public.events (
    title, 
    description, 
    starts_at, 
    city, 
    venue, 
    organizer_id, 
    image_url, 
    slug,
    featured
  )
  VALUES 
  (
    'Ed Sheeran - Loop Tour - 2026',
    'Ed Sheeran traz a aclamada Loop Tour para o Brasil em 2026. Prepare-se para uma experiência única no Allianz Parque.',
    '2026-12-05T20:00:00Z',
    'São Paulo',
    'Allianz Parque',
    v_org_id,
    'https://id-preview--b13507ba-683c-4600-b47b-060b76660927.lovable.app/__l5e/assets-v1/56d45311-5674-454d-bde2-8f1783249a3c/ed-sheeran-banner.png',
    'ed-sheeran-loop-tour-sp-dec-05',
    true
  ),
  (
    'Ed Sheeran - Loop Tour - 2026 (Data Extra)',
    'Data extra confirmada! Ed Sheeran traz a aclamada Loop Tour para o Brasil em 2026 no Allianz Parque.',
    '2026-12-06T20:00:00Z',
    'São Paulo',
    'Allianz Parque',
    v_org_id,
    'https://id-preview--b13507ba-683c-4600-b47b-060b76660927.lovable.app/__l5e/assets-v1/56d45311-5674-454d-bde2-8f1783249a3c/ed-sheeran-banner.png',
    'ed-sheeran-loop-tour-sp-dec-06',
    true
  );
END $$;
