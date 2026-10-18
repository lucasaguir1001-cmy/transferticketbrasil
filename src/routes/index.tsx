// Execute esta instrucao no projeto: publique
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search, Sparkles, ShieldCheck, Zap } from "lucide-react";
import React, { useState, useEffect } from "react";
import logoTTB from "@/assets/logo-transferticket.png.asset.json";
import btsHeroAsset from "@/assets/bts-new-edited.png.asset.json";
import btsMobileAsset from "@/assets/bts-mobile-v5.png.asset.json";
import f1HeroAsset from "@/assets/f1-desktop-v5.png.asset.json";
import f1MobileAsset from "@/assets/f1-mobile-v5.png";
import ironMaidenHeroAsset from "@/assets/iron-maiden-tour-2026.png.asset.json";
import ironMaidenMobileAsset from "@/assets/iron-maiden-mobile-v2.png.asset.json";
import edSheeranHeroAsset from "@/assets/ed-sheeran-desktop-v6.png.asset.json";
import edSheeranMobileAsset from "@/assets/ed-sheeran-mobile-v4.png.asset.json";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { EventCard } from "@/components/event-card";
import { CATEGORIES, fetchEvents } from "@/lib/events-data";
import { getSiteUrl } from "@/lib/site-config";

const OG_IMAGE = btsHeroAsset.url;
const HOME_TITLE = "Transfer Ticket Brasil — Compre ingressos para shows e eventos";
const HOME_DESC =
  "Encontre shows, festivais, teatro e esportes no Brasil. Pague no Pix ou cartão e receba seu ingresso digital com QR Code na hora.";

