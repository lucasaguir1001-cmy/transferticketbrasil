import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
});

export type CheckoutInputType = z.infer<typeof CheckoutInput>;

function generateCode() {
  // 12-char base32-ish code, chunked
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 12; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const createMockOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CheckoutInput.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { userId } = context;

    // Load tiers
    const tierIds = data.items.map((i) => i.tierId);
    const { data: tiers, error: tierErr } = await supabaseAdmin
      .from("ticket_tiers")
      .select("id, event_id, price_cents, fee_cents, quantity_available, events!inner(status)")
      .in("id", tierIds);
    if (tierErr) throw new Error(tierErr.message);
    if (!tiers || tiers.length !== tierIds.length) {
      throw new Error("Um ou mais lotes não foram encontrados.");
    }

    let totalCents = 0;
    const orderItemsData: Array<{
      tier_id: string;
      quantity: number;
      unit_price_cents: number;
      unit_fee_cents: number;
    }> = [];
    const ticketsToCreate: Array<{
      tier_id: string;
      event_id: string;
      quantity: number;
    }> = [];

    for (const item of data.items) {
      const tier = tiers.find((t) => t.id === item.tierId);
      if (!tier) throw new Error("Lote inválido.");
      if ((tier.events as { status: string }).status !== "published") {
        throw new Error("Evento indisponível.");
      }
      if (tier.quantity_available < item.quantity) {
        throw new Error("Ingressos esgotados para um dos lotes selecionados.");
      }
      totalCents += (tier.price_cents + tier.fee_cents) * item.quantity;
      orderItemsData.push({
        tier_id: tier.id,
        quantity: item.quantity,
        unit_price_cents: tier.price_cents,
        unit_fee_cents: tier.fee_cents,
      });
      ticketsToCreate.push({
        tier_id: tier.id,
        event_id: tier.event_id,
        quantity: item.quantity,
      });
    }

    // Create order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        provider: "mock",
        status: "paid",
        total_cents: totalCents,
        currency: "BRL",
        buyer_name: data.buyerName,
        buyer_email: data.buyerEmail,
        provider_ref: `mock_${Date.now()}`,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error(orderErr?.message ?? "Falha ao criar pedido.");

    // Order items
    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      orderItemsData.map((i) => ({ ...i, order_id: order.id })),
    );
    if (itemsErr) throw new Error(itemsErr.message);

    // Decrement inventory
    for (const item of data.items) {
      const tier = tiers.find((t) => t.id === item.tierId)!;
      const { error: updErr } = await supabaseAdmin
        .from("ticket_tiers")
        .update({ quantity_available: tier.quantity_available - item.quantity })
        .eq("id", tier.id);
      if (updErr) throw new Error(updErr.message);
    }

    // Create tickets
    const ticketsPayload: Array<{
      order_id: string;
      event_id: string;
      tier_id: string;
      user_id: string;
      code: string;
      status: "valid";
    }> = [];
    for (const t of ticketsToCreate) {
      for (let i = 0; i < t.quantity; i++) {
        ticketsPayload.push({
          order_id: order.id,
          event_id: t.event_id,
          tier_id: t.tier_id,
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
