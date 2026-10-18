import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { checkMpPayment } from "@/lib/mercadopago.functions";

import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Calendar, MapPin, Ticket, Loader2, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL, formatEventDate } from "@/lib/events-data";

export const Route = createFileRoute("/pedidos/$id")({
  head: () => ({
    meta: [
      { name: "description", content: "Acompanhe seu pedido de ingressos na Transfer Ticket Brasil." },
      { property: "og:title", content: "Seu pedido — Transfer Ticket Brasil" },
      { property: "og:description", content: "Acompanhe seu pedido de ingressos na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: "Pedido confirmado — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrderPage,
});

interface OrderData {
  id: string;
  total_cents: number;
  currency: string;
  status: string;
  buyer_name: string | null;
  buyer_email: string | null;
  created_at: string;
  tickets: Array<{
    id: string;
    code: string;
    status: string;
    tier: { name: string };
    event: {
      title: string;
      slug: string;
      starts_at: string;
      venue: string | null;
      city: string | null;
      image_url: string | null;
    };
  }>;
}

function OrderPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const verifyPayment = useServerFn(checkMpPayment);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, total_cents, currency, status, buyer_name, buyer_email, created_at, tickets ( id, code, status, tier:ticket_tiers ( name ), event:events ( title, slug, starts_at, venue, city, image_url ) )",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) setError(error.message);
    else if (!data) setError("Pedido não encontrado.");
    else setOrder(data as unknown as OrderData);
    return data as unknown as OrderData | null;
  }, [id]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate({ to: "/auth" });
        return;
      }
      await load();
      setLoading(false);
    })();
  }, [id, navigate, load]);

  // Pedido pendente: revalida o pagamento no gateway até confirmar (ou recusar).
  useEffect(() => {
    if (!order || order.status !== "pending") return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      try {
        const r = await verifyPayment({ data: { orderId: id } });
        if (stopped) return;
        if (r.status === "paid" || r.status === "cancelled") {
          window.clearInterval(timer);
          await load();
        }
      } catch (err) {
        console.error("[order poll]", err);
      }
    }, 5000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [order, id, load, verifyPayment]);


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

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-2xl font-bold">Pedido não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          <Link
            to="/conta"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Ver meus pedidos
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.status === "paid";
  const isPending = order.status === "pending";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="container mx-auto px-4 py-10">
        {isPaid ? (
          <div className="rounded-2xl border border-brand/40 bg-brand/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand" />
            <h1 className="mt-3 font-display text-3xl font-bold">Pedido confirmado!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedido #{order.id.slice(0, 8).toUpperCase()} · Total{" "}
              <strong className="text-foreground">
                {formatBRL(order.total_cents / 100)}
              </strong>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Enviamos a confirmação para {order.buyer_email}
            </p>
          </div>
        ) : isPending ? (
          <div className="rounded-2xl border border-border bg-muted/40 p-6 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-brand" />
            <h1 className="mt-3 font-display text-3xl font-bold">Pagamento em análise</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pedido #{order.id.slice(0, 8).toUpperCase()} · Total{" "}
              <strong className="text-foreground">
                {formatBRL(order.total_cents / 100)}
              </strong>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Seus ingressos são liberados automaticamente assim que o pagamento for aprovado
              pela operadora do cartão. Esta página atualiza sozinha.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <h1 className="mt-3 font-display text-3xl font-bold">Pagamento não aprovado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Pedido #{order.id.slice(0, 8).toUpperCase()} — nenhum ingresso foi emitido.
              Tente novamente com outro cartão ou pague via Pix.
            </p>
            <Link
              to="/eventos"
              className="mt-5 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Voltar aos eventos
            </Link>
          </div>
        )}

        {isPaid && (
        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold">
            Seus ingressos ({order.tickets.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            Apresente o QR Code na entrada do evento.
          </p>


          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {order.tickets.map((t) => (
              <article
                key={t.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-card"
              >
                <div className="flex items-stretch">
                  <div className="flex-1 p-5">
                    <span className="inline-block rounded-full bg-brand/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                      {t.tier.name}
                    </span>
                    <h3 className="mt-2 font-display text-lg font-bold leading-tight">
                      {t.event.title}
                    </h3>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatEventDate(t.event.starts_at)}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {t.event.venue}
                      {t.event.city ? `, ${t.event.city}` : ""}
                    </p>
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-mono text-foreground">
                      <Ticket className="h-3.5 w-3.5 text-brand" />
                      {t.code}
                    </p>
                  </div>
                  <div className="grid place-items-center border-l border-dashed border-border bg-background p-4">
                    <QRCodeSVG
                      value={t.code}
                      size={112}
                      bgColor="transparent"
                      fgColor="currentColor"
                      className="text-foreground"
                    />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        )}


        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            to="/conta"
            className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Ver minha conta
          </Link>
          <Link
            to="/eventos"
            className="rounded-full border border-border px-6 py-3 text-sm font-semibold"
          >
            Explorar mais eventos
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
