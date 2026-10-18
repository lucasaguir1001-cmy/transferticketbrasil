import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ValidateInput = z.object({
  eventId: z.string().uuid(),
  code: z.string().min(1).max(64),
  subtotalCents: z.number().int().min(0),
});

export type ValidatedCoupon = {
  id: string;
  code: string;
  discountCents: number;
  discountType: "percent" | "fixed";
  discountValue: number;
};

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ValidateInput.parse(data))
  .handler(async ({ data }): Promise<ValidatedCoupon> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const code = data.code.trim().toUpperCase();
    const { data: coupon, error } = await supabaseAdmin
      .from("coupons")
      .select("id, code, discount_type, discount_value, max_uses, uses_count, valid_until, active, event_id")
      .eq("event_id", data.eventId)
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!coupon || !coupon.active) throw new Error("Cupom inválido.");
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) {
      throw new Error("Cupom expirado.");
    }
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
      throw new Error("Cupom esgotado.");
    }
    const discountCents =
      coupon.discount_type === "percent"
        ? Math.floor((data.subtotalCents * coupon.discount_value) / 100)
        : Math.min(coupon.discount_value * 100, data.subtotalCents);
    return {
      id: coupon.id,
      code: coupon.code,
      discountCents,
      discountType: coupon.discount_type as "percent" | "fixed",
      discountValue: coupon.discount_value,
    };
  });

const UpsertInput = z.object({
  id: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  code: z.string().min(2).max(32),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().int().min(1),
  maxUses: z.number().int().min(1).nullable().optional(),
  validUntil: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

export const upsertCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const code = data.code.trim().toUpperCase();
    if (data.id) {
      const { error } = await supabase
        .from("coupons")
        .update({
          code,
          discount_type: data.discountType,
          discount_value: data.discountValue,
          max_uses: data.maxUses ?? null,
          valid_until: data.validUntil ?? null,
          active: data.active,
        })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await supabase
      .from("coupons")
      .insert({
        event_id: data.eventId,
        code,
        discount_type: data.discountType,
        discount_value: data.discountValue,
        max_uses: data.maxUses ?? null,
        valid_until: data.validUntil ?? null,
        active: data.active,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("coupons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
