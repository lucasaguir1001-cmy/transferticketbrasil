import { supabase } from "@/integrations/supabase/client";

export type OrganizerRow = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
};

export type PainelEventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  category: string | null;
  city: string | null;
  venue: string | null;
  starts_at: string;
  status: "draft" | "published" | "ended" | "cancelled";
  image_url: string | null;
};

export type PainelTierRow = {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  fee_cents: number;
  quantity_total: number;
  quantity_available: number;
  sort_order: number;
};

export async function fetchMyOrganizer(): Promise<OrganizerRow | null> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from("organizers")
    .select("id, user_id, name, slug, bio, avatar_url")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}



export async function fetchMyEvents(organizerId: string): Promise<PainelEventRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, slug, title, subtitle, category, city, venue, starts_at, status, image_url")
    .eq("organizer_id", organizerId)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PainelEventRow[];
}

export async function fetchEventForEdit(id: string) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchEventTiers(eventId: string): Promise<PainelTierRow[]> {
  const { data, error } = await supabase
    .from("ticket_tiers")
    .select("*")
    .eq("event_id", eventId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as PainelTierRow[];
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export type EventSalesStats = {
  ticketsSold: number;
  ticketsCheckedIn: number;
  revenueCents: number;
  ordersCount: number;
  byTier: Array<{ tierId: string; tierName: string; sold: number; total: number; revenueCents: number }>;
  byDay: Array<{ day: string; count: number }>;
};

export async function fetchEventSales(eventId: string): Promise<EventSalesStats> {
  const { data: tiers, error: tiersErr } = await supabase
    .from("ticket_tiers")
    .select("id, name, price_cents, fee_cents, quantity_total, quantity_available")
    .eq("event_id", eventId);
  if (tiersErr) throw tiersErr;

  const { data: tickets, error: tErr } = await supabase
    .from("tickets")
    .select("id, tier_id, status, checked_in_at, created_at, order_id")
    .eq("event_id", eventId);
  if (tErr) throw tErr;

  const orderIds = Array.from(new Set((tickets ?? []).map((t) => t.order_id)));
  let revenueCents = 0;
  if (orderIds.length) {
    const { data: orders, error: oErr } = await supabase
      .from("orders")
      .select("id, total_cents, status")
      .in("id", orderIds);
    if (oErr) throw oErr;
    revenueCents = (orders ?? [])
      .filter((o) => o.status === "paid")
      .reduce((sum, o) => sum + o.total_cents, 0);
  }

  const byTierMap = new Map<string, { tierName: string; sold: number; total: number; revenueCents: number }>();
  for (const tier of tiers ?? []) {
    byTierMap.set(tier.id, {
      tierName: tier.name,
      sold: tier.quantity_total - tier.quantity_available,
      total: tier.quantity_total,
      revenueCents: (tier.quantity_total - tier.quantity_available) * (tier.price_cents + tier.fee_cents),
    });
  }

  const byDayMap = new Map<string, number>();
  for (const t of tickets ?? []) {
    const day = new Date(t.created_at).toISOString().slice(0, 10);
    byDayMap.set(day, (byDayMap.get(day) ?? 0) + 1);
  }

  return {
    ticketsSold: tickets?.length ?? 0,
    ticketsCheckedIn: (tickets ?? []).filter((t) => t.status === "used" || t.checked_in_at).length,
    revenueCents,
    ordersCount: orderIds.length,
    byTier: Array.from(byTierMap.entries()).map(([tierId, v]) => ({ tierId, ...v })),
    byDay: Array.from(byDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day, count })),
  };
}

export type ParticipantRow = {
  ticketId: string;
  orderId: string;
  code: string;
  status: string;
  checkedInAt: string | null;
  tierName: string;
  buyerName: string | null;
  buyerEmail: string | null;
  createdAt: string;
  orderStatus: string;
  refundStatus: string | null;
};

export async function fetchEventParticipants(eventId: string): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "id, order_id, code, status, checked_in_at, created_at, tier:ticket_tiers(name), order:orders(buyer_name, buyer_email, status, refund_status)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((t) => {
    const tier = t.tier as { name: string } | null;
    const order = t.order as {
      buyer_name: string | null;
      buyer_email: string | null;
      status: string;
      refund_status: string | null;
    } | null;
    return {
      ticketId: t.id,
      orderId: t.order_id,
      code: t.code,
      status: t.status,
      checkedInAt: t.checked_in_at,
      tierName: tier?.name ?? "—",
      buyerName: order?.buyer_name ?? null,
      buyerEmail: order?.buyer_email ?? null,
      createdAt: t.created_at,
      orderStatus: order?.status ?? "—",
      refundStatus: order?.refund_status ?? null,
    };
  });
}

export async function checkInTicketByCode(eventId: string, code: string) {
  const trimmed = code.trim().toUpperCase();
  const { data: ticket, error } = await supabase
    .from("tickets")
    .select("id, status, event_id, checked_in_at, tier:ticket_tiers(name), order:orders(buyer_name, buyer_email)")
    .eq("code", trimmed)
    .maybeSingle();
  if (error) throw error;
  if (!ticket) return { ok: false as const, reason: "not_found" as const };
  if (ticket.event_id !== eventId) return { ok: false as const, reason: "wrong_event" as const };
  if (ticket.status === "used" || ticket.checked_in_at) {
    return { ok: false as const, reason: "already_used" as const, ticket };
  }
  if (ticket.status !== "valid") {
    return { ok: false as const, reason: "invalid_status" as const, ticket };
  }
  const { error: updErr } = await supabase
    .from("tickets")
    .update({ status: "used", checked_in_at: new Date().toISOString() })
    .eq("id", ticket.id);
  if (updErr) throw updErr;
  return { ok: true as const, ticket };
}
