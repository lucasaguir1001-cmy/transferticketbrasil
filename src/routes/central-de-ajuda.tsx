import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HelpCircle, Mail, MessageCircle, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/central-de-ajuda")({
  head: () => ({
    meta: [
      { title: "Central de Ajuda — TTB" },
      {
        name: "description",
        content:
          "Tire dúvidas sobre compra, venda, transferência e pagamento de ingressos na Transfer Ticket Brasil.",
      },
      { property: "og:title", content: "Central de Ajuda — TTB" },
      {
        property: "og:description",
        content:
          "Tire dúvidas sobre compra, venda, transferência e pagamento de ingressos na Transfer Ticket Brasil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpCenter,
});

function HelpCenter() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="border-b border-border bg-secondary/50">
        <div className="container mx-auto px-4 py-16">
          <h1 className="font-display text-4xl font-bold md:text-5xl">
            Central de Ajuda
          </h1>
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Encontre respostas sobre compra, venda, transferência e
            pagamento de ingressos no TTB.
          </p>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <HelpCard
            icon={<ShieldCheck className="h-6 w-6" />}
            title="Compra segura"
            text="Todos os ingressos são digitalizados com QR Code único. O pagamento é processado com criptografia e você recebe o ingresso por e-mail assim que a transação é confirmada."
          />
          <HelpCard
            icon={<MessageCircle className="h-6 w-6" />}
            title="Como anunciar"
            text="Acesse o painel do vendedor, preencha os dados do evento e defina as categorias de ingresso. Você só paga taxa sobre os ingressos realmente vendidos."
          />
          <HelpCard
            icon={<HelpCircle className="h-6 w-6" />}
            title="Trocas e transferências"
            text="A transferência de titularidade pode ser feita diretamente pelo painel, seguindo as regras do organizador e a legislação do setor."
          />
          <HelpCard
            icon={<Mail className="h-6 w-6" />}
            title="Entre em contato"
            text="Não encontrou o que precisa? Envie um e-mail para nosso time de suporte que responderemos em até 24 horas úteis."
          />
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-8">
          <h2 className="font-display text-2xl font-bold">Perguntas frequentes</h2>
          <dl className="mt-6 space-y-6">
            <Faq
              question="Quanto tempo leva para receber meu ingresso?"
              answer="Assim que o pagamento for aprovado, seu ingresso digital é gerado e enviado por e-mail em poucos minutos."
            />
            <Faq
              question="Posso vender ingressos de qualquer evento?"
              answer="Você pode anunciar ingressos para eventos que já existem em nossa base. Se não encontrar o evento, entre em contato com o suporte."
            />
            <Faq
              question="Quais formas de pagamento são aceitas?"
              answer="Aceitamos Pix e cartão de crédito, processados pelo Mercado Pago com total segurança."
            />
            <Faq
              question="Como funciona o reembolso?"
              answer="Os reembolsos seguem a política do organizador do evento. Quando autorizado, o valor é estornado na mesma forma de pagamento utilizada."
            />
          </dl>
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/eventos"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-glow"
          >
            Explorar eventos
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function HelpCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
      <div className="bg-gradient-brand grid h-12 w-12 place-items-center rounded-xl text-brand-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Faq({ question, answer }: { question: string; answer: string }) {
  return (
    <div>
      <dt className="font-display font-semibold">{question}</dt>
      <dd className="mt-1 text-sm text-muted-foreground">{answer}</dd>
    </div>
  );
}
