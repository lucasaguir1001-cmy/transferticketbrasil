-- Seed logic for new events
DO $$ 
DECLARE
    v_organizer_id UUID;
BEGIN
    -- Create an organizer
    INSERT INTO public.organizers (name, slug, email, bio)
    VALUES ('BuyTicket Produções', 'buyticket-producoes', 'contato@buyticketbrasil.com', 'A maior produtora de eventos do Brasil.')
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_organizer_id;

    -- Event 1: Samba do Trabalhador
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'Samba do Trabalhador', 
        'samba-do-trabalhador-2026', 
        'O melhor samba do Rio de Janeiro', 
        'Venha curtir uma tarde inesquecível com muito samba de raiz e alegria.', 
        'Shows', 
        'Rio de Janeiro', 
        'Renascença Clube', 
        'Rua Barão de Mesquita, 123', 
        '2026-09-10 17:00:00+00', 
        'published', 
        true,
        'samba'
    );

    -- Event 2: Tech Conference 2026
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'Brasil Tech Summit', 
        'brasil-tech-summit-2026', 
        'Tecnologia e Inovação', 
        'A maior conferência de tecnologia do país, reunindo os maiores especialistas da área.', 
        'Cursos', 
        'São Paulo', 
        'Expo Center Norte', 
        'Rua José Bernardo Pinto, 333', 
        '2026-10-15 09:00:00+00', 
        'published', 
        true,
        'tech'
    );

    -- Event 3: Noite da Comédia
    INSERT INTO public.events (organizer_id, title, slug, subtitle, description, category, city, venue, address, starts_at, status, featured, image_url)
    VALUES (
        v_organizer_id, 
        'Stand-up Night Brasil', 
        'stand-up-night-brasil', 
        'Risada garantida', 
        'Os melhores comediantes do Brasil reunidos em uma noite de muita risada.', 
        'Stand-up', 
        'Belo Horizonte', 
        'Teatro Marília', 
        'Av. Alfredo Balena, 586', 
        '2026-11-20 20:00:00+00', 
        'published', 
        false,
        'comedy'
    );
END $$;
