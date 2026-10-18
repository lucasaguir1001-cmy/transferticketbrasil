import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Ticket, DollarSign, CheckCircle2, ShoppingBag, QrCode, Pencil, RotateCcw, Loader2, Download, XCircle } from "lucide-react";
import { fetchEventForEdit, fetchEventSales, fetchEventParticipants, type ParticipantRow } from "@/lib/painel-data";
import { formatBRL } from "@/lib/events-data";
import { refundOrder } from "@/lib/refunds.functions";
import { CheckinShareButton } from "@/components/checkin-share-button";

export const Route = createFileRoute("/_authenticated/painel/eventos/$id/vendas")({
  head: () => ({
    meta: [
      { name: "description", content: "Pedidos e participantes do seu evento na Transfer Ticket Brasil." },
      { property: "og:title", content: "Vendas do evento — Transfer Ticket Brasil" },
      { property: "og:description", content: "Pedidos e participantes do seu evento na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: "Vendas do evento — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SalesDashboard,
});

function SalesDashboard() {
  const { id } = Route.useParams();

  const { data: event } = useQuery({
    queryKey: ["painel-event", id],
    queryFn: () => fetchEventForEdit(id),
  });
  const { data: stats, isLoading } = useQuery({
    queryKey: ["painel-sales", id],
    queryFn: () => fetchEventSales(id),
  });
  const { data: participants = [] } = useQuery({
    queryKey: ["painel-participants", id],
    queryFn: () => fetchEventParticipants(id),
  });

  const qc = useQueryClient();
  const doRefund = useServerFn(refundOrder);
  const [refundingId, setRefundingId] = useState<string | null>(null);

  const handleRefund = async (orderId: string) => {
    if (!confirm("Reembolsar este pedido? Os ingressos serão cancelados.")) return;
    setRefundingId(orderId);
    try {
      await doRefund({ data: { orderId } });
      toast.success("Reembolso realizado.");
      qc.invalidateQueries({ queryKey: ["painel-participants", id] });
      qc.invalidateQueries({ queryKey: ["painel-sales", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha no reembolso.");
    } finally {
      setRefundingId(null);
    }
  };

  const maxByDay = Math.max(1, ...(stats?.byDay.map((d) => d.count) ?? [1]));

  const validationReport = useMemo(() => aggregateValidation(participants), [participants]);
  const cancellationReport = useMemo(() => aggregateCancellations(participants), [participants]);

  return (
    <div className="space-y-6">
      <Link
        to="/painel"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Dashboard</p>
          <h2 className="truncate font-display text-2xl font-bold">{event?.title ?? "Vendas"}</h2>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Link
            to="/painel/eventos/$id"
            params={{ id }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="h-3 w-3" /> Editar
          </Link>
          <Link
            to="/painel/eventos/$id/cupons"
            params={{ id }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            Cupons
          </Link>
          <CheckinShareButton eventId={id} eventTitle={event?.title} />
          <Link
            to="/checkin/$id"
            params={{ id }}
            className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
          >
            <QrCode className="h-3 w-3" /> Check-in
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={<DollarSign className="h-4 w-4" />}
          label="Receita"
          value={isLoading ? "…" : formatBRL((stats?.revenueCents ?? 0) / 100)}
        />
        <Stat
          icon={<Ticket className="h-4 w-4" />}
          label="TTBs vendidos"
          value={isLoading ? "…" : String(stats?.ticketsSold ?? 0)}
        />
        <Stat
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Check-ins"
          value={isLoading ? "…" : String(stats?.ticketsCheckedIn ?? 0)}
        />
        <Stat
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Pedidos"
          value={isLoading ? "…" : String(stats?.ordersCount ?? 0)}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-bold">Vendas por dia</h3>
        {stats && stats.byDay.length > 0 ? (
          <div className="mt-4 flex h-40 items-end gap-2">
            {stats.byDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="bg-gradient-brand w-full rounded-t-md transition-all"
                  style={{ height: `${(d.count / maxByDay) * 100}%`, minHeight: "4px" }}
                  title={`${d.count} ingressos`}
                />
                <span className="text-[10px] text-muted-foreground">
                  {new Date(d.day).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    timeZone: "UTC",
                  })}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Sem vendas ainda.</p>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-lg font-bold">Vendas por lote</h3>
        <div className="mt-4 space-y-3">
          {stats?.byTier.map((t) => {
            const pct = t.total > 0 ? (t.sold / t.total) * 100 : 0;
            return (
              <div key={t.tierId}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{t.tierName}</span>
                  <span className="text-muted-foreground">
                    {t.sold}/{t.total} · {formatBRL(t.revenueCents / 100)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-gradient-brand h-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
          {stats && stats.byTier.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum lote cadastrado.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ReportCard
          title="Relatório por tipo de ingresso"
          description="Quantidade vendida, disponível e receita por lote."
          onExport={
            stats && stats.byTier.length > 0
              ? () =>
                  downloadReportCsv("relatorio-tipos-ingresso.csv", ["Lote", "Vendidos", "Disponíveis", "Total", "Receita"], stats.byTier.map((t) => [
                    t.tierName,
                    String(t.sold),
                    String(t.total - t.sold),
                    String(t.total),
                    formatBRL(t.revenueCents / 100),
                  ]))
              : undefined
          }
        >
          <ReportTable
            head={["Lote", "Vendidos", "Disponíveis", "Receita"]}
            rows={stats?.byTier.map((t) => [
              t.tierName,
              `${t.sold}/${t.total}`,
              String(Math.max(0, t.total - t.sold)),
              formatBRL(t.revenueCents / 100),
            ]) ?? []}
            empty="Nenhum lote cadastrado."
          />
        </ReportCard>

        <ReportCard
          title="Relatório de validação"
          description={`${validationReport.totalCheckedIn} de ${validationReport.totalValid} ingressos validados (${validationReport.percentage}%).`}
          onExport={
            validationReport.rows.length > 0
              ? () =>
                  downloadReportCsv("relatorio-validacao.csv", ["Lote", "Validados", "Pendentes", "Total válido", "% validado"], validationReport.rows.map((r) => [
                    r.tierName,
                    String(r.checkedIn),
                    String(r.pending),
                    String(r.valid),
                    `${r.percentage}%`,
                  ]))
              : undefined
          }
        >
          <ReportTable
            head={["Lote", "Validados", "Pendentes", "% validado"]}
            rows={validationReport.rows.map((r) => [
              r.tierName,
              String(r.checkedIn),
              String(r.pending),
              `${r.percentage}%`,
            ])}
            empty="Sem ingressos válidos para validar."
          />
        </ReportCard>

        <ReportCard
          title="Relatório de cancelamentos"
          description={`${cancellationReport.totalCancelled} ingresso(s) cancelado(s) / reembolsado(s).`}
          onExport={
            cancellationReport.rows.length > 0
              ? () =>
                  downloadReportCsv("relatorio-cancelamentos.csv", ["Lote", "Cancelados", "% do lote"], cancellationReport.rows.map((r) => [
                    r.tierName,
                    String(r.cancelled),
                    `${r.percentage}%`,
                  ]))
              : undefined
          }
        >
          <ReportTable
            head={["Lote", "Cancelados", "% do lote"]}
            rows={cancellationReport.rows.map((r) => [
              r.tierName,
              String(r.cancelled),
              `${r.percentage}%`,
            ])}
            empty="Nenhum cancelamento registrado."
          />
          {cancellationReport.recent.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Cancelamentos recentes
              </p>
              <ul className="space-y-1.5 text-xs">
                {cancellationReport.recent.slice(0, 5).map((r) => (
                  <li key={r.ticketId} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate">
                      <XCircle className="h-3 w-3 shrink-0 text-destructive" />
                      <span className="truncate">{r.buyerName ?? r.buyerEmail ?? r.code}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">{r.tierName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ReportCard>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-bold">Participantes</h3>
            <p className="text-xs text-muted-foreground">
              {participants.length} ingresso{participants.length !== 1 ? "s" : ""} emitido
              {participants.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => downloadCsv(participants)}
            className="rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            disabled={participants.length === 0}
          >
            Exportar CSV
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Comprador</th>
                <th className="pb-2 pr-3 font-medium">Lote</th>
                <th className="pb-2 pr-3 font-medium">Código</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 pr-3 font-medium">Compra</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const refunded = p.refundStatus === "refunded" || p.orderStatus === "refunded";
                return (
                  <tr key={p.ticketId} className="border-b border-border/50 last:border-0">
                    <td className="py-2.5 pr-3">
                      <p className="font-medium">{p.buyerName ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{p.buyerEmail ?? "—"}</p>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{p.tierName}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{p.code}</td>
                    <td className="py-2.5 pr-3">
                      <StatusBadge status={p.status} checkedInAt={p.checkedInAt} />
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </td>
                    <td className="py-2.5 text-right">
                      {refunded ? (
                        <span className="text-[10px] uppercase text-muted-foreground">Reembolsado</span>
                      ) : (
                        <button
                          onClick={() => handleRefund(p.orderId)}
                          disabled={refundingId === p.orderId}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-medium hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                        >
                          {refundingId === p.orderId ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          Reembolsar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {participants.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                    Nenhum ingresso emitido ainda.
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-bold">{value}</p>
    </div>
  );
}

function StatusBadge({ status, checkedInAt }: { status: string; checkedInAt: string | null }) {
  if (status === "used" || checkedInAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <CheckCircle2 className="h-3 w-3" /> Usado
      </span>
    );
  }
  if (status === "valid") {
    return (
      <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
        Válido
      </span>
    );
  }
  return (
    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive">
      {status}
    </span>
  );
}

function downloadCsv(rows: Array<{
  buyerName: string | null;
  buyerEmail: string | null;
  tierName: string;
  code: string;
  status: string;
  createdAt: string;
}>) {
  const header = ["Nome", "Email", "Lote", "Codigo", "Status", "Data"];
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      [r.buyerName ?? "", r.buyerEmail ?? "", r.tierName, r.code, r.status, r.createdAt]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "participantes.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function ReportCard({
  title,
  description,
  onExport,
  children,
}: {
  title: string;
  description?: string;
  onExport?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        <button
          onClick={onExport}
          disabled={!onExport}
          className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          <Download className="h-3 w-3" /> CSV
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ReportTable({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="pb-2 pr-3 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 last:border-0">
              {row.map((cell, j) => (
                <td key={j} className="py-2 pr-3">
                  {j === 0 ? <span className="font-medium">{cell}</span> : <span className="text-muted-foreground">{cell}</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function aggregateValidation(participants: ParticipantRow[]) {
  const map = new Map<string, { tierName: string; checkedIn: number; valid: number }>();
  for (const p of participants) {
    const refunded = p.refundStatus === "refunded" || p.orderStatus === "refunded";
    if (refunded) continue;
    const cur = map.get(p.tierName) ?? { tierName: p.tierName, checkedIn: 0, valid: 0 };
    cur.valid += 1;
    if (p.status === "used" || p.checkedInAt) cur.checkedIn += 1;
    map.set(p.tierName, cur);
  }
  const rows = Array.from(map.values()).map((r) => ({
    ...r,
    pending: r.valid - r.checkedIn,
    percentage: r.valid > 0 ? Math.round((r.checkedIn / r.valid) * 100) : 0,
  }));
  const totalCheckedIn = rows.reduce((s, r) => s + r.checkedIn, 0);
  const totalValid = rows.reduce((s, r) => s + r.valid, 0);
  const percentage = totalValid > 0 ? Math.round((totalCheckedIn / totalValid) * 100) : 0;
  return { rows, totalCheckedIn, totalValid, percentage };
}

function aggregateCancellations(participants: ParticipantRow[]) {
  const totalByTier = new Map<string, number>();
  const cancelledByTier = new Map<string, number>();
  const recent: ParticipantRow[] = [];
  for (const p of participants) {
    totalByTier.set(p.tierName, (totalByTier.get(p.tierName) ?? 0) + 1);
    const refunded = p.refundStatus === "refunded" || p.orderStatus === "refunded" || p.status === "cancelled" || p.status === "refunded";
    if (refunded) {
      cancelledByTier.set(p.tierName, (cancelledByTier.get(p.tierName) ?? 0) + 1);
      recent.push(p);
    }
  }
  const rows = Array.from(cancelledByTier.entries()).map(([tierName, cancelled]) => {
    const total = totalByTier.get(tierName) ?? 0;
    return {
      tierName,
      cancelled,
      percentage: total > 0 ? Math.round((cancelled / total) * 100) : 0,
    };
  });
  const totalCancelled = rows.reduce((s, r) => s + r.cancelled, 0);
  return { rows, totalCancelled, recent };
}

function downloadReportCsv(filename: string, header: string[], rows: string[][]) {
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
