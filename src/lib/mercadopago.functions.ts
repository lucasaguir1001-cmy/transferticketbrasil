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
  couponCode: z.string().max(64).optional(),
  cpf: z.string().min(11).max(14).optional(),
});

function genCode() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 12; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

export const createMpPixPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CheckoutInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error("Mercado Pago não configurado.");
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

    // Coupon (single-event only)
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
    const totalCents = Math.max(100, subtotalCents - discountCents); // MP mínimo R$ 1

    // Create pending order
    const { data: order, error: oErr } = await supabaseAdmin
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
    if (oErr || !order) throw new Error(oErr?.message ?? "Falha ao criar pedido.");

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

    // Create MP Pix payment
    const mpBody = {
      transaction_amount: totalCents / 100,
      description: `TransferTicketBrasil - Pedido ${order.id.slice(0, 8)}`,
      payment_method_id: "pix",
      external_reference: order.id,
      payer: {
        email: data.buyerEmail,
        first_name: data.buyerName.split(" ")[0],
        last_name: data.buyerName.split(" ").slice(1).join(" ") || data.buyerName,
        ...(data.cpf
          ? { identification: { type: "CPF", number: data.cpf.replace(/\D/g, "") } }
          : {}),
      },
    };

    const idempotencyKey = `order-${order.id}`;
    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(mpBody),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error("[MP] create payment failed", res.status, body);
      await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw new Error(body?.message ?? "Falha ao gerar Pix.");
    }

    const paymentId = String(body.id);
    const qrBase64: string | undefined = body?.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCode: string | undefined = body?.point_of_interaction?.transaction_data?.qr_code;
    const ticketUrl: string | undefined = body?.point_of_interaction?.transaction_data?.ticket_url;

    await supabaseAdmin.from("orders").update({ mp_payment_id: paymentId }).eq("id", order.id);

    return {
      orderId: order.id,
      paymentId,
      qrCodeBase64: qrBase64 ?? null,
      qrCode: qrCode ?? null,
      ticketUrl: ticketUrl ?? null,
      totalCents,
      discountCents,
    };
  });

async function confirmOrder(orderId: string, mpPaymentStatus: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, status, coupon_id, mp_payment_id")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, reason: "order_not_found" as const };
  if (order.status === "paid") return { ok: true, alreadyPaid: true as const };

  // NUNCA confiar no status recebido: revalidar direto na API do Mercado Pago.
  let verifiedStatus = mpPaymentStatus;
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (order.mp_payment_id && token) {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${order.mp_payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payment = await res.json().catch(() => null);
    if (!res.ok || !payment) return { ok: false, reason: "verify_failed" as const };
    // O pagamento precisa pertencer a este pedido.
    if (payment.external_reference && payment.external_reference !== order.id) {
      return { ok: false, reason: "reference_mismatch" as const };
    }
    verifiedStatus = String(payment.status);
  } else if (!order.mp_payment_id) {
    // Sem pagamento registrado não há como liberar ingresso.
    return { ok: false, reason: "no_payment" as const };
  }

  if (verifiedStatus !== "approved") {
    if (verifiedStatus === "cancelled" || verifiedStatus === "rejected") {
      await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id)
        .eq("status", "pending");
    }
    return { ok: false, reason: "not_approved" as const, status: verifiedStatus };
  }

  // Trava atômica: só um processo (webhook, polling ou retorno do cartão) emite ingressos.
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

  // Decrement inventory + create tickets
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
        user_id: order.user_id!,
        code: genCode(),
        status: "valid",
      });
    }
  }
  const { error: tkErr } = await supabaseAdmin.from("tickets").insert(tickets);
  if (tkErr) {
    console.error("[MP] falha ao emitir ingressos", tkErr);
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


export const checkMpPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ orderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error("MP não configurado.");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, mp_payment_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order || order.user_id !== context.userId) throw new Error("Pedido não encontrado.");
    if (order.status === "paid") return { status: "paid" as const };
    if (!order.mp_payment_id) return { status: order.status };

    const res = await fetch(`https://api.mercadopago.com/v1/payments/${order.mp_payment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body?.message ?? "Falha ao consultar pagamento.");

    const result = await confirmOrder(order.id, body.status);
    if (result.ok) return { status: "paid" as const };
    return { status: body.status as string };
  });

// Exported for webhook route
export async function confirmOrderFromMp(orderId: string, mpPaymentStatus: string) {
  return confirmOrder(orderId, mpPaymentStatus);
}

// ============ CARD (crédito / débito) ============

const CardInput = z.object({
  items: z
    .array(z.object({ tierId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(20),
  buyerName: z.string().min(2).max(120),
  buyerEmail: z.string().email(),
  couponCode: z.string().max(64).optional(),
  // Vindo do Brick:
  token: z.string().min(4),
  paymentMethodId: z.string().min(2), // "visa", "master", "elo", "debvisa"...
  installments: z.number().int().min(1).max(24),
  issuerId: z.string().optional().nullable(),
  identificationType: z.string().optional(), // "CPF" | "CNPJ"
  identificationNumber: z.string().optional(),
});

export const createMpCardPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CardInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) throw new Error("Mercado Pago não configurado.");
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
    const totalCents = Math.max(100, subtotalCents - discountCents);

    const { data: order, error: oErr } = await supabaseAdmin
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
    if (oErr || !order) throw new Error(oErr?.message ?? "Falha ao criar pedido.");

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

    const mpBody: Record<string, unknown> = {
      transaction_amount: Number((totalCents / 100).toFixed(2)),
      token: data.token,
      description: `TransferTicketBrasil - Pedido ${order.id.slice(0, 8)}`,
      installments: data.installments,
      payment_method_id: data.paymentMethodId,
      external_reference: order.id,
      statement_descriptor: "TRANSFERTICKET",
      payer: {
        email: data.buyerEmail,
        first_name: data.buyerName.split(" ")[0],
        last_name: data.buyerName.split(" ").slice(1).join(" ") || data.buyerName,
        ...(data.identificationNumber
          ? {
              identification: {
                type: data.identificationType || "CPF",
                number: data.identificationNumber.replace(/\D/g, ""),
              },
            }
          : {}),
      },
    };
    if (data.issuerId) mpBody.issuer_id = data.issuerId;

    const res = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Idempotency-Key": `order-card-${order.id}`,
      },
      body: JSON.stringify(mpBody),
    });
    const body = await res.json();
    if (!res.ok) {
      console.error("[MP] card payment failed", res.status, body);
      await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      throw new Error(body?.message ?? "Falha ao processar cartão.");
    }

    const paymentId = String(body.id);
    await supabaseAdmin.from("orders").update({ mp_payment_id: paymentId }).eq("id", order.id);

    const status: string = body.status; // approved | in_process | rejected
    const statusDetail: string = body.status_detail ?? "";

    if (status === "approved") {
      await confirmOrder(order.id, "approved");
      return { orderId: order.id, status: "approved" as const, statusDetail };
    }
    if (status === "rejected") {
      await supabaseAdmin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      return { orderId: order.id, status: "rejected" as const, statusDetail };
    }
    // in_process — webhook confirmará
    return { orderId: order.id, status: "in_process" as const, statusDetail };
  });

