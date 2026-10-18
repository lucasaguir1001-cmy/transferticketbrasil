import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, MapPin, Share2, User, Ticket, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { formatBRL, formatEventDate, fetchEventBySlug, type EventItem } from "@/lib/events-data";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/use-auth";
import { createFreeOrder } from "@/lib/free-tickets.functions";
import { useServerFn } from "@tanstack/react-start";
import { getSiteUrl } from "@/lib/site-config";

export const Route = createFileRoute("/eventos/$slug")({
  loader: async ({ params }): Promise<{ event: EventItem }> => {
    const event = await fetchEventBySlug(params.slug);
    if (!event) throw notFound();
    return { event };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [] };
    const ev = loaderData.event;
    const base = getSiteUrl();
    const img = ev.image.startsWith("http") ? ev.image : `${base}${ev.image}`;
    const url = `${base}/eventos/${params.slug}`;
    return {
      meta: [
        { title: `${ev.title} — TTB` },
        { name: "description", content: ev.subtitle },
        { property: "og:title", content: ev.title },
        { property: "og:description", content: ev.subtitle },
        { property: "og:image", content: img },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ev.title },
        { name: "twitter:description", content: ev.subtitle },
        { name: "twitter:image", content: img },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold">Evento não encontrado</h1>
        <p className="mt-2 text-muted-foreground">
          Este evento pode ter sido removido ou o link está incorreto.
        </p>
        <Link
          to="/eventos"
          className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
        >
          Ver todos os eventos
        </Link>
      </div>
      <SiteFooter />
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Erro ao carregar evento</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : String(error)}</p>
      </div>
    </div>
  ),
  component: EventDetail,
});

