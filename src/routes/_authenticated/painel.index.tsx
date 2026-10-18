import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Pencil, ExternalLink, BarChart3, QrCode, Eye, EyeOff, Check, X, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchMyEvents,
  fetchMyOrganizer,
  slugify,
} from "@/lib/painel-data";
import { formatEventDate } from "@/lib/events-data";
import { CheckinShareButton } from "@/components/checkin-share-button";

export const Route = createFileRoute("/_authenticated/painel/")({
  head: () => ({ meta: [
      { title: "Meus anúncios — Transfer Ticket Brasil" },
      { name: "description", content: "Anúncios e vendas do vendedor na Transfer Ticket Brasil." },
      { property: "og:title", content: "Meus anúncios — Transfer Ticket Brasil" },
      { property: "og:description", content: "Anúncios e vendas do vendedor na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
  ] }),
  component: PainelIndex,
});


function PainelIndex() {
  const qc = useQueryClient();
  const { data: userRes } = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  const { data: organizer, isLoading: loadingOrg } = useQuery({
    queryKey: ["my-organizer"],
    queryFn: fetchMyOrganizer,
  });

  if (loadingOrg) {
    return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  }

  // Se o organizador não existe, retornamos o componente MyEvents com um ID nulo
  // para permitir a visualização da tela de eventos sem forçar criação de perfil
  return <MyEvents organizerId={organizer?.id || ""} organizerName={organizer?.name || "Minha Conta"} />;
}

function MyEvents({ organizerId, organizerName }: { organizerId: string; organizerName: string }) {
  const qc = useQueryClient();
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["painel-events", organizerId],
    queryFn: () => organizerId ? fetchMyEvents(organizerId) : Promise.resolve([]),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "draft" | "published" }) => {
      const next = status === "published" ? "draft" : "published";
      const { error } = await supabase.from("events").update({ status: next }).eq("id", id);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(next === "published" ? "Evento publicado" : "Evento despublicado");
      qc.invalidateQueries({ queryKey: ["painel-events", organizerId] });
      qc.invalidateQueries({ queryKey: ["events", "published"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">{organizerName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isLoading ? "Carregando..." : `${events.length} evento${events.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Link
          to="/painel/eventos/novo"
          className="bg-gradient-brand rounded-full px-4 py-2 text-sm font-semibold text-brand-foreground shadow-glow transition-transform hover:scale-105"
        >
          Anunciar
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="font-display text-lg font-semibold">Nenhuma Venda ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro Anúncio e venda seus ingressos.
          </p>
          <Link
            to="/painel/eventos/novo"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
          >
            Anunciar
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li
              key={e.id}
              className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center"
            >
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide " +
                      (e.status === "published"
                        ? "bg-brand text-brand-foreground"
                        : e.status === "draft"
                          ? "bg-muted text-muted-foreground"
                          : "bg-destructive/20 text-destructive")
                    }
                  >
                    {e.status}
                  </span>
                  <p className="font-display text-lg font-semibold">{e.title}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatEventDate(e.starts_at)} · {e.venue ?? "—"}, {e.city ?? "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(e.status === "published" || e.status === "draft") && (
                  <button
                    onClick={() =>
                      togglePublish.mutate({
                        id: e.id,
                        status: e.status as "draft" | "published",
                      })
                    }
                    disabled={togglePublish.isPending}
                    className={
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50 " +
                      (e.status === "published"
                        ? "border border-border hover:bg-muted"
                        : "bg-gradient-brand text-brand-foreground shadow-glow")
                    }
                  >
                    {e.status === "published" ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Despublicar
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Publicar
                      </>
                    )}
                  </button>
                )}
                <Link
                  to="/painel/eventos/$id/vendas"
                  params={{ id: e.id }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <ArrowRight className="h-3 w-3" /> Ver Vendas
                </Link>
                <Link
                  to="/painel/eventos/$id"
                  params={{ id: e.id }}
                  className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  <Pencil className="h-3 w-3" /> Editar
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}