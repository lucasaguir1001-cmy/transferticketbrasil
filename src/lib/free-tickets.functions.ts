import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FreeInput = z.object({
  items: z
    .array(
      z.object({
        tierId: z.string().uuid(),
        quantity: z.number().int().min(1).max(10),
      }),
    )
    .min(1)
    .max(20),
});

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const createFreeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => FreeInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId, claims } = context;
    const email = (claims as { email?: string }).email ?? "";
    const name =
      ((claims as { user_metadata?: { full_name?: string; name?: string } }).user_metadata?.full_name) ||
      ((claims as { user_metadata?: { full_name?: string; name?: string } }).user_metadata?.name) ||
      (email ? email.split("@")[0] : "Participante");

    const tierIds = data.items.map((i) => i.tierId);
    const { data: tiers, error: tierErr } = await supabaseAdmin
      .from("ticket_tiers")
      .select("id, event_id, price_cents, fee_cents, quantity_available, events!inner(status)")
      .in("id", tierIds);
    if (tierErr) throw new Error(tierErr.message);
    if (!tiers || tiers.length !== tierIds.length) {
      throw new Error("Um ou mais lotes não foram encontrados.");
    }

    for (const item of data.items) {
      const tier = tiers.find((t) => t.id === item.tierId)!;
      if ((tier.events as { status: string }).status !== "published") {
        throw new Error("Evento indisponível.");
      }
      if (tier.price_cents + tier.fee_cents !== 0) {
        throw new Error("Este lote não é gratuito.");
      }
      if (tier.quantity_available < item.quantity) {
        throw new Error("Ingressos esgotados.");
      }
    }

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        provider: "mock",
        status: "paid",
        total_cents: 0,
        currency: "BRL",
        buyer_name: name,
        buyer_email: email,
        provider_ref: `free_${Date.now()}`,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Falha ao gerar ingresso.");

    const orderItems = data.items.map((i) => ({
      order_id: order.id,
      tier_id: i.tierId,
      quantity: i.quantity,
      unit_price_cents: 0,
      unit_fee_cents: 0,
    }));
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(orderItems);
    if (itemsErr) throw new Error(itemsErr.message);

    for (const item of data.items) {
      const tier = tiers.find((t) => t.id === item.tierId)!;
      const { error: updErr } = await supabaseAdmin
        .from("ticket_tiers")
        .update({ quantity_available: tier.quantity_available - item.quantity })
        .eq("id", tier.id);
      if (updErr) throw new Error(updErr.message);
    }

    const ticketsPayload: Array<{
      order_id: string;
      event_id: string;
      tier_id: string;
      user_id: string;
      code: string;
      status: "valid";
    }> = [];
    for (const item of data.items) {
      const tier = tiers.find((t) => t.id === item.tierId)!;
      for (let i = 0; i < item.quantity; i++) {
        ticketsPayload.push({
          order_id: order.id,
          event_id: tier.event_id,
          tier_id: tier.id,
          user_id: userId,
          code: generateCode(),
          status: "valid",
        });
      }
    }
    const { error: ticketsErr } = await supabaseAdmin.from("tickets").insert(ticketsPayload);
    if (ticketsErr) throw new Error(ticketsErr.message);

    return { orderId: order.id, ticketCount: ticketsPayload.length };
  });