function EventDetail() {
  const { event } = Route.useLoaderData() as { event: EventItem };
  const cart = useCart();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const generateFree = useServerFn(createFreeOrder);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);

  const setQty = (tierId: string, next: number, max: number) => {
    const clamped = Math.max(0, Math.min(max, Math.min(10, next)));
    setQuantities((prev) => ({ ...prev, [tierId]: clamped }));
  };

  const totalSelected = Object.values(quantities).reduce((s, q) => s + q, 0);
  const totalCents = event.tiers.reduce((sum, t) => {
    const q = quantities[t.id] ?? 0;
    return sum + q * Math.round((t.price + t.fee) * 100);
  }, 0);
  const isFreeOrder = totalSelected > 0 && totalCents === 0;

  const handleFreeGenerate = async () => {
    const items = event.tiers
      .filter((t) => (quantities[t.id] ?? 0) > 0)
      .map((t) => ({ tierId: t.id, quantity: quantities[t.id]! }));
    if (items.length === 0) return;
    setGenerating(true);
    try {
      const res = await generateFree({ data: { items } });
      toast.success("TTB gerado! Confira em Meus ingressos.");
      navigate({ to: "/pedidos/$id", params: { id: res.orderId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar ingresso.");
    } finally {
      setGenerating(false);
    }
  };

  const handleBuy = () => {
    const selected = event.tiers.filter((t) => (quantities[t.id] ?? 0) > 0);
    if (selected.length === 0) {
      toast.error("Selecione ao menos 1 ingresso.");
      return;
    }

    if (isFreeOrder) {
      if (!user) {
        toast.info("Faça login para gerar seu ingresso gratuito.");
        navigate({ to: "/auth" });
        return;
      }
      handleFreeGenerate();
      return;
    }

    for (const tier of selected) {
      cart.addItem(
        {
          tierId: tier.id,
          tierName: tier.name,
          eventId: event.id,
          eventSlug: event.slug,
          eventTitle: event.title,
          eventImage: event.image,
          priceCents: Math.round(tier.price * 100),
          feeCents: Math.round(tier.fee * 100),
        },
        quantities[tier.id]!,
      );
    }
    navigate({ to: "/checkout" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative">
        <div className="relative h-[160px] overflow-hidden sm:h-[180px] md:h-[220px]">
          <img
            src={event.image}
            alt={event.title}
            width={1600}
            height={1000}
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent" />
        </div>

        <div className="container mx-auto -mt-6 px-4 pb-4 sm:-mt-8 md:-mt-10">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-brand px-3 py-1 text-xs font-semibold text-brand-foreground">
              {event.category}
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-foreground md:text-5xl">
              {event.title}
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">{event.subtitle}</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto grid gap-10 px-4 pb-24 lg:grid-cols-[1fr_400px]">
        <div className="space-y-8">
          <div className="grid gap-4 rounded-2xl border border-border bg-card p-6 shadow-card sm:grid-cols-2">
            <InfoRow icon={<Calendar className="h-5 w-5" />} label="Quando" value={formatEventDate(event.date)} />
            <InfoRow
              icon={<MapPin className="h-5 w-5" />}
              label="Onde"
              value={`${event.venue}, ${event.city}`}
              sub={event.address}
            />
            {event.organizerSlug ? (
              <div className="flex gap-3">
                <div className="bg-gradient-brand grid h-10 w-10 flex-none place-items-center rounded-lg text-brand-foreground">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Organizador</p>
                  <Link
                    to="/organizador/$slug"
                    params={{ slug: event.organizerSlug }}
                    className="font-medium text-foreground hover:text-brand"
                  >
                    {event.organizer}
                  </Link>
                </div>
              </div>
            ) : (
              <InfoRow icon={<User className="h-5 w-5" />} label="Organizador" value={event.organizer} />
            )}
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: event.title,
                    text: `Confira este evento: ${event.title}`,
                    url: window.location.href,
                  }).catch(() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success("Link copiado!");
                  });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copiado!");
                }
              }}
              className="flex w-full items-start gap-3 text-left transition-opacity hover:opacity-80"
            >
              <div className="bg-gradient-brand grid h-10 w-10 flex-none place-items-center rounded-lg text-brand-foreground">
                <Share2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Compartilhar</p>
                <p className="font-medium text-foreground">Envie para amigos</p>
              </div>
            </button>
          </div>

          <div>
            <h2 className="font-display text-2xl font-bold">Sobre o evento</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{event.description}</p>
          </div>

          {event.highlights.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold">Destaques</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {event.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                    <span className="mt-0.5 text-brand">✦</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="mb-4 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-brand" />
              <h3 className="font-display text-lg font-bold">TTBs</h3>
            </div>
            <div className="space-y-3">
              {event.tiers.map((tier) => {
                const qty = quantities[tier.id] ?? 0;
                const soldOut = tier.available <= 0;
                return (
                  <div
                    key={tier.id}
                    className="rounded-xl border border-border p-4 transition-colors hover:border-brand"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{tier.name}</p>
                        {tier.description && (
                          <p className="text-xs text-muted-foreground">{tier.description}</p>
                        )}
                      </div>
                      <div className="text-right">
                        {tier.price + tier.fee === 0 ? (
                          <p className="font-display text-lg font-bold text-brand">Grátis</p>
                        ) : (
                          <>
                            <p className="font-display text-lg font-bold">{formatBRL(tier.price)}</p>
                            <p className="text-[10px] text-muted-foreground">
                              + {formatBRL(tier.fee)} taxa
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-[11px] font-medium text-brand">
                        {soldOut ? "Esgotado" : `${tier.available} disponíveis`}
                      </p>
                      {!soldOut && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setQty(tier.id, qty - 1, tier.available)}
                            className="grid h-8 w-8 place-items-center rounded-full border border-border transition hover:border-brand disabled:opacity-40"
                            disabled={qty === 0}
                            aria-label="Diminuir"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(tier.id, qty + 1, tier.available)}
                            className="grid h-8 w-8 place-items-center rounded-full border border-border transition hover:border-brand disabled:opacity-40"
                            disabled={qty >= Math.min(10, tier.available)}
                            aria-label="Aumentar"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {totalSelected > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3 text-sm">
                <span className="text-muted-foreground">
                  {totalSelected} ingresso{totalSelected > 1 ? "s" : ""}
                </span>
                <span className="font-display text-lg font-bold">
                  {isFreeOrder ? "Grátis" : formatBRL(totalCents / 100)}
                </span>
              </div>
            )}

            <button
              onClick={handleBuy}
              disabled={totalSelected === 0 || generating || authLoading}
              className="bg-gradient-brand mt-5 w-full rounded-xl py-3 text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {totalSelected === 0
                ? "Selecione ingressos"
                : isFreeOrder
                  ? generating
                    ? "Gerando ingresso..."
                    : user
                      ? "Gerar ingresso"
                      : "Entrar para gerar ingresso"
                  : "Comprar ingressos"}
            </button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              {isFreeOrder
                ? "TTB gratuito · Disponível em Meus ingressos"
                : "Pagamento seguro · TTB digital com QR Code"}
            </p>
          </div>
        </aside>
      </section>

      <SiteFooter />
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="bg-gradient-brand grid h-10 w-10 flex-none place-items-center rounded-lg text-brand-foreground">
        {icon}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-medium text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}
