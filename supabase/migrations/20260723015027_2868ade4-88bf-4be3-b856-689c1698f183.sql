
-- Coupons
CREATE TYPE public.coupon_discount_type AS ENUM ('percent', 'fixed');
CREATE TYPE public.refund_status AS ENUM ('none', 'requested', 'refunded', 'failed');

CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type public.coupon_discount_type NOT NULL,
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  valid_until TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, code)
);

GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING (active = true);

CREATE POLICY "Organizers manage own coupons"
ON public.coupons FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = coupons.event_id AND o.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = coupons.event_id AND o.user_id = auth.uid()
  )
);

CREATE TRIGGER coupons_set_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Orders extra fields
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS refund_status public.refund_status NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
