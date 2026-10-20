import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Trash2, ShieldCheck, Tag, Copy, Check } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useCart } from "@/lib/cart";
import { formatBRL } from "@/lib/events-data";
import { supabase } from "@/integrations/supabase/client";
import { createMpCardPayment } from "@/lib/mercadopago.functions";
import { createSyncPayPixPayment, checkSyncPayPayment } from "@/lib/syncpay.functions";
import { QRCodeSVG } from "qrcode.react";
import { validateCoupon } from "@/lib/coupons.functions";
import { MpCardBrick, type CardBrickResult } from "@/components/mp-card-brick";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — TTB" },
      { name: "description", content: "Finalize sua compra de ingressos com cartão ou Pix na Transfer Ticket Brasil." },
      { property: "og:title", content: "Checkout — Transfer Ticket Brasil" },
      { property: "og:description", content: "Pagamento seguro dos seus ingressos com cartão ou Pix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

type PixData = {
  orderId: string;
  qrCodeBase64: string | null;
  qrCode: string | null;
  ticketUrl: string | null;
};

function CheckoutPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const router = useRouter();
  const submitPix = useServerFn(createSyncPayPixPayment);
  const submitCard = useServerFn(createMpCardPayment);
  const checkPix = useServerFn(checkSyncPayPayment);
  const validate = useServerFn(validateCoupon);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [checkingPaymentManually, setCheckingPaymentManually] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const submittingCardRef = useRef(false);
  const [provider, setProvider] = useState<"card" | "syncpay">("syncpay");

  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const [pix, setPix] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);

  function formatCpf(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }

  function formatPhone(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setAuthed(false);
      } else {
        setAuthed(true);
        setEmail(data.user.email ?? "");
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", data.user.id)
          .maybeSingle();
        if (profile?.full_name) setName(profile.full_name);
        if (profile?.phone) setPhone(formatPhone(profile.phone));
      }
      setAuthChecked(true);
    })();
  }, []);

  const feesTotal = cart.items.reduce((s, i) => s + i.feeCents * i.quantity, 0);
  const subtotal = cart.items.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  const grossTotal = cart.totalCents;
  const finalTotal = Math.max(0, grossTotal - couponDiscount);

  const eventIds = new Set(cart.items.map((i) => i.eventId));
  const singleEvent = eventIds.size === 1;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!singleEvent) {
      toast.error("Cupom só funciona com ingressos de um único evento.");
      return;
    }
    setCouponLoading(true);
    try {
      const result = await validate({
        data: {
          eventId: cart.items[0].eventId,
          code: couponCode.trim(),
          subtotalCents: grossTotal,
        },
      });
      setCouponDiscount(result.discountCents);
      setCouponApplied(result.code);
      toast.success(`Cupom ${result.code} aplicado.`);
    } catch (err) {
      setCouponDiscount(0);
      setCouponApplied(null);
      toast.error(err instanceof Error ? err.message : "Cupom inválido.");
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponDiscount(0);
    setCouponApplied(null);
    setCouponCode("");
  };

  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  useEffect(() => stopPolling, []);

  useEffect(() => {
    if (!pix) return;
    stopPolling();
    pollRef.current = window.setInterval(async () => {
      try {
        const r = await checkPix({ data: { orderId: pix.orderId } });
        if (r.status === "paid") {
          stopPolling();
          cart.clear();
          router.invalidate();
          toast.success("Pagamento confirmado!");
          navigate({ to: "/pedidos/$id", params: { id: pix.orderId } });
        }
      } catch (err) {
        console.error("[pix poll]", err);
      }
    }, 4000);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix]);

  const copyPix = () => {
    if (!pix?.qrCode) return;
    navigator.clipboard.writeText(pix.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCardSubmit = async (brick: CardBrickResult) => {
    if (!authed) {
      navigate({ to: "/auth" });
      return;
    }
    if (cart.items.length === 0) return;
    if (submittingCardRef.current) throw new Error("Pagamento já está sendo processado.");
    if (name.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      const message = "Preencha seu nome completo e um e-mail válido antes de pagar.";
      setCardError(message);
      throw new Error(message);
    }
    submittingCardRef.current = true;
    setCardError(null);
    setLoading(true);
    try {
      const result = await submitCard({
        data: {
          items: cart.items.map((i) => ({ tierId: i.tierId, quantity: i.quantity })),
          buyerName: name.trim() || "Comprador",
          buyerEmail: email.trim(),
          ...(couponApplied ? { couponCode: couponApplied } : {}),
          token: brick.token,
          paymentMethodId: brick.paymentMethodId,
          installments: brick.installments,
          issuerId: brick.issuerId ?? undefined,
          identificationType: brick.identificationType,
          identificationNumber: brick.identificationNumber,
        },
      });
      if (result.status === "approved") {
        cart.clear();
        router.invalidate();
        toast.success("Pagamento aprovado!");
        navigate({ to: "/pedidos/$id", params: { id: result.orderId } });
      } else if (result.status === "in_process") {
        toast.info("Pagamento em análise. Você receberá a confirmação em instantes.");
        navigate({ to: "/pedidos/$id", params: { id: result.orderId } });
      } else {
        throw new Error("Pagamento recusado pela operadora. Verifique os dados, o limite ou tente outro cartão.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao processar cartão.";
      setCardError(msg);
      toast.error(msg);
      throw err;
    } finally {
      submittingCardRef.current = false;
      setLoading(false);
    }
  };

  const checkPaymentManually = async () => {
    if (!pix) return;
    setCheckingPaymentManually(true);
    try {
      const r = await checkPix({ data: { orderId: pix.orderId } });
      if (r.status === "paid") {
        stopPolling();
        cart.clear();
        router.invalidate();
        toast.success("Pagamento confirmado!");
        navigate({ to: "/pedidos/$id", params: { id: pix.orderId } });
      } else {
        toast.info("Pagamento ainda em processamento. Assim que o banco aprovar, você será redirecionado.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao verificar pagamento.");
    } finally {
      setCheckingPaymentManually(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authed) {
      navigate({ to: "/auth" });
      return;
    }
    if (cart.items.length === 0) return;

    if (provider === "syncpay") {
      const cleanCpf = cpf.replace(/\D/g, "");
      if (cleanCpf.length !== 11) {
        toast.error("Por favor, preencha um CPF válido com 11 dígitos para emissão do Pix.");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = {
        items: cart.items.map((i) => ({ tierId: i.tierId, quantity: i.quantity })),
        buyerName: name.trim(),
        buyerEmail: email.trim(),
        ...(couponApplied ? { couponCode: couponApplied } : {}),
      };
      if (provider === "syncpay") {
        const result = await submitPix({
          data: {
            ...payload,
            cpf: cpf.replace(/\D/g, ""),
            phone: phone ? phone.replace(/\D/g, "") : undefined,
          },
        });
        setPix({
          orderId: result.orderId,
          qrCodeBase64: result.qrCodeBase64,
          qrCode: result.pixCode || result.qrCode,
          ticketUrl: result.ticketUrl,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao processar pedido.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto grid place-items-center px-4 py-24">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
        </div>
      </div>
    );
  }

  if (cart.items.length === 0 && !pix) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-muted-foreground">Escolha um evento para começar.</p>
          <Link
            to="/eventos"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
          >
            Explorar eventos
          </Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (pix) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <section className="container mx-auto max-w-xl px-4 py-10">
          <h1 className="font-display text-3xl font-bold">Pague com Pix</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aponte a câmera do seu banco para o QR Code ou copie o código Pix abaixo. O pagamento é processado instantaneamente pela SyncPay e seus ingressos serão liberados na hora.
          </p>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
            {pix.qrCode ? (
              <div className="mx-auto flex justify-center rounded-2xl bg-white p-4 w-fit shadow-sm">
                <QRCodeSVG value={pix.qrCode} size={240} level="M" />
              </div>
            ) : pix.qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${pix.qrCodeBase64}`}
                alt="QR Code Pix"
                className="mx-auto h-64 w-64"
              />
            ) : (
              <p className="text-sm text-muted-foreground">QR Code indisponível.</p>
            )}
            {pix.qrCode && (
              <div className="mt-4">
                <div className="rounded-lg border border-border bg-background p-3 text-xs font-mono break-all text-muted-foreground select-all">
                  {pix.qrCode}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={copyPix}
                    className="bg-gradient-brand inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-brand-foreground shadow-glow"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Código copiado!" : "Copiar código Pix"}
                  </button>
                  <button
                    type="button"
                    onClick={checkPaymentManually}
                    disabled={checkingPaymentManually}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    {checkingPaymentManually ? (
                      <Loader2 className="h-4 w-4 animate-spin text-brand" />
                    ) : (
                      <Check className="h-4 w-4 text-brand" />
                    )}
                    Já paguei
                  </button>
                </div>
              </div>
            )}
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-brand" /> Aguardando confirmação do banco…
            </div>
          </div>
        </section>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="container mx-auto px-4 py-10">
        <h1 className="font-display text-3xl font-bold">Finalizar compra</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revise seus ingressos e escolha a forma de pagamento.
        </p>

        <div
          className="mt-8 grid gap-8 lg:grid-cols-[1fr_400px]"
        >
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-bold">Seus ingressos</h2>
              <ul className="mt-4 divide-y divide-border">
                {cart.items.map((item) => (
                  <li key={item.tierId} className="flex gap-4 py-4">
                    <img
                      src={item.eventImage}
                      alt={item.eventTitle}
                      className="h-16 w-16 flex-none rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{item.eventTitle}</p>
                      <p className="text-xs text-muted-foreground">{item.tierName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatBRL(item.priceCents / 100)} + {formatBRL(item.feeCents / 100)} taxa
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(item.tierId, item.quantity - 1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-border"
                          aria-label="Diminuir"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQuantity(item.tierId, item.quantity + 1)}
                          className="grid h-7 w-7 place-items-center rounded-full border border-border"
                          aria-label="Aumentar"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.removeItem(item.tierId)}
                        className="text-xs text-muted-foreground transition hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-bold">
                <Tag className="mr-1.5 inline h-4 w-4" /> Cupom de desconto
              </h2>
              {couponApplied ? (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-sm">
                  <span>
                    <span className="font-mono font-semibold">{couponApplied}</span> — desconto de{" "}
                    <strong>{formatBRL(couponDiscount / 100)}</strong>
                  </span>
                  <button type="button" onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-destructive">
                    Remover
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    placeholder="Digite o código"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase"
                  />
                  <button
                    type="button"
                    onClick={applyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {couponLoading ? "…" : "Aplicar"}
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-bold">Dados do comprador</h2>
              {!authed && (
                <p className="mt-2 text-sm text-muted-foreground">
                  Você precisa{" "}
                  <Link to="/auth" className="text-brand underline">
                    entrar
                  </Link>{" "}
                  para finalizar a compra.
                </p>
              )}
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    Nome completo
                  </span>
                  <input
                    required
                    minLength={2}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    disabled={!authed}
                  />
                </label>
                <label className="text-sm">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    E-mail
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    disabled={!authed}
                  />
                </label>
                {provider === "syncpay" && (
                  <>
                    <label className="text-sm">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        CPF (para emissão do Pix) *
                      </span>
                      <input
                        required
                        value={cpf}
                        onChange={(e) => setCpf(formatCpf(e.target.value))}
                        placeholder="000.000.000-00"
                        maxLength={14}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                        disabled={!authed}
                      />
                    </label>
                    <label className="text-sm">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        Celular / WhatsApp (opcional)
                      </span>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono"
                        disabled={!authed}
                      />
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h2 className="font-display text-lg font-bold">Forma de pagamento</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label
                  className={
                    "flex cursor-pointer flex-col rounded-xl border p-4 transition " +
                    (provider === "syncpay"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:bg-muted")
                  }
                >
                  <input
                    type="radio"
                    name="provider"
                    className="sr-only"
                    checked={provider === "syncpay"}
                    onChange={() => setProvider("syncpay")}
                  />
                  <span className="text-sm font-semibold">Pix (SyncPay)</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Confirmação em segundos. Liberação imediata.
                  </span>
                </label>
                <label
                  className={
                    "flex cursor-pointer flex-col rounded-xl border p-4 transition " +
                    (provider === "card"
                      ? "border-brand bg-brand/5"
                      : "border-border hover:bg-muted")
                  }
                >
                  <input
                    type="radio"
                    name="provider"
                    className="sr-only"
                    checked={provider === "card"}
                    onChange={() => setProvider("card")}
                  />
                  <span className="text-sm font-semibold">Cartão de crédito/débito</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Até 12x. Aprovação imediata.
                  </span>
                </label>
              </div>


              {provider === "card" && authed && (
                <div className="mt-6">
                  {finalTotal >= 100 ? (
                    <MpCardBrick
                      amount={Number((finalTotal / 100).toFixed(2))}
                      payerEmail={email}
                      onSubmit={handleCardSubmit}
                      onError={(err) => {
                        const message = err instanceof Error ? err.message : "Não foi possível carregar ou validar o cartão. Confira os dados ou recarregue a página.";
                        setCardError(message);
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Valor mínimo de R$ 1,00 para pagar com cartão.
                    </p>
                  )}
                </div>
              )}
              {provider === "card" && cardError && (
                <p role="alert" className="mt-4 text-sm text-destructive">{cardError}</p>
              )}
              {provider === "card" && loading && (
                <p role="status" className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Processando pagamento…
                </p>
              )}
            </div>


            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-brand" />
                Compra segura
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Pagamentos via Pix processados com segurança pelo gateway SyncPay.
              </p>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <h3 className="font-display text-lg font-bold">Resumo</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd>{formatBRL(subtotal / 100)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Taxa de serviço</dt>
                  <dd>{formatBRL(feesTotal / 100)}</dd>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-brand">
                    <dt>Cupom {couponApplied}</dt>
                    <dd>− {formatBRL(couponDiscount / 100)}</dd>
                  </div>
                )}
                <div className="mt-3 flex justify-between border-t border-border pt-3 text-base">
                  <dt className="font-semibold">Total</dt>
                  <dd className="font-display text-xl font-bold">
                    {formatBRL(finalTotal / 100)}
                  </dd>
                </div>
              </dl>
              {provider !== "card" && (
                <form onSubmit={handleSubmit}>
                <button
                  type="submit"
                  disabled={loading || !authed}
                  className="bg-gradient-brand mt-5 w-full rounded-xl py-3 text-sm font-semibold text-brand-foreground shadow-glow transition disabled:opacity-50"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processando…
                    </span>
                  ) : authed ? (
                    provider === "syncpay" ? "Gerar Pix (SyncPay)" : "Confirmar pedido"
                  ) : (
                    "Entrar para continuar"
                  )}
                </button>
                </form>
              )}
              {provider === "card" && (
                <p className="mt-5 text-center text-xs text-muted-foreground">
                  Preencha os dados do cartão acima e clique em <strong>Pagar</strong>.
                </p>
              )}
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
