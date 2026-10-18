import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createSyncPayCashIn,
  getSyncPayTransaction,
  isSyncPayStatusPaid,
} from "./syncpay";

const CheckoutInput = z.object({
  items: z
    .array(
      z.object({
        tierId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
  buyerName: z.string().min(2).max(120),
  buyerEmail: z.string().email(),
  couponCode: z.string().max(64).optional(),
  cpf: z.string().min(11).max(14).optional(),
});

function genCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const createSyncPayPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CheckoutInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    const tierIds = data.items.map((i) => i.tierId);
    const { data: tiers, error: tErr } = await supabaseAdmin
      .from("ticket_tiers")
      .select("id, event_id, name, price_cents, fee_cents, quantity_available, events!inner(id, title, status)")
      .in("id", tierIds);
    if (tErr) throw new Error(tErr.message);
    if (!tiers || tiers.length !== tierIds.length) throw new Error("Lote inválido.");

    let subtotalCents = 0;
    const eventIds = new Set<string>();
    for (const item of data.items) {
      const tier = tiers.find((t) => t.id === item.tierId)!;
      if ((tier.events as { status: string }).status !== "published") {
        throw new Error("Evento indisponível.");
      }
      if (tier.quantity_available < item.quantity) throw new Error("Ingressos esgotados.");
      subtotalCents += (tier.price_cents + tier.fee_cents) * item.quantity;
      eventIds.add(tier.event_id);
    }

    // Validação de Cupom
    let couponId: string | null = null;
    let discountCents = 0;
    if (data.couponCode && eventIds.size === 1) {
      const eventId = Array.from(eventIds)[0];
      const code = data.couponCode.trim().toUpperCase();
      const { data: coupon } = await supabaseAdmin
        .from("coupons")
        .select("id, discount_type, discount_value, max_uses, uses_count, valid_until, active")
        .eq("event_id", eventId)
        .eq("code", code)
        .maybeSingle();
      if (!coupon || !coupon.active) throw new Error("Cupom inválido.");
      if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) throw new Error("Cupom expirado.");
      if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) throw new Error("Cupom esgotado.");
      discountCents =
        coupon.discount_type === "percent"
          ? Math.floor((subtotalCents * coupon.discount_value) / 100)
          : Math.min(coupon.discount_value * 100, subtotalCents);
      couponId = coupon.id;
    }
    const totalCents = Math.max(100, subtotalCents - discountCents); // Mínimo R$ 1,00

    // Criar pedido pendente
    // Nota: Se a migration de syncpay já rodou, gravamos 'syncpay'. Caso o enum ainda seja antigo, usamos 'mercadopago' para não falhar.
    const providerValue = "syncpay";
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        // @ts-expect-error provider enum extended
        provider: providerValue,
        status: "pending",
        total_cents: totalCents,
        currency: "BRL",
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        coupon_id: couponId,
        discount_cents: discountCents,
      })
      .select("id")
      .single();

    if (oErr || !order) {
      // Se falhar por constraint de provider, tenta fallback compatível
      const fallback = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          provider: "mercadopago",
          status: "pending",
          total_cents: totalCents,
          currency: "BRL",
          buyer_name: data.buyerName,
          buyer_email: data.buyerEmail,
          coupon_id: couponId,
          discount_cents: discountCents,
        })
        .select("id")
        .single();
      if (fallback.error || !fallback.data) {
        throw new Error(oErr?.message ?? fallback.error?.message ?? "Falha ao criar pedido.");
      }
      order.id = fallback.data.id;
    }

    await supabaseAdmin.from("order_items").insert(
      data.items.map((item) => {
        const tier = tiers.find((t) => t.id === item.tierId)!;
        return {
          order_id: order.id,
          tier_id: tier.id,
          quantity: item.quantity,
          unit_price_cents: tier.price_cents,
          unit_fee_cents: tier.fee_cents,
        };
      }),
    );

    // Determina URL de webhook da aplicação
    const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || "https://transferticketbrasil.com.br";
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/public/syncpay-webhook`;

    // Gerar Pix via SyncPay
    try {
      const syncPayRes = await createSyncPayCashIn({
        amount: Number((totalCents / 100).toFixed(2)),
        description: `Pedido ${order.id.slice(0, 8)}`,
        webhook_url: webhookUrl,
        client: {
          name: data.buyerName,
          cpf: data.cpf ? data.cpf.replace(/\D/g, "") : undefined,
          email: data.buyerEmail,
        },
      });

      // Atualiza o pedido com o identificador retornado pela SyncPay
      await supabaseAdmin
        .from("orders")
        .update({
          provider_ref: syncPayRes.identifier,
          mp_payment_id: syncPayRes.identifier,
        })
        .eq("id", order.id);

      return {
        orderId: order.id,
        identifier: syncPayRes.identifier,
        pixCode: syncPayRes.pix_code,
        qrCodeBase64: null,
        qrCode: syncPayRes.pix_code,
        ticketUrl: null,
        totalCents,
        discountCents,
      };
    } catch (err) {
      console.error("[SyncPay] Erro ao criar cash-in:", err);
      await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw err;
    }
  });

export async function confirmOrder(orderId: string, status: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, status, coupon_id, provider_ref, mp_payment_id")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return { ok: false, reason: "order_not_found" as const };
  if (order.status === "paid") return { ok: true, alreadyPaid: true as const };

  const identifier = order.provider_ref || order.mp_payment_id;
  let isApproved = isSyncPayStatusPaid(status);

  // Se o status passado não for de confirmação direta, valida diretamente na API da SyncPay
  if (!isApproved && identifier) {
    try {
      const tx = await getSyncPayTransaction(identifier);
      if (isSyncPayStatusPaid(tx.status)) {
        isApproved = true;
      }
    } catch (err) {
      console.error("[SyncPay] Erro ao validar transação:", err);
    }
  }

  if (!isApproved) {
    if (status === "cancelled" || status === "rejected" || status === "expired") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id)
        .eq("status", "pending");
    }
    return { ok: false, reason: "not_approved" as const, status };
  }

  // Trava atômica: garante que apenas um processo emita os ingressos
  const { data: claimed } = await supabaseAdmin
    .from("orders")
    .update({ status: "paid" })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (!claimed) return { ok: true, alreadyPaid: true as const };

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("tier_id, quantity, tier:ticket_tiers(event_id, quantity_available)")
    .eq("order_id", order.id);

  if (!items || items.length === 0) {
    await supabaseAdmin.from("orders").update({ status: "pending" }).eq("id", order.id);
    return { ok: false, reason: "no_items" as const };
  }

  // Baixa de estoque e emissão dos ingressos
  const tickets: Array<{
    order_id: string;
    event_id: string;
    tier_id: string;
    user_id: string;
    code: string;
    status: "valid";
  }> = [];

  for (const it of items) {
    const tier = it.tier as { event_id: string; quantity_available: number };
    await supabaseAdmin
      .from("ticket_tiers")
      .update({ quantity_available: Math.max(0, tier.quantity_available - it.quantity) })
      .eq("id", it.tier_id);

    for (let i = 0; i < it.quantity; i++) {
      tickets.push({
        order_id: order.id,
        event_id: tier.event_id,
        tier_id: it.tier_id,
        user_id: order.user_id,
        code: genCode(),
        status: "valid",
      });
    }
  }

  const { error: tkErr } = await supabaseAdmin.from("tickets").insert(tickets);
  if (tkErr) {
    console.error("[SyncPay] Falha ao emitir ingressos:", tkErr);
    await supabaseAdmin.from("orders").update({ status: "pending" }).eq("id", order.id);
    return { ok: false, reason: "ticket_insert_failed" as const };
  }

  if (order.coupon_id) {
    const { data: c } = await supabaseAdmin
      .from("coupons")
      .select("uses_count")
      .eq("id", order.coupon_id)
      .single();
    if (c) {
      await supabaseAdmin
        .from("coupons")
        .update({ uses_count: c.uses_count + 1 })
        .eq("id", order.coupon_id);
    }
  }

  return { ok: true, alreadyPaid: false as const };
}

export const checkSyncPayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, provider_ref, mp_payment_id")
      .eq("id", data.orderId)
      .maybeSingle();

    if (!order || order.user_id !== context.userId) throw new Error("Pedido não encontrado.");
    if (order.status === "paid") return { status: "paid" as const };

    const identifier = order.provider_ref || order.mp_payment_id;
    if (!identifier) return { status: order.status };

    try {
      const tx = await getSyncPayTransaction(identifier);
      if (isSyncPayStatusPaid(tx.status)) {
        await confirmOrder(order.id, tx.status);
        return { status: "paid" as const };
      }
      return { status: tx.status };
    } catch {
      return { status: order.status };
    }
  });

export async function confirmOrderFromSyncPay(identifier: string, status: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Localiza pedido pelo provider_ref ou mp_payment_id
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id")
    .or(`provider_ref.eq.${identifier},mp_payment_id.eq.${identifier}`)
    .maybeSingle();

  if (!order) {
    console.warn(`[SyncPay Webhook] Pedido não encontrado para identifier: ${identifier}`);
    return { ok: false, reason: "not_found" };
  }

  return confirmOrder(order.id, status);
}
