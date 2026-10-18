import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { upsertCoupon, deleteCoupon } from "@/lib/coupons.functions";

export const Route = createFileRoute("/_authenticated/painel/eventos/$id/cupons")({
  head: () => ({
    meta: [
      { name: "description", content: "Gestão de cupons dos seus eventos na Transfer Ticket Brasil." },
      { property: "og:title", content: "Cupons do evento — Transfer Ticket Brasil" },
      { property: "og:description", content: "Gestão de cupons dos seus eventos na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: "Cupons — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CouponsPage,
});

type CouponRow = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_until: string | null;
  active: boolean;
};

function CouponsPage() {
  const { id: eventId } = Route.useParams();
  const qc = useQueryClient();
  const save = useServerFn(upsertCoupon);
  const remove = useServerFn(deleteCoupon);

  const { data: coupons = [], refetch } = useQuery<CouponRow[]>({
    queryKey: ["coupons", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("id, code, discount_type, discount_value, max_uses, uses_count, valid_until, active")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CouponRow[];
    },
  });

  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [maxUses, setMaxUses] = useState<string>("");
  const [validUntil, setValidUntil] = useState<string>("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await save({
        data: {
          eventId,
          code: code.trim(),
          discountType,
          discountValue,
          maxUses: maxUses ? Number(maxUses) : null,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          active: true,
        },
      });
      toast.success("Cupom criado.");
      setCode("");
      setDiscountValue(10);
      setMaxUses("");
      setValidUntil("");
      qc.invalidateQueries({ queryKey: ["coupons", eventId] });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar cupom.");
    }
  };

  const handleToggle = async (c: CouponRow) => {
    try {
      await save({
        data: {
          id: c.id,
          eventId,
          code: c.code,
          discountType: c.discount_type,
          discountValue: c.discount_value,
          maxUses: c.max_uses,
          validUntil: c.valid_until,
          active: !c.active,
        },
      });
      qc.invalidateQueries({ queryKey: ["coupons", eventId] });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir cupom?")) return;
    try {
      await remove({ data: { id } });
      qc.invalidateQueries({ queryKey: ["coupons", eventId] });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha.");
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/painel/eventos/$id"
        params={{ id: eventId }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Descontos</p>
        <h2 className="font-display text-2xl font-bold">Cupons deste evento</h2>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm sm:col-span-2 lg:col-span-1">
          <span className="text-xs uppercase text-muted-foreground">Código</span>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="PROMO10"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-muted-foreground">Tipo</span>
          <select
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="percent">% do total</option>
            <option value="fixed">R$ fixo</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-muted-foreground">
            Valor {discountType === "percent" ? "(%)" : "(R$)"}
          </span>
          <input
            type="number"
            required
            min={1}
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-muted-foreground">Limite de usos</span>
          <input
            type="number"
            min={1}
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            placeholder="Ilimitado"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-xs uppercase text-muted-foreground">Válido até</span>
          <input
            type="datetime-local"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            className="bg-gradient-brand inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-brand-foreground shadow-glow"
          >
            <Plus className="h-4 w-4" /> Criar cupom
          </button>
        </div>
      </form>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-bold">
          <Tag className="mr-2 inline h-4 w-4" />
          Cupons ativos
        </h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Código</th>
                <th className="pb-2 pr-3 font-medium">Desconto</th>
                <th className="pb-2 pr-3 font-medium">Usos</th>
                <th className="pb-2 pr-3 font-medium">Validade</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0">
                  <td className="py-2.5 pr-3 font-mono font-semibold">{c.code}</td>
                  <td className="py-2.5 pr-3">
                    {c.discount_type === "percent" ? `${c.discount_value}%` : `R$ ${c.discount_value}`}
                  </td>
                  <td className="py-2.5 pr-3 text-muted-foreground">
                    {c.uses_count}
                    {c.max_uses !== null ? `/${c.max_uses}` : ""}
                  </td>
                  <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                    {c.valid_until
                      ? new Date(c.valid_until).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })
                      : "—"}
                  </td>
                  <td className="py-2.5 pr-3">
                    <button
                      onClick={() => handleToggle(c)}
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase " +
                        (c.active
                          ? "bg-brand/15 text-brand"
                          : "bg-muted text-muted-foreground")
                      }
                    >
                      {c.active ? "Ativo" : "Inativo"}
                    </button>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum cupom criado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
