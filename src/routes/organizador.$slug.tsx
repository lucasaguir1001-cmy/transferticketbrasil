import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/event-card";
import { supabase } from "@/integrations/supabase/client";
import { fetchEvents, type EventItem } from "@/lib/events-data";

type OrganizerPublic = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  avatar_url: string | null;
};

async function fetchOrganizerPage(slug: string): Promise<{
  organizer: OrganizerPublic;
  events: EventItem[];
} | null> {
  const { data, error } = await supabase
    .from("organizers_public" as "organizers")
    .select("id, name, slug, bio, avatar_url")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const all = await fetchEvents();
  const events = all.filter((e) => e.organizerSlug === slug);
  return { organizer: data as OrganizerPublic, events };
}

export const Route = createFileRoute("/organizador/$slug")({
  loader: async ({ params }): Promise<{ organizer: OrganizerPublic; events: EventItem[] }> => {
    const data = await fetchOrganizerPage(params.slug);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.organizer.name} — TTB` },
          {
            name: "description",
            content:
              loaderData.organizer.bio ??
              `Veja todos os eventos de ${loaderData.organizer.name} em TTB.`,
          },
          { property: "og:title", content: loaderData.organizer.name },
          {
            property: "og:description",
            content:
              loaderData.organizer.bio ??
              `Eventos oficiais de ${loaderData.organizer.name}.`,
          },
          { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
        ]
      : [],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Organizador não encontrado</h1>
        <Link
          to="/eventos"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Ver eventos
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Erro ao carregar organizador</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
      </div>
    </div>
  ),
  component: OrganizerPage,
});

function OrganizerPage() {
  const { organizer, events } = Route.useLoaderData() as { organizer: OrganizerPublic; events: EventItem[] };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/40">
        <div className="container mx-auto flex flex-wrap items-center gap-6 px-4 py-12">
          <div className="bg-gradient-brand grid h-24 w-24 place-items-center rounded-full text-3xl font-bold text-brand-foreground shadow-glow">
            {organizer.avatar_url ? (
              <img
                src={organizer.avatar_url}
                alt={organizer.name}
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              organizer.name[0]?.toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-[240px]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Organizador</p>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{organizer.name}</h1>
            {organizer.bio && (
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{organizer.bio}</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {events.length} evento{events.length !== 1 ? "s" : ""} publicado
              {events.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-16 text-center">
            <p className="font-display text-lg font-semibold">Nenhum evento no momento</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volte em breve para conferir novidades deste organizador.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <SiteFooter />
    </div>
  );
}
