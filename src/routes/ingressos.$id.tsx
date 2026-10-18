import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, Ticket as TicketIcon, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatEventDate } from "@/lib/events-data";

export const Route = createFileRoute("/ingressos/$id")({
  head: () => ({
    meta: [
      { name: "description", content: "Consulte seu ingresso digital na Transfer Ticket Brasil." },
      { property: "og:title", content: "Ingresso digital — Transfer Ticket Brasil" },
      { property: "og:description", content: "Consulte seu ingresso digital na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: "Transfer Ticket Brasil digital — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TicketPage,
});

interface TicketData {
  id: string;
  code: string;
  status: string;
  created_at: string;
  order_id: string;
  tier: { name: string };
  event: {
    title: string;
    slug: string;
    starts_at: string;
    venue: string | null;
    city: string | null;
    image_url: string | null;
  };
}

function TicketPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data, error } = await supabase
        .from("tickets")
        .select(
          "id, code, status, created_at, order_id, tier:ticket_tiers ( name ), event:events ( title, slug, starts_at, venue, city, image_url )",
        )
        .eq("id", id)
        .maybeSingle();
      if (error) setError(error.message);
      else if (!data) setError("TTB não encontrado.");
      else setTicket(data as unknown as TicketData);
      setLoading(false);
    })();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto grid place-items-center px-4 py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">TTB não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link
            to="/conta"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Voltar para minha conta
          </Link>
        </div>
      </div>
    );
  }

  const isValid = ticket.status === "valid";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="container mx-auto max-w-2xl px-4 py-10">
        <Link
          to="/conta"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Meus ingressos
        </Link>

        <article className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          {ticket.event.image_url && (
            <div className="relative h-40 w-full overflow-hidden sm:h-56">
              <img
                src={ticket.event.image_url}
                alt={ticket.event.title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5 text-white">
                <span className="inline-block rounded-full bg-brand/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                  {ticket.tier.name}
                </span>
                <h1 className="mt-2 font-display text-2xl font-bold leading-tight sm:text-3xl">
                  {ticket.event.title}
                </h1>
              </div>
            </div>
          )}

          <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-brand" />
                <span>{formatEventDate(ticket.event.starts_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-brand" />
                <span>
                  {ticket.event.venue}
                  {ticket.event.city ? `, ${ticket.event.city}` : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TicketIcon className="h-4 w-4 text-brand" />
                <span className="font-mono text-xs">{ticket.code}</span>
              </div>

              <div
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  isValid
                    ? "bg-brand/15 text-brand"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isValid ? "Válido" : ticket.status}
              </div>
            </div>

            <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-background p-4">
              <QRCodeSVG
                value={ticket.code}
                size={180}
                bgColor="transparent"
                fgColor="currentColor"
                className="text-foreground"
              />
            </div>
          </div>

          <div className="border-t border-border bg-secondary/40 px-6 py-4 text-xs text-muted-foreground sm:px-8">
            Apresente este QR Code na entrada do evento. Não compartilhe — cada
            código só pode ser utilizado uma vez.
          </div>
        </article>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/pedidos/$id"
            params={{ id: ticket.order_id }}
            className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold"
          >
            Ver pedido completo
          </Link>
          <Link
            to="/eventos/$slug"
            params={{ slug: ticket.event.slug }}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold"
          >
            Página do evento
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
