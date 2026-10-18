import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const refundOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // Load order + first ticket to find event/organizer
    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .select("id, status, provider, mp_payment_id, refund_status, total_cents")
      .eq("id", data.orderId)
      .maybeSingle();
    if (oErr) throw new Error(oErr.message);
    if (!order) throw new Error("Pedido não encontrado.");
    if (order.status !== "paid") throw new Error("Pedido não está pago.");
    if (order.refund_status === "refunded") throw new Error("Já reembolsado.");

    const { data: tks } = await supabaseAdmin
      .from("tickets")
      .select("id, event_id, tier_id")
      .eq("order_id", order.id);
    if (!tks || tks.length === 0) throw new Error("Sem ingressos para reembolsar.");

    // Verify caller is the organizer of these events (or the buyer)
    const eventIds = Array.from(new Set(tks.map((t) => t.event_id)));
    const { data: events } = await supabaseAdmin
      .from("events")
      .select("id, organizer_id, organizers!inner(user_id)")
      .in("id", eventIds);
    const isOrganizer = (events ?? []).every(
      (e) => (e.organizers as { user_id: string }).user_id === userId,
    );
    const { data: orderOwner } = await supabaseAdmin
      .from("orders")
      .select("user_id")
      .eq("id", order.id)
      .single();
    const isBuyer = orderOwner?.user_id === userId;
    if (!isOrganizer && !isBuyer) throw new Error("Sem permissão.");

    // MP refund
    if (order.provider === "mercadopago" && order.mp_payment_id) {
      const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!token) throw new Error("MP não configurado.");
      const res = await fetch(
        `https://api.mercadopago.com/v1/payments/${order.mp_payment_id}/refunds`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "X-Idempotency-Key": `refund-${order.id}`,
          },
          body: JSON.stringify({}),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error("[MP refund]", res.status, body);
        await supabaseAdmin
          .from("orders")
          .update({ refund_status: "failed" })
          .eq("id", order.id);
        throw new Error(body?.message ?? "Falha no reembolso Mercado Pago.");
      }
    }

    // Invalidate tickets + restore inventory
    const tierCounts = new Map<string, number>();
    for (const t of tks) tierCounts.set(t.tier_id, (tierCounts.get(t.tier_id) ?? 0) + 1);
    await supabaseAdmin
      .from("tickets")
      .update({ status: "cancelled" })
      .eq("order_id", order.id);
    for (const [tierId, count] of tierCounts) {
      const { data: tier } = await supabaseAdmin
        .from("ticket_tiers")
        .select("quantity_available, quantity_total")
        .eq("id", tierId)
        .single();
      if (tier) {
        await supabaseAdmin
          .from("ticket_tiers")
          .update({
            quantity_available: Math.min(tier.quantity_total, tier.quantity_available + count),
          })
          .eq("id", tierId);
      }
    }

    await supabaseAdmin
      .from("orders")
      .update({
        status: "refunded",
        refund_status: "refunded",
        refunded_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    return { ok: true };
  });
