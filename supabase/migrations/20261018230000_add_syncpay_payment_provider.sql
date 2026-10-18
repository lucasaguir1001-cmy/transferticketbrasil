-- Adiciona o provider 'syncpay' ao enum payment_provider caso ainda não exista
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'syncpay' 
      AND enumtypid = 'public.payment_provider'::regtype
  ) THEN
    ALTER TYPE public.payment_provider ADD VALUE 'syncpay';
  END IF;
END $$;