export const Route = createFileRoute("/")({
  head: () => {
    const siteUrl = getSiteUrl();
    return {
      meta: [
        { title: HOME_TITLE },
        { name: "description", content: HOME_DESC },
        { property: "og:title", content: HOME_TITLE },
        { property: "og:description", content: HOME_DESC },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${siteUrl}/` },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: HOME_TITLE },
        { name: "twitter:description", content: HOME_DESC },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: `${siteUrl}/` }],
    };
  },
  component: Home,
});

function Home() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", "published"],
    queryFn: fetchEvents,
  });

  const [currentSlide, setCurrentSlide] = useState(0);
  const slides = [
    { 
      desktop: btsHeroAsset.url, 
      mobile: btsMobileAsset.url, 

      alt: "BTS World Tour" 
    },
    {
      desktop: f1HeroAsset.url,
      mobile: f1MobileAsset,
      mobileContain: true,
      bg: "#063416",
      alt: "Fórmula 1 2026"
    },
    { 
      desktop: ironMaidenHeroAsset.url, 
      mobile: ironMaidenMobileAsset.url, 
      alt: "Iron Maiden - Run For Your Lives World Tour 2026" 
    },
    {
      desktop: edSheeranHeroAsset.url,
      mobile: edSheeranMobileAsset.url,
      bg: "#d92662",
      alt: "Ed Sheeran - Loop Tour 2026"
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const featured = events.filter((e) => e.featured).slice(0, 6);
  const upcoming = events.slice(0, 9);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          {slides.map((slide, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? "opacity-100" : "opacity-0"
              }`}
            >
              <picture className="absolute inset-0 block h-full w-full">
                <source media="(max-width: 768px)" srcSet={slide.mobile} />
                <img
                  src={slide.desktop}
                  alt={slide.alt}
                  width={1920}
                  height={1080}
                  className={`h-full w-full ${
                    slide.mobileContain ? "object-contain md:object-cover" : "object-cover"
                  }`}
                  style={{ backgroundColor: slide.bg ?? "#000033" }}
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </picture>
            </div>
          ))}
        </div>
        <div className="container relative mx-auto px-4 pb-10 pt-12 md:pb-32 md:pt-36 flex flex-col min-h-[92svh] md:min-h-[675px] md:justify-end">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs md:text-sm font-medium text-primary-foreground backdrop-blur mb-8 md:mb-0 transition-all absolute top-8 left-4 md:relative md:top-0 md:left-0">
              <img
                src={logoTTB.url}
                alt="TTB"
                className="h-3 w-3 md:h-4 md:w-4 shrink-0 object-contain"
                loading="eager"
                decoding="async"
              />

              Milhares de ingressos vendidos em todo Brasil
            </span>

            <div className="mt-16 md:mt-5 hidden md:block">
              <h1 className="max-w-fit rounded-lg bg-black/20 p-1.5 font-display text-lg font-bold leading-tight text-primary-foreground backdrop-blur-sm md:text-2xl">
                O ingresso do seu próximo
                <br />
                <span className="bg-gradient-brand bg-clip-text text-xl text-transparent md:text-3xl">
                  momento inesquecível
                </span>
              </h1>
            </div>
            
            <p className="mt-4 max-w-fit rounded-lg bg-black/20 p-1 text-sm text-primary-foreground backdrop-blur-sm hidden md:block">
              Descubra shows, festivais, teatro e esportes. Pague no Pix ou
              <br />
              cartão e receba seu ingresso digital com QR Code na hora.
            </p>

            <div className="mt-6 md:mt-8 hidden md:flex w-fit flex-col gap-3 rounded-2xl bg-card p-2 shadow-glow sm:flex-row">
              <div className="hidden md:flex w-full items-center gap-2 rounded-xl px-4 sm:w-[320px]">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  placeholder="Busque por evento, artista ou cidade"
                />
              </div>
              <Link
                to="/eventos"
                className="bg-gradient-brand inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-brand-foreground shadow-glow w-full md:w-auto hidden md:inline-flex"
              >
                Buscar ingressos <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="absolute bottom-14 left-4 right-4 flex flex-col items-center gap-4 md:relative md:bottom-0 md:left-0 md:right-0 md:mt-6 md:items-start md:gap-0">


              <Link
                to="/eventos"
                className="bg-gradient-brand flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-brand-foreground shadow-glow w-full md:hidden"
              >
                Buscar ingressos <ArrowRight className="h-4 w-4" />
              </Link>
              
              <div className="flex w-full flex-nowrap justify-center gap-1.5 md:flex-wrap md:justify-start md:gap-2">
                {CATEGORIES.filter(c => c !== "Cursos" && c !== "Teatro").map((c) => (
                  <Link
                    key={c}
                    to="/eventos"
                    search={{ cat: c }}
                    className="flex-1 whitespace-nowrap text-center rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground/90 backdrop-blur transition-colors hover:bg-primary-foreground/15 md:flex-none md:px-4 md:py-1.5 md:text-xs"
                  >
                    {c}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <span className="text-sm font-semibold text-brand">
                Em destaque
              </span>
              <h2 className="mt-1 font-display text-3xl font-bold">
                Não perca essas oportunidades
              </h2>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </section>
      )}

      <section className="bg-secondary py-16">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-3">
          <ValueProp
            icon={<Zap className="h-5 w-5" />}
            title="Pagamento em segundos"
            text="Aprovação instantânea no Pix e cartão. Sem burocracia."
          />
          <ValueProp
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Ingresso 100% seguro"
            text="QR Code único e criptografado, direto no seu celular."
          />
          <ValueProp
            icon={<Sparkles className="h-5 w-5" />}
            title="Suporte quando precisar"
            text="Nossa equipe está disponível todos os dias, inclusive no dia do evento."
          />
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <span className="text-sm font-semibold text-brand">Próximos</span>
            <h2 className="mt-1 font-display text-3xl font-bold">
              Eventos chegando aí
            </h2>
          </div>
          <Link
            to="/eventos"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        )}
      </section>

      <section className="container mx-auto px-4 pb-24">
        <div className="bg-gradient-brand relative overflow-hidden rounded-3xl p-10 shadow-glow md:p-16">
          <div className="relative z-10 max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-brand-foreground md:text-4xl">
              Anuncie seu Ingresso
            </h2>
            <p className="mt-3 text-brand-foreground/90">
              Painel completo com vendas em tempo real, gestão de lotes e pagamentos via Pix. 
              Cobramos apenas nos ingressos vendidos.
            </p>
            <Link 
              to="/painel/eventos/novo"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-105"
            >
              Anunciar
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function ValueProp({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="bg-gradient-brand grid h-11 w-11 flex-none place-items-center rounded-xl text-brand-foreground">
        {icon}
      </div>
      <div>
        <h3 className="font-display font-semibold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}