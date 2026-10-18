
-- Add mercadopago to provider enum (mock already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'mercadopago' AND enumtypid = 'public.payment_provider'::regtype) THEN
    ALTER TYPE public.payment_provider ADD VALUE 'mercadopago';
  END IF;
END $$;
