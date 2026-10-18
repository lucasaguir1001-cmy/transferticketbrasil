import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Camera, CheckCircle2, XCircle, Keyboard, Share2 } from "lucide-react";
import { checkInTicketByCode, fetchEventForEdit } from "@/lib/painel-data";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/checkin/$id")({
  head: () => ({
    meta: [
      { name: "description", content: "Validação de ingressos para vendedores da Transfer Ticket Brasil." },
      { property: "og:title", content: "Check-in — Transfer Ticket Brasil" },
      { property: "og:description", content: "Validação de ingressos para vendedores da Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },

      { title: "Check-in — TTB" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckinPage,
});

type Result =
  | { type: "success"; code: string; buyer: string | null; tier: string }
  | { type: "error"; code: string; message: string };

function CheckinPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const { data: event } = useQuery({
    queryKey: ["painel-event", id],
    queryFn: () => fetchEventForEdit(id),
  });

  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [history, setHistory] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const lastScanRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);

  async function handleCode(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || busy) return;
    // Debounce identical scans within 3s
    const now = Date.now();
    if (lastScanRef.current.code === trimmed && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code: trimmed, at: now };

    setBusy(true);
    try {
      const res = await checkInTicketByCode(id, trimmed);
      if (res.ok) {
        const tier = (res.ticket.tier as { name: string } | null)?.name ?? "—";
        const buyer =
          (res.ticket.order as { buyer_name: string | null } | null)?.buyer_name ?? null;
        setHistory((h) => [{ type: "success" as const, code: trimmed, buyer, tier }, ...h].slice(0, 20));
        toast.success(`Entrada liberada · ${tier}`);
        try { navigator.vibrate?.(120); } catch { /* noop */ }
        playBeep(true);
        qc.invalidateQueries({ queryKey: ["painel-sales", id] });
        qc.invalidateQueries({ queryKey: ["painel-participants", id] });
      } else {
        const messages: Record<string, string> = {
          not_found: "TTB não encontrado",
          wrong_event: "TTB é de outro evento",
          already_used: "TTB já utilizado",
          invalid_status: "TTB inválido ou cancelado",
        };
        const message = messages[res.reason] ?? "Falha na validação";
        setHistory((h) => [{ type: "error" as const, code: trimmed, message }, ...h].slice(0, 20));
        toast.error(message);
        try { navigator.vibrate?.([80, 60, 80]); } catch { /* noop */ }
        playBeep(false);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro ao validar";
      setHistory((h) => [{ type: "error" as const, code: trimmed, message: msg }, ...h].slice(0, 20));
      toast.error(msg);
      playBeep(false);
    } finally {
      setBusy(false);
    }
  }

  function playBeep(ok: boolean) {
    try {
      const Ctx: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = ok ? 880 : 220;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.24);
      setTimeout(() => ctx.close().catch(() => {}), 400);
    } catch { /* noop */ }
  }

  async function shareLink() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: "Check-in — TTB", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado. Abra no celular pra validar.");
      }
    } catch { /* noop */ }
  }


  useEffect(() => {
    if (!scanning) return;
    let disposed = false;
    let instance: unknown = null;

    (async () => {
      try {
        const mod = await import("html5-qrcode");
        if (disposed) return;
        const Html5Qrcode = mod.Html5Qrcode;
        const qr = new Html5Qrcode("qr-reader");
        instance = qr;
        await qr.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => handleCode(decodedText),
          () => {},
        );
        scannerRef.current = {
          stop: () => qr.stop().catch(() => {}),
          clear: () => qr.clear(),
        };
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Não foi possível acessar a câmera",
        );
        setScanning(false);
      }
    })();

    return () => {
      disposed = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        s.stop().finally(() => {
          try {
            s.clear();
          } catch {
            /* noop */
          }
        });
      } else if (instance && typeof (instance as { stop?: () => Promise<void> }).stop === "function") {
        (instance as { stop: () => Promise<void> }).stop().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">

      <Link
        to="/painel/eventos/$id/vendas"
        params={{ id }}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Vendas
      </Link>

      <div className="rounded-2xl border border-brand/50 bg-brand/10 p-4 shadow-glow hidden">
        <Button
          type="button"
          onClick={shareLink}
          size="lg"
          aria-label="Abrir validador no celular"
          className="h-14 w-full rounded-xl bg-gradient-brand text-base font-bold text-brand-foreground shadow-glow sm:text-lg"
        >
          <Share2 className="h-5 w-5" /> Abrir no celular
        </Button>
        <p className="mt-2 text-center text-sm font-semibold text-brand">
          Botão para enviar ou copiar o link da portaria para o celular.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Portaria</p>
          <h2 className="font-display text-2xl font-bold">
            Check-in · {event?.title ?? "Evento"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aponte a câmera para o QR Code do ingresso ou digite o código manualmente.
          </p>
        </div>
      </div>


      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-lg font-bold">Leitor de QR</h3>
            <button
              onClick={() => setScanning((v) => !v)}
              className={
                "inline-flex items-center gap-1 rounded-full px-4 py-2 text-xs font-semibold " +
                (scanning
                  ? "border border-destructive/40 text-destructive hover:bg-destructive/10"
                  : "bg-gradient-brand text-brand-foreground shadow-glow")
              }
            >
              <Camera className="h-3.5 w-3.5" />
              {scanning ? "Parar câmera" : "Iniciar câmera"}
            </button>
          </div>

          <div
            id="qr-reader"
            className="mt-4 aspect-square w-full overflow-hidden rounded-2xl border border-dashed border-border bg-background"
          />


          {!scanning && (
            <p className="mt-3 text-xs text-muted-foreground">
              Autorize o acesso à câmera do dispositivo para ler os ingressos.
            </p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!manualCode.trim()) return;
              handleCode(manualCode);
              setManualCode("");
            }}
            className="mt-6 flex flex-wrap items-end gap-2 border-t border-border pt-6"
          >
            <label className="flex-1 min-w-[220px]">
              <span className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Keyboard className="h-3 w-3" /> Código manual
              </span>
              <input
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-mono outline-none focus:border-brand"
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="rounded-full border border-border px-5 py-2.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
            >
              Validar
            </button>
          </form>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h3 className="font-display text-lg font-bold">Últimas leituras</h3>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma leitura ainda. Comece o check-in.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {history.map((r, i) => (
                <li
                  key={i}
                  className={
                    "flex items-start gap-2 rounded-xl border p-3 text-sm " +
                    (r.type === "success"
                      ? "border-brand/40 bg-brand/5"
                      : "border-destructive/30 bg-destructive/5")
                  }
                >
                  {r.type === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className="font-mono text-xs">{r.code}</p>
                    {r.type === "success" ? (
                      <p className="text-xs text-muted-foreground">
                        {r.buyer ?? "—"} · {r.tier}
                      </p>
                    ) : (
                      <p className="text-xs text-destructive">{r.message}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

