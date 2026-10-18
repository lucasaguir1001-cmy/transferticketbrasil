import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { z } from "zod";
import { Search, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/event-card";
import { CATEGORIES, fetchEvents, type EventCategory } from "@/lib/events-data";

const searchSchema = z.object({
  cat: z.string().optional(),
  q: z.string().optional(),
  city: z.string().optional(),
  when: z.string().optional(), // today | week | month | all
});

export const Route = createFileRoute("/eventos/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Eventos — TTB" },
      { name: "twitter:card", content: "summary" },
      { property: "og:type", content: "website" },
      {
        name: "description",
        content:
          "Explore shows, festivais, teatro, esportes e cursos. Encontre o próximo evento para chamar de seu.",
      },
      { property: "og:title", content: "Eventos — TTB" },
      {
        property: "og:description",
        content:
          "Explore shows, festivais, teatro, esportes e cursos no maior catálogo de ingressos do Brasil.",
      },
    ],
  }),
  component: EventsList,
});

function EventsList() {
  const { cat, q, city, when } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "published"],
    queryFn: fetchEvents,
  });

  const cities = useMemo(() => {
    const set = new Set(events.map((e) => e.city).filter(Boolean));
    return Array.from(set).sort();
  }, [events]);

  const now = Date.now();
  const filtered = events.filter((e) => {
    if (cat && e.category !== cat) return false;
    if (city && e.city !== city) return false;
    if (q && !`${e.title} ${e.venue} ${e.city} ${e.organizer}`.toLowerCase().includes(q.toLowerCase()))
      return false;
    if (when && when !== "all") {
      const t = new Date(e.date).getTime();
      const diff = t - now;
      if (when === "today") {
        const d1 = new Date(e.date);
        const d2 = new Date();
        if (d1.toDateString() !== d2.toDateString()) return false;
      } else if (when === "week") {
        if (diff < 0 || diff > 7 * 24 * 3600 * 1000) return false;
      } else if (when === "month") {
        if (diff < 0 || diff > 31 * 24 * 3600 * 1000) return false;
      }
    }
    return true;
  });

  const updateSearch = (patch: Partial<z.infer<typeof searchSchema>>) => {
    navigate({ search: (prev: z.infer<typeof searchSchema>) => ({ ...prev, ...patch }) });
  };

  const hasFilters = Boolean(cat || city || q || (when && when !== "all"));

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/50">
        <div className="container mx-auto px-4 py-12">
          <h1 className="font-display text-4xl font-bold">Todos os eventos</h1>
          <p className="mt-2 text-muted-foreground">
            {isLoading
              ? "Carregando eventos..."
              : `${filtered.length} evento${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
          </p>

          <div id="cidades" className="mt-6 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Busque por nome, local, cidade..."
                defaultValue={q ?? ""}
                onChange={(e) => updateSearch({ q: e.target.value || undefined })}
                className="w-full rounded-full border border-border bg-card px-10 py-2.5 text-sm outline-none transition-colors focus:border-brand"
              />
            </div>
            <select
              value={city ?? ""}
              onChange={(e) => updateSearch({ city: e.target.value || undefined })}
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Todas as cidades</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={when ?? "all"}
              onChange={(e) => updateSearch({ when: e.target.value === "all" ? undefined : e.target.value })}
              className="rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="all">Qualquer data</option>
              <option value="today">Hoje</option>
              <option value="week">Próximos 7 dias</option>
              <option value="month">Próximos 30 dias</option>
            </select>
            {hasFilters && (
              <button
                onClick={() => navigate({ search: {} })}
                className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                <X className="h-3.5 w-3.5" /> Limpar
              </button>
            )}
          </div>

          <div id="categorias" className="mt-4 flex flex-wrap gap-2">
            <FilterChip active={!cat} onClick={() => updateSearch({ cat: undefined })}>
              Todas
            </FilterChip>
            {CATEGORIES.map((c) => (
              <FilterChip
                key={c}
                active={cat === c}
                onClick={() => updateSearch({ cat: c as EventCategory })}
              >
                {c}
              </FilterChip>
            ))}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <p className="font-display text-lg font-semibold">Nenhum evento encontrado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tente ajustar os filtros ou busque por outra categoria.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        active
          ? "bg-gradient-brand rounded-full px-4 py-2 text-sm font-semibold text-brand-foreground shadow-glow"
          : "rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      }
    >
      {children}
    </button>
  );
}
