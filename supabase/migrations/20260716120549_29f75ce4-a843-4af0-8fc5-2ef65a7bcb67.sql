ALTER TABLE public.organizers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;