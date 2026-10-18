import samba from "@/assets/event-samba.jpg";
import tech from "@/assets/event-tech.jpg";
import electronic from "@/assets/event-electronic.jpg";
import comedy from "@/assets/event-comedy.jpg";
import sertanejo from "@/assets/event-sertanejo.jpg";
import football from "@/assets/event-football.jpg";
import { supabase } from "@/integrations/supabase/client";

export type EventCategory =
  | "Shows"
  | "Festivais"
  | "Teatro"
  | "Esportes"
  | "Cursos"
  | "Stand-up";

export interface TicketTier {
  id: string;
  name: string;
  description: string;
  price: number;
  fee: number;
  available: number;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: EventCategory;
  city: string;
  venue: string;
  address: string;
  date: string;
  endDate?: string;
  image: string;
  organizer: string;
  organizerSlug?: string;
  fromPrice: number;
  description: string;
  highlights: string[];
  tiers: TicketTier[];
  featured?: boolean;
}

export const CATEGORIES: EventCategory[] = [
  "Shows",
  "Festivais",
  "Teatro",
  "Esportes",
  "Cursos",
  "Stand-up",
];

// Mapa de imagens por slug (chave `image_url` no banco). Enquanto não temos
// storage, mantemos os assets locais e mapeamos pelo identificador.
const IMAGE_MAP: Record<string, string> = {
  samba,
  tech,
  electronic,
  comedy,
  sertanejo,
  football,
};

const FALLBACK_IMAGE = electronic;

function resolveImage(key: string | null | undefined) {
  if (!key) return FALLBACK_IMAGE;
  return IMAGE_MAP[key] ?? key; // permite URL absoluta futuramente
}

type OrganizerPublicRow = { id: string; name: string; slug: string };

type EventRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  category: string | null;
  city: string | null;
  venue: string | null;
  address: string | null;
  starts_at: string;
  ends_at: string | null;
  highlights: string[] | null;
  featured: boolean;
  organizer_id: string;
  ticket_tiers: Array<{
    id: string;
    name: string;
    description: string | null;
    price_cents: number;
    fee_cents: number;
    quantity_available: number;
    sort_order: number;
  }>;
};

function mapEvent(row: EventRow, organizer?: OrganizerPublicRow): EventItem {
  const tiers = [...row.ticket_tiers].sort((a, b) => a.sort_order - b.sort_order);
  const validTiers = tiers;
  const fromPrice = validTiers.length
    ? Math.min(...validTiers.map((t) => t.price_cents)) / 100
    : 0;

  // Restore previous behavior
  if (fromPrice === 0 && row.ticket_tiers.length === 0) {
    // If it truly has no tiers, we might want to keep it or filter it depending on original logic
    // But for now, let's just restore the basic mapping
  }

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? "",
    category: (row.category as EventCategory) ?? "Shows",
    city: row.city ?? "",
    venue: row.venue ?? "",
    address: row.address ?? "",
    date: row.starts_at,
    endDate: row.ends_at ?? undefined,
    image: resolveImage(row.image_url),
    organizer: organizer?.name ?? "",
    organizerSlug: organizer?.slug,
    fromPrice,
    description: row.description ?? "",
    highlights: row.highlights ?? [],
    featured: row.featured,
    tiers: tiers.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      price: t.price_cents / 100,
      fee: t.fee_cents / 100,
      available: t.quantity_available,
    })),
  };
}

const EVENT_SELECT =
  "id, slug, title, subtitle, description, image_url, category, city, venue, address, starts_at, ends_at, highlights, featured, organizer_id, ticket_tiers ( id, name, description, price_cents, fee_cents, quantity_available, sort_order )";

// Public-safe organizer lookup: reads the organizers_public view, which
// excludes the internal user_id column.
async function fetchOrganizersMap(
  ids: string[],
): Promise<Map<string, OrganizerPublicRow>> {
  const map = new Map<string, OrganizerPublicRow>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return map;
  const { data, error } = await supabase
    .from("organizers_public" as "organizers")
    .select("id, name, slug")
    .in("id", unique);
  if (error) throw error;
  for (const row of (data ?? []) as unknown as OrganizerPublicRow[]) {
    map.set(row.id, row);
  }
  return map;
}

export async function fetchEvents(): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as EventRow[];
  const orgs = await fetchOrganizersMap(rows.map((r) => r.organizer_id));
  return rows.map((row) => mapEvent(row, orgs.get(row.organizer_id)));
}

export async function fetchEventBySlug(slug: string): Promise<EventItem | null> {
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as EventRow;
  const orgs = await fetchOrganizersMap([row.organizer_id]);
  return mapEvent(row, orgs.get(row.organizer_id));
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}
