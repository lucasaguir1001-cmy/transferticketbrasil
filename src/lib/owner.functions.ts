import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertNoLinkedRecords, assertOwnerRole } from "./owner-access";
import { z } from "zod";

const uuid = z.string().uuid();
const optionalText = z.string().trim().max(5000).nullable();
const eventStatus = z.enum(["draft", "published", "ended", "cancelled"]);
const orderStatus = z.enum(["pending", "paid", "failed", "refunded", "cancelled"]);
const refundStatus = z.enum(["none", "requested", "refunded", "failed"]);
const paymentProvider = z.enum(["stripe", "mercadopago", "mock", "syncpay"]);

const tierSchema = z.object({
  id: uuid.optional(), name: z.string().trim().min(1).max(120), description: optionalText,
  price_cents: z.number().int().nonnegative(), fee_cents: z.number().int().nonnegative(),
  quantity_total: z.number().int().nonnegative(), quantity_available: z.number().int().nonnegative(),
  sort_order: z.number().int().min(0).max(999),
}).refine((tier) => tier.quantity_available <= tier.quantity_total, { message: "A quantidade disponível não pode superar o total." });

const eventSchema = z.object({
  id: uuid.optional(), organizer_id: uuid, slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(200), subtitle: z.string().trim().max(300).nullable(), description: optionalText,
  image_url: z.string().trim().url().max(3000).nullable(), category: z.string().trim().max(80).nullable(),
  city: z.string().trim().max(120).nullable(), venue: z.string().trim().max(200).nullable(), address: z.string().trim().max(300).nullable(),
  starts_at: z.string().datetime(), ends_at: z.string().datetime().nullable(), status: eventStatus,
  featured: z.boolean(), highlights: z.array(z.string().trim().min(1).max(200)).max(20), tiers: z.array(tierSchema).max(30),
}).refine((event) => !event.ends_at || new Date(event.ends_at) >= new Date(event.starts_at), { message: "A data final deve ser posterior à inicial." });

const organizerSchema = z.object({
  id: uuid.optional(), user_id: uuid.nullable(), name: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), bio: optionalText,
  avatar_url: z.string().trim().url().max(3000).nullable(),
});

const orderSchema = z.object({
  id: uuid.optional(), user_id: uuid, provider: paymentProvider, provider_ref: z.string().trim().max(255).nullable(),
  status: orderStatus, total_cents: z.number().int().nonnegative(), currency: z.string().trim().length(3).transform((v) => v.toUpperCase()),
  buyer_email: z.string().trim().email().max(255).nullable(), buyer_name: z.string().trim().max(200).nullable(),
  discount_cents: z.number().int().nonnegative(), mp_preference_id: z.string().trim().max(255).nullable(),
  mp_payment_id: z.string().trim().max(255).nullable(), refund_status: refundStatus,
});

async function authorizeOwner(context: { supabase: any; userId: string }) {
  const roles = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  if (roles.error) throw roles.error;
  assertOwnerRole(roles.data ?? []);
}

async function adminClient(context: { supabase: any; userId: string }) {
  await authorizeOwner(context);
  return (await import("@/integrations/supabase/client.server")).supabaseAdmin;
}

async function readAll<T>(readPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await readPage(offset, offset + 499);
    if (result.error) throw result.error;
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return rows;
  }
}

export const getOwnerDashboard = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await authorizeOwner(context);
  const [events, organizers, orders] = await Promise.all([
    readAll((from, to) => context.supabase.from("events").select("id,title,subtitle,description,image_url,category,city,venue,address,starts_at,ends_at,organizer_id,status,featured,highlights,slug,created_at,ticket_tiers(id,name,description,price_cents,fee_cents,quantity_total,quantity_available,sort_order)").order("created_at", { ascending: false }).order("id").range(from, to)),
    readAll((from, to) => context.supabase.from("organizers").select("id,name,slug,user_id,bio,avatar_url,created_at").order("created_at", { ascending: false }).order("id").range(from, to)),
    readAll((from, to) => context.supabase.from("orders").select("id,user_id,buyer_name,buyer_email,status,total_cents,discount_cents,currency,provider,provider_ref,mp_preference_id,mp_payment_id,created_at,refund_status").order("created_at", { ascending: false }).order("id").range(from, to)),
  ]);
  return { events, organizers, orders };
});

export const saveOwnerEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(eventSchema).handler(async ({ data, context }) => {
  const admin = await adminClient(context);
  const { tiers, id, ...event } = data;
  const eventResult = id
    ? await admin.from("events").update(event).eq("id", id).select("id").single()
    : await admin.from("events").insert(event).select("id").single();
  if (eventResult.error) throw eventResult.error;
  const eventId = eventResult.data.id;
  const existing = await admin.from("ticket_tiers").select("id").eq("event_id", eventId);
  if (existing.error) throw existing.error;
  const keptIds = tiers.flatMap((tier) => tier.id ? [tier.id] : []);
  const removedIds = (existing.data ?? []).map((tier) => tier.id).filter((tierId) => !keptIds.includes(tierId));
  if (removedIds.length) {
    const used = await admin.from("order_items").select("tier_id").in("tier_id", removedIds).limit(1);
    if (used.error) throw used.error;
    assertNoLinkedRecords(used.data?.length ?? 0, "Não é possível remover um tipo de ingresso que já possui venda.");
    const deleted = await admin.from("ticket_tiers").delete().in("id", removedIds);
    if (deleted.error) throw deleted.error;
  }
  for (const tier of tiers) {
    const { id: tierId, ...values } = tier;
    const result = tierId
      ? await admin.from("ticket_tiers").update(values).eq("id", tierId).eq("event_id", eventId)
      : await admin.from("ticket_tiers").insert({ ...values, event_id: eventId });
    if (result.error) throw result.error;
  }
  return { id: eventId };
});

