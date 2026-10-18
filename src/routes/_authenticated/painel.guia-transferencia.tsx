import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Share2, ShieldCheck, Smartphone, Info, Ticket, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/painel/guia-transferencia")({
  head: () => ({ meta: [
      { title: "Guia de transferência — Transfer Ticket Brasil" },
      { name: "description", content: "Transferência de ingressos na Transfer Ticket Brasil." },
      { property: "og:title", content: "Guia de transferência — Transfer Ticket Brasil" },
      { property: "og:description", content: "Transferência de ingressos na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
  ] }),
  component: GuiaTransferenciaPage,
});

function GuiaTransferenciaPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const evento = ((search as any).evento as string) || "";
  const isF1 = /f[óôo]rmula\s*1|f1/i.test(evento);

  return (
    <div className="min-h-[70vh] flex flex-col items-center py-4 md:py-8 scale-[0.9] origin-top">
      <div className="w-full max-w-2xl space-y-6">
        <button 
          onClick={() => navigate({ to: "/painel/eventos/novo" })}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para o anúncio
        </button>

        <div className="bg-card rounded-2xl p-8 md:p-10 shadow-sm border border-border space-y-8">
          {isF1 ? (
            <EventimGuide />
          ) : (
            <QuentroGuide />
          )}

          <div className="pt-8 border-t border-border">
            <Button 
              onClick={() => navigate({ to: "/painel/eventos/novo" })}
              className="w-full bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl h-12 font-semibold shadow-glow"
            >
              Entendi, voltar ao anúncio
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventimGuide() {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transferência de ingressos via Eventim</h1>
            <p className="text-sm text-muted-foreground">
              Se você comprou um ingresso pela Eventim ou precisa receber uma transferência, siga este passo a passo para garantir que o processo seja realizado de forma rápida e segura.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <Info className="h-5 w-5" />
            <h2>Formato do ingresso</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">
            A maioria dos ingressos da Eventim é 100% digital, acessível pelo aplicativo da Eventim com QR Code dinâmico. O formato em PDF é exceção e aparece principalmente em ingressos do tipo cortesia.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <Smartphone className="h-5 w-5" />
            <h2>Como transferir um ingresso</h2>
          </div>
          <ul className="space-y-3 pl-7">
            {[
              "Acesse o site da Eventim e faça login na sua conta.",
              "Localize o ingresso na sua conta.",
              "Clique em Transferir Ingresso.",
              "Copie o link gerado e envie para o suporte da TransferTicket.",
              "Abra o PDF do ingresso.",
              "Tire um print do ingresso.",
              "Envie o print para o suporte da TransferTicket."
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
          <div className="pl-7 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Importante:</strong> para sua segurança e do comprador, salve um print da conversa como comprovante da transferência.
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <Ticket className="h-5 w-5" />
            <h2>Como funciona a entrada no evento</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">
            Para entrar no evento, basta apresentar:
          </p>
          <ul className="space-y-3 pl-7">
            {[
              "O QR Code do ingresso aberto, e",
              "O seu documento oficial, quando necessário, para comprovar a categoria do ingresso (ex.: meia-entrada)."
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
          <div className="pl-7 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-muted-foreground leading-relaxed">
            ✅ O ingresso não é nominal: o nome do titular anterior não é verificado na entrada.
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <ShieldCheck className="h-5 w-5" />
            <h2>Pronto para aproveitar</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">
            Agora que você sabe como funciona a transferência na Eventim, siga os passos corretamente e aproveite seu evento sem preocupações!
          </p>
        </section>
      </div>
    </>
  );
}

function QuentroGuide() {
  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Transferência de ingressos via Quentro</h1>
            <p className="text-sm text-muted-foreground">Para transferir ingressos emitidos pela Ticketmaster, utilize o aplicativo Quentro — a forma mais segura e rastreável de realizar essa transação.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <Smartphone className="h-5 w-5" />
            <h2>Passo a passo para o vendedor</h2>
          </div>
          <ul className="space-y-3 pl-7">
            {[
              "Após concluir a venda, acesse sua conta na Ticketmaster.",
              "Transfira o ingresso para o Quentro.",
              "Solicite o e-mail pelo suporte da TransferTicket e informe esse e-mail no app Quentro.",
              "Avise no suporte que a transferência foi realizada."
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
          <div className="pl-7 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Importante:</strong> no fluxo do Quentro, não é exibida uma tela de confirmação para o vendedor. Por isso, não é necessário (nem possível) enviar print da tela de confirmação. A comunicação via suporte TransferTicket informando que a transferência foi feita é considerada prova suficiente.
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <FileText className="h-5 w-5" />
            <h2>Limite de transferências</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">
            O Quentro permite uma única transferência por ingresso. Porém, caso necessário, o comprador pode devolver o ingresso ao vendedor pelo app — e após essa devolução, o vendedor consegue realizar uma nova transferência.
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <Ticket className="h-5 w-5" />
            <h2>Como funciona a entrada no evento</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">
            Para entrar no evento, basta apresentar:
          </p>
          <ul className="space-y-3 pl-7">
            {[
              "o QR Code do ingresso, e",
              "o seu documento oficial, quando necessário, para comprovar a categoria do ingresso (ex.: meia-entrada, etc.)."
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-foreground">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
          <div className="pl-7 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-muted-foreground leading-relaxed">
            O ingresso não é nominal: o nome do titular anterior não é verificado na entrada.
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-brand font-semibold">
            <ShieldCheck className="h-5 w-5" />
            <h2>Segurança e transparência</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed pl-7">
            Esse processo garante que a transferência aconteça de forma segura, transparente e sem complicações tanto pra quem vende quanto pra quem compra.
          </p>
        </section>
      </div>
    </>
  );
}
