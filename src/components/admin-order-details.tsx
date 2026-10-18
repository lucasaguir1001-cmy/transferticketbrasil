import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getOwnerOrderDetails } from "@/lib/owner.functions";

const brl = (c: number, cur = "BRL") => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: cur });
const dt = (v: string | null | undefined) => (v ? new Date(v).toLocaleString("pt-BR") : "—");
const payType: Record<string, string> = { credit_card: "Cartão de crédito", debit_card: "Cartão de débito", bank_transfer: "Pix", account_money: "Saldo Mercado Pago", ticket: "Boleto" };
const ticketStatus: Record<string, string> = { valid: "Válido", used: "Utilizado", cancelled: "Cancelado" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-border py-2 text-sm"><span className="text-muted-foreground">{label}</span><span className="break-all text-right font-medium">{value || "—"}</span></div>;
}

export function AdminOrderDetails({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const fn = useServerFn(getOwnerOrderDetails);
  const q = useQuery({ queryKey: ["owner-order", orderId], queryFn: () => fn({ data: { id: orderId } }) });
  const [subject, setSubject] = useState("Seu pedido na Transfer Ticket Brasil");
  const [body, setBody] = useState("");
  const d = q.data;
  const email = d?.order.buyer_email || d?.customer.login_email || "";
  const p = d?.payment;
  const method = p ? `${payType[p.type ?? ""] ?? p.type ?? ""}${p.method && p.type !== "bank_transfer" ? ` · ${p.method.toUpperCase()}` : ""}${p.last_four ? ` final ${p.last_four}` : ""}${p.installments && p.installments > 1 ? ` · ${p.installments}x` : ""}` : d?.order.provider === "syncpay" ? "SyncPay (Pix)" : d?.order.provider === "mercadopago" ? "Mercado Pago" : d?.order.provider;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>Detalhes do pedido</DialogTitle><DialogDescription className="font-mono text-xs">{orderId}</DialogDescription></DialogHeader>
        {q.isLoading && <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>}
        {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
        {d && <div className="space-y-6">
          <section><h3 className="mb-2 font-semibold">Cliente</h3>
            <Row label="Nome no pedido" value={d.order.buyer_name} />
            <Row label="Nome no cadastro" value={d.customer.full_name} />
            <Row label="E-mail do pedido" value={d.order.buyer_email} />
            <Row label="Login (e-mail)" value={d.customer.login_email} />
            <Row label="Forma de login" value={d.customer.login_providers.map((x) => x === "google" ? "Google" : x === "email" ? "E-mail e senha" : x).join(", ")} />
            <Row label="Telefone" value={d.customer.phone} />
            <Row label="CPF (pagamento)" value={p?.payer_document} />
            <Row label="Conta criada em" value={dt(d.customer.created_at)} />
            <Row label="Último acesso" value={dt(d.customer.last_sign_in_at)} />
            <Row label="Senha" value="Protegida — não pode ser visualizada" />
          </section>
          <section><h3 className="mb-2 font-semibold">Pagamento</h3>
            <Row label="Forma de pagamento" value={method} />
            <Row label="Total" value={brl(d.order.total_cents, d.order.currency)} />
            <Row label="Desconto" value={brl(d.order.discount_cents, d.order.currency)} />
            <Row label="Situação" value={d.order.status} />
            <Row label="Detalhe" value={p?.status_detail} />
            {d.order.provider === "syncpay" ? (
              <Row label="ID Transação SyncPay" value={d.order.provider_ref ?? d.order.mp_payment_id} />
            ) : (
              <Row label="ID Mercado Pago" value={d.order.mp_payment_id} />
            )}
            <Row label="Reembolso" value={d.order.refund_status} />
            <Row label="Data" value={dt(d.order.created_at)} />
          </section>
          <section><h3 className="mb-2 font-semibold">Itens</h3>
            {d.items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item.</p>}
            {d.items.map((i: any) => <Row key={i.id} label={`${i.quantity}× ${i.tier?.name ?? "Ingresso"} — ${i.tier?.event?.title ?? ""}`} value={brl((i.unit_price_cents + i.unit_fee_cents) * i.quantity)} />)}
          </section>
          <section><h3 className="mb-2 font-semibold">Ingressos do cliente</h3>
            {d.tickets.length === 0 && <p className="text-sm text-muted-foreground">Nenhum ingresso emitido.</p>}
            <div className="grid gap-3 sm:grid-cols-2">{d.tickets.map((t: any) => <div key={t.id} className="rounded-md border border-border p-3 text-sm">
              <div className="mb-2 flex justify-center rounded bg-background p-2"><QRCodeSVG value={t.code} size={120} /></div>
              <p className="font-medium">{t.event?.title}</p><p className="text-muted-foreground">{t.tier?.name} · {dt(t.event?.starts_at)}</p>
              <p className="mt-1 font-mono">{t.code}</p><p className="text-xs text-muted-foreground">{ticketStatus[t.status] ?? t.status}{t.checked_in_at ? ` · entrada ${dt(t.checked_in_at)}` : ""}</p>
            </div>)}</div>
          </section>
          <section><h3 className="mb-2 font-semibold">Enviar e-mail ao cliente</h3>
            <div className="space-y-2"><Input value={email} readOnly aria-label="Destinatário" /><Input value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Assunto" /><Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Escreva a mensagem" aria-label="Mensagem" />
              <Button disabled={!email} asChild={!!email}><a href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} target="_blank" rel="noreferrer"><Mail />Enviar e-mail</a></Button></div>
          </section>
        </div>}
      </DialogContent>
    </Dialog>
  );
}
