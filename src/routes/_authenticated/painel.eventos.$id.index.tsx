import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus, ArrowLeft, BarChart3, QrCode, Eye, EyeOff, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchEventForEdit,
  fetchEventTiers,
  slugify,
  type PainelTierRow,
} from "@/lib/painel-data";
import { CATEGORIES, formatBRL } from "@/lib/events-data";
import { ImageUpload } from "@/components/image-upload";

export const Route = createFileRoute("/_authenticated/painel/eventos/$id/")({
  head: () => ({ meta: [
      { title: "Editar anúncio — Transfer Ticket Brasil" },
      { name: "description", content: "Edição do seu anúncio na Transfer Ticket Brasil." },
      { property: "og:title", content: "Editar anúncio — Transfer Ticket Brasil" },
      { property: "og:description", content: "Edição do seu anúncio na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
  ] }),
  component: EditEventPage,
});

function EditEventPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["painel-event", id],
    queryFn: () => fetchEventForEdit(id),
  });

  const [form, setForm] = useState<null | {
    title: string;
    slug: string;
    subtitle: string;
    description: string;
    category: string;
    city: string;
    venue: string;
    address: string;
    starts_at: string;
    status: "draft" | "published" | "ended" | "cancelled";
    image_url: string;
  }>(null);

  useEffect(() => {
    if (!event) return;
    setForm({
      title: event.title,
      slug: event.slug,
      subtitle: event.subtitle ?? "",
      description: event.description ?? "",
      category: event.category ?? CATEGORIES[0],
      city: event.city ?? "",
      venue: event.venue ?? "",
      address: event.address ?? "",
      starts_at: toLocalInput(event.starts_at),
      status: event.status,
      image_url: event.image_url ?? "",
    });
  }, [event]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Form não carregado");
      const { error } = await supabase
        .from("events")
        .update({
          title: form.title,
          slug: form.slug,
          subtitle: form.subtitle || null,
          description: form.description || null,
          category: form.category,
          city: form.city || null,
          venue: form.venue || null,
          address: form.address || null,
          starts_at: new Date(form.starts_at).toISOString(),
          status: form.status,
          image_url: form.image_url.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento salvo");
      qc.invalidateQueries({ queryKey: ["painel-event", id] });
      qc.invalidateQueries({ queryKey: ["painel-events"] });
      qc.invalidateQueries({ queryKey: ["events", "published"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento removido");
      navigate({ to: "/painel" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;

  return (
    <div className="space-y-6">
      <Link
        to="/painel"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/painel/eventos/$id/vendas"
          params={{ id }}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <BarChart3 className="h-3.5 w-3.5" /> Vendas
        </Link>
        <Link
          to="/painel/eventos/$id/cupons"
          params={{ id }}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          <Tag className="h-3.5 w-3.5" /> Cupons
        </Link>
        <button
          type="button"
          onClick={() => {
            const next = form.status === "published" ? "draft" : "published";
            setForm({ ...form, status: next });
            save.mutate();
          }}
          disabled={save.isPending}
          className={
            "ml-auto inline-flex items-center gap-1 rounded-full px-4 py-1.5 text-xs font-semibold " +
            (form.status === "published"
              ? "border border-border hover:bg-muted"
              : "bg-gradient-brand text-brand-foreground shadow-glow")
          }
        >
          {form.status === "published" ? (
            <>
              <EyeOff className="h-3.5 w-3.5" /> Despublicar
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" /> Publicar evento
            </>
          )}
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold">Editar evento</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajuste os dados e publique quando estiver pronto.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as typeof form.status })
              }
              className="input max-w-[180px]"
            >
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
              <option value="ended">Encerrado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="mt-6 grid gap-4 sm:grid-cols-2"
        >
          <Field label="Título" className="sm:col-span-2">
            <input
              value={form.title}
              required
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Slug">
            <input
              value={form.slug}
              required
              onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              className="input"
            />
          </Field>
          <Field label="Categoria">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="input"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Subtítulo" className="sm:col-span-2">
            <input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Cidade">
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Local">
            <input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Endereço" className="sm:col-span-2">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Data e hora" className="sm:col-span-2">
            <input
              type="datetime-local"
              required
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Imagem do evento" className="sm:col-span-2">
            <ImageUpload
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
            />
          </Field>
          <Field label="Descrição" className="sm:col-span-2">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              className="input"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="bg-gradient-brand rounded-full px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow disabled:opacity-50"
            >
              {save.isPending ? "Salvando..." : "Salvar alterações"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Remover este evento? Esta ação não pode ser desfeita.")) del.mutate();
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-full border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </button>
          </div>
        </form>
      </div>

      <TiersSection eventId={id} />

      <style>{`.input{width:100%;border-radius:0.75rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.75rem 1rem;font-size:0.875rem;outline:none;transition:border-color .15s}.input:focus{border-color:hsl(var(--brand))}`}</style>
    </div>
  );
}

function TiersSection({ eventId }: { eventId: string }) {
  const qc = useQueryClient();
  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["painel-tiers", eventId],
    queryFn: () => fetchEventTiers(eventId),
  });

  const [showNew, setShowNew] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["painel-tiers", eventId] });

  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-xl font-bold">Lotes de ingresso</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina categorias, preços e quantidades disponíveis.
          </p>
        </div>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="bg-gradient-brand inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold text-brand-foreground shadow-glow"
        >
          <Plus className="h-3 w-3" /> Novo lote
        </button>
      </div>

      {showNew && (
        <TierForm
          eventId={eventId}
          sortOrder={tiers.length}
          onDone={() => {
            setShowNew(false);
            refresh();
          }}
        />
      )}

      <div className="mt-6 space-y-3">
        {isLoading ? (
          <div className="h-16 animate-pulse rounded-xl bg-muted" />
        ) : tiers.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum lote cadastrado ainda.
          </p>
        ) : (
          tiers.map((t) => <TierRow key={t.id} tier={t} onChanged={refresh} />)
        )}
      </div>
    </div>
  );
}

function TierRow({ tier, onChanged }: { tier: PainelTierRow; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("ticket_tiers").delete().eq("id", tier.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lote removido");
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (editing) {
    return (
      <TierForm
        eventId={tier.event_id}
        tier={tier}
        sortOrder={tier.sort_order}
        onDone={() => {
          setEditing(false);
          onChanged();
        }}
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
      <div className="flex-1">
        <p className="font-semibold">{tier.name}</p>
        {tier.description && (
          <p className="text-xs text-muted-foreground">{tier.description}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatBRL(tier.price_cents / 100)} + {formatBRL(tier.fee_cents / 100)} taxa ·{" "}
          {tier.quantity_available}/{tier.quantity_total} disponíveis
        </p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        Editar
      </button>
      <button
        onClick={() => {
          if (confirm("Remover este lote?")) del.mutate();
        }}
        className="rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
      >
        Remover
      </button>
    </div>
  );
}

function TierForm({
  eventId,
  tier,
  sortOrder,
  onDone,
}: {
  eventId: string;
  tier?: PainelTierRow;
  sortOrder: number;
  onDone: () => void;
}) {
  const [name, setName] = useState(tier?.name ?? "");
  const [description, setDescription] = useState(tier?.description ?? "");
  const [price, setPrice] = useState(tier ? tier.price_cents / 100 : 0);
  const [fee, setFee] = useState(tier ? tier.fee_cents / 100 : 0);
  const [quantity, setQuantity] = useState(tier?.quantity_total ?? 100);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        event_id: eventId,
        name: name.trim(),
        description: description.trim() || null,
        price_cents: Math.round(price * 100),
        fee_cents: Math.round(fee * 100),
        quantity_total: quantity,
        quantity_available: tier
          ? Math.max(0, tier.quantity_available + (quantity - tier.quantity_total))
          : quantity,
        sort_order: sortOrder,
      };
      if (tier) {
        const { error } = await supabase.from("ticket_tiers").update(payload).eq("id", tier.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ticket_tiers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(tier ? "Lote atualizado" : "Lote criado");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="mt-4 grid gap-3 rounded-xl border border-border bg-background p-5 sm:grid-cols-2"
    >
      <label className="sm:col-span-2 block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Nome</span>
        <input value={name} required onChange={(e) => setName(e.target.value)} className="input" />
      </label>
      <label className="sm:col-span-2 block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Descrição</span>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Preço (R$)</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={price}
          onChange={(e) => setPrice(Number(e.target.value))}
          className="input"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">Taxa (R$)</span>
        <input
          type="number"
          min={0}
          step={0.01}
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          className="input"
        />
      </label>
      <label className="sm:col-span-2 block">
        <span className="mb-1 block text-xs font-medium text-muted-foreground">
          Quantidade total
        </span>
        <input
          type="number"
          min={0}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="input"
        />
      </label>
      <div className="flex gap-2 sm:col-span-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="bg-gradient-brand rounded-full px-5 py-2 text-xs font-semibold text-brand-foreground shadow-glow disabled:opacity-50"
        >
          {save.isPending ? "Salvando..." : tier ? "Salvar lote" : "Criar lote"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={"block " + (className ?? "")}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