export const deleteOwnerEvent = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: uuid })).handler(async ({ data, context }) => {
  const admin = await adminClient(context);
  const tickets = await admin.from("tickets").select("id").eq("event_id", data.id).limit(1);
  if (tickets.error) throw tickets.error;
  assertNoLinkedRecords(tickets.data?.length ?? 0, "Este anúncio possui ingressos emitidos e não pode ser excluído. Cancele-o para preservar o histórico.");
  const tiers = await admin.from("ticket_tiers").select("id").eq("event_id", data.id);
  if (tiers.error) throw tiers.error;
  const tierIds = (tiers.data ?? []).map((tier) => tier.id);
  if (tierIds.length) {
    const used = await admin.from("order_items").select("id").in("tier_id", tierIds).limit(1);
    if (used.error) throw used.error;
    assertNoLinkedRecords(used.data?.length ?? 0, "Este anúncio possui vendas e não pode ser excluído. Cancele-o para preservar o histórico.");
    const deletedTiers = await admin.from("ticket_tiers").delete().eq("event_id", data.id);
    if (deletedTiers.error) throw deletedTiers.error;
  }
  const result = await admin.from("events").delete().eq("id", data.id);
  if (result.error) throw result.error;
  return { id: data.id };
});

export const saveOwnerOrganizer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(organizerSchema).handler(async ({ data, context }) => {
  const admin = await adminClient(context);
  const { id, ...values } = data;
  const result = id ? await admin.from("organizers").update(values).eq("id", id).select("id").single() : await admin.from("organizers").insert(values).select("id").single();
  if (result.error) throw result.error;
  return result.data;
});

export const deleteOwnerOrganizer = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: uuid })).handler(async ({ data, context }) => {
  const admin = await adminClient(context);
  const events = await admin.from("events").select("id").eq("organizer_id", data.id).limit(1);
  if (events.error) throw events.error;
  assertNoLinkedRecords(events.data?.length ?? 0, "Este vendedor possui anúncios. Exclua ou transfira os anúncios antes.");
  const result = await admin.from("organizers").delete().eq("id", data.id);
  if (result.error) throw result.error;
  return { id: data.id };
});

export const saveOwnerOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(orderSchema).handler(async ({ data, context }) => {
  const admin = await adminClient(context);
  const { id, ...values } = data;
  const result = id ? await admin.from("orders").update(values).eq("id", id).select("id").single() : await admin.from("orders").insert(values).select("id").single();
  if (result.error) throw result.error;
  return result.data;
});

export const deleteOwnerOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: uuid })).handler(async ({ data, context }) => {
  const admin = await adminClient(context);
  const dependencies = await Promise.all([
    admin.from("tickets").select("id").eq("order_id", data.id).limit(1),
    admin.from("order_items").select("id").eq("order_id", data.id).limit(1),
  ]);
  for (const dependency of dependencies) if (dependency.error) throw dependency.error;
  assertNoLinkedRecords(dependencies.reduce((total, dependency) => total + (dependency.data?.length ?? 0), 0), "Este pedido possui itens ou ingressos emitidos e não pode ser excluído.");
  const result = await admin.from("orders").delete().eq("id", data.id);
  if (result.error) throw result.error;
  return { id: data.id };
});
export const getOwnerOrderDetails = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator(z.object({ id: uuid })).handler(async ({ data, context }) => {
  const admin = await adminClient(context);
  const order = await admin.from("orders").select("*").eq("id", data.id).single();
  if (order.error) throw order.error;
  const [items, tickets, profile, authUser] = await Promise.all([
    admin.from("order_items").select("id,quantity,unit_price_cents,unit_fee_cents,tier:ticket_tiers(name,event:events(title,starts_at,venue,city))").eq("order_id", data.id),
    admin.from("tickets").select("id,code,status,checked_in_at,tier:ticket_tiers(name),event:events(title,starts_at,venue,city)").eq("order_id", data.id),
    admin.from("profiles").select("full_name,phone,created_at").eq("id", order.data.user_id).maybeSingle(),
    admin.auth.admin.getUserById(order.data.user_id),
  ]);
  if (items.error) throw items.error;
  if (tickets.error) throw tickets.error;
  const u = authUser.data?.user;
  let payment: { method: string | null; type: string | null; installments: number | null; last_four: string | null; status_detail: string | null; payer_document: string | null } | null = null;
  const token = process.env["MERCADOPAGO_ACCESS_TOKEN"];
  if (order.data.mp_payment_id && token) {
    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${order.data.mp_payment_id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const p = await res.json() as any;
        payment = { method: p.payment_method_id ?? null, type: p.payment_type_id ?? null, installments: p.installments ?? null, last_four: p.card?.last_four_digits ?? null, status_detail: p.status_detail ?? null, payer_document: p.payer?.identification?.number ?? null };
      }
    } catch { /* payment details optional */ }
  }
  return {
    order: order.data,
    items: items.data ?? [],
    tickets: tickets.data ?? [],
    customer: {
      full_name: profile.data?.full_name ?? null, phone: profile.data?.phone ?? u?.phone ?? null,
      login_email: u?.email ?? null, login_providers: (u?.app_metadata?.providers as string[] | undefined) ?? [],
      created_at: u?.created_at ?? null, last_sign_in_at: u?.last_sign_in_at ?? null, email_confirmed: Boolean(u?.email_confirmed_at),
    },
    payment,
  };
});
