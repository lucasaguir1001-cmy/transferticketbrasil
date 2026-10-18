import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyOrganizer, slugify } from "@/lib/painel-data";
import { CATEGORIES } from "@/lib/events-data";
import { Search, ChevronRight, ArrowLeft, Ticket, Calendar, MapPin, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/painel/eventos/novo")({
  head: () => ({ meta: [
      { title: "Anunciar ingresso — Transfer Ticket Brasil" },
      { name: "description", content: "Criação de anúncios de ingressos na Transfer Ticket Brasil." },
      { property: "og:title", content: "Anunciar ingresso — Transfer Ticket Brasil" },
      { property: "og:description", content: "Criação de anúncios de ingressos na Transfer Ticket Brasil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
  ] }),
  component: NewEventPage,
});

function NewEventPage() {
  const navigate = useNavigate();
  const { data: organizer, isLoading } = useQuery({
    queryKey: ["my-organizer"],
    queryFn: fetchMyOrganizer,
  });

  const [step, setStep] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["search-events", searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 2) return [];
      const { data, error } = await supabase
        .from("events")
        .select(`
          id, 
          title, 
          description,
          venue, 
          city, 
          image_url, 
          starts_at, 
          ticket_tiers (
            id,
            name,
            price_cents,
            quantity_available
          )
        `)
        .ilike("title", `%${searchQuery}%`)
        .limit(5);
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length >= 2,
  });

  const steps = [1, 2, 3, 4];

  if (isLoading) return <div className="h-40 animate-pulse rounded-2xl bg-muted" />;
  
  const qc = useQueryClient();

  // A função de exigir perfil de organizador foi removida para permitir anúncios diretos


  return (
    <div className="min-h-[70vh] flex flex-col items-center py-4 md:py-8 scale-[0.85] origin-top">
      {/* Header com Título */}
      <div className="w-full max-w-4xl mb-6 text-center">
        <h1 className="font-display text-xl md:text-2xl font-semibold text-foreground">Criar anúncio</h1>
      </div>

      {/* Stepper */}
      <div className="w-full max-w-2xl mb-8 relative flex items-center justify-between px-10">
        {/* Linha de fundo */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-border -z-10 -translate-y-1/2 mx-16" />
        
        {steps.map((s) => (
          <div 
            key={s}
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 relative z-10 ${
              s <= step 
                ? "bg-foreground text-background" 
                : "bg-background border-2 border-border text-muted-foreground"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Conteúdo do Step 1 */}
      <div className="w-full max-w-2xl space-y-8 bg-card rounded-2xl p-8 md:p-12 shadow-sm border border-border">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-foreground">Informações do evento</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Não encontrou o evento? Contate o nosso suporte{" "}
                <a href="#" className="text-brand hover:underline">clicando aqui</a>
              </p>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-foreground">Nome do evento</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-brand">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Pesquisar evento"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 rounded-xl bg-secondary/50 border border-border focus:border-brand focus:ring-1 focus:ring-brand outline-none transition-all placeholder:text-muted-foreground/50 text-foreground"
                />
              </div>

              {/* Resultados da Busca */}
              {searchQuery.length >= 2 && (
                <div className="space-y-2 mt-2">
                  {isSearching ? (
                    <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Buscando eventos...</div>
                  ) : searchResults && searchResults.length > 0 ? (
                    <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
                      {searchResults.map((event) => (
                        <button
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setStep(2);
                          }}
                          className="w-full p-4 flex items-center gap-4 hover:bg-secondary/30 transition-colors text-left"
                        >
                          <div className="w-12 h-12 rounded-lg bg-secondary flex-shrink-0 overflow-hidden">
                            {event.image_url && (
                              <img src={event.image_url} alt="" className="w-full h-full object-cover" />
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground">{event.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {event.venue}, {event.city} • {new Date(event.starts_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <ChevronRight className="ml-auto h-5 w-5 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">Nenhum evento encontrado</div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate({ to: "/painel" })}
                className="rounded-xl px-8 h-12 bg-secondary/30 border-none hover:bg-secondary/50 text-foreground font-semibold"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setStep(2)}
                disabled={!selectedEvent}
                className="bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl px-10 h-12 font-semibold shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="p-4 bg-brand/5 border border-brand/10 rounded-2xl flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
                <Ticket className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-foreground line-clamp-1">{selectedEvent?.title}</h3>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Calendar className="h-3 w-3" /> {new Date(selectedEvent?.starts_at).toLocaleDateString('pt-BR')} • <MapPin className="h-3 w-3 ml-1" /> {selectedEvent?.city}
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground">Categoria do Ingresso</label>
                <div className="grid grid-cols-1 gap-2">
                  {selectedEvent?.ticket_tiers?.map((tier: any) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTier(tier.id)}
                      className={`w-full p-4 rounded-xl border transition-all text-left flex items-center justify-between group ${
                        selectedTier === tier.id 
                          ? "bg-brand/5 border-brand ring-1 ring-brand" 
                          : "bg-secondary/30 border-border hover:border-brand/40"
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-sm text-foreground">{tier.name}</span>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Disponível para anúncio</p>
                      </div>
                      {selectedTier === tier.id && <div className="w-4 h-4 rounded-full bg-brand" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground">Quantidade de ingressos</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4].map((n) => (
                    <button
                      key={n}
                      onClick={() => setQuantity(n)}
                      className={`flex-1 h-12 rounded-xl border font-bold transition-all ${
                        quantity === n 
                          ? "bg-brand/5 border-brand text-brand shadow-sm" 
                          : "bg-secondary/30 border-border text-foreground hover:bg-secondary/50"
                      }`}
                    >
                      {n === 4 ? "+4" : n}
                    </button>
                  ))}
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-600 leading-tight">
                    Se você tiver mais de um ingresso à venda, eles serão vendidos separadamente.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-foreground">Valor do ingresso</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">R$</span>
                  <input 
                    type="text" 
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="750" 
                    className="w-full h-14 pl-10 pr-4 rounded-xl bg-secondary/30 border border-border focus:border-brand outline-none transition-all text-foreground font-medium" 
                  />
                </div>
                {price && (
                  <div className="space-y-1.5 px-1">
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center text-[8px] text-background">!</div>
                      Você recebe: <span className="font-bold text-foreground">R$ {(Number(price) * 0.9).toFixed(2).replace('.', ',')}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-muted flex items-center justify-center text-[8px] text-background">!</div>
                      O comprador paga: <span className="font-bold text-foreground">R$ {(Number(price) * 1.1).toFixed(2).replace('.', ',')}</span> <span className="text-[9px]">(à vista no PIX)</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-xl px-8 h-12 bg-secondary/30 border-none hover:bg-secondary/50 text-foreground font-semibold"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!selectedTier || !price}
                className="bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl px-10 h-12 font-semibold shadow-glow disabled:opacity-50"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <Link 
              to="/painel/guia-transferencia"
              search={{ evento: selectedEvent?.title || "" }}
              className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl mb-6 hover:bg-secondary/50 transition-colors border border-transparent hover:border-brand/20 group"
            >
              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand group-hover:scale-110 transition-transform">
                <Ticket className="h-5 w-5" />
              </div>
              <div className="flex-1 text-left">
                <h3 className="text-sm font-semibold text-foreground">Guia de transferência</h3>
                <p className="text-xs text-muted-foreground">Veja o passo a passo para enviar ou receber com segurança.</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full bg-brand" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Detalhes do evento</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Este evento está vendendo rápido para <span className="font-semibold text-foreground">{selectedEvent?.title}</span> em nosso site
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border">
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-foreground">Descrição:</h3>
                  <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                    <p className="flex items-center gap-2 text-foreground font-semibold">
                      <span className="text-brand">✓</span> {selectedEvent?.title}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="flex items-center gap-2 text-foreground font-semibold">
                        <span>📅</span> Programação
                      </p>
                      <ul className="space-y-1 list-disc list-inside pl-1">
                        <li>{new Date(selectedEvent?.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} - {selectedEvent?.city}/{selectedEvent?.venue}</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                    {selectedEvent?.description ? (
                      selectedEvent.description
                        .split("\n")
                        .filter((line: string) => line.trim())
                        .map((line: string, idx: number) => {
                          const trimmed = line.trim();
                          let icon: React.ReactNode = null;
                          let isWarning = false;

                          if (trimmed.startsWith("⚠️") || trimmed.startsWith("🔴")) {
                            icon = <span className="text-amber-500">{trimmed.startsWith("🔴") ? "🔴" : "⚠️"}</span>;
                            isWarning = true;
                          } else if (
                            trimmed.startsWith("🔐") ||
                            trimmed.startsWith("👉") ||
                            trimmed.startsWith("🔁") ||
                            trimmed.startsWith("🎫") ||
                            trimmed.startsWith("✅")
                          ) {
                            icon = <span className="text-brand">🔐</span>;
                          } else if (trimmed.startsWith("💰")) {
                            icon = <span className="text-brand">💰</span>;
                          }

                          const content = icon
                            ? trimmed.replace(/^[⚠️🔴🔐👉🔁🎫✅💰🏎️]\s*/, "")
                            : trimmed;

                          return (
                            <div
                              key={idx}
                              className={isWarning ? "p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-2" : "space-y-2"}
                            >
                              <p className="flex items-start gap-2">
                                {icon}
                                <span>{content}</span>
                              </p>
                            </div>
                          );
                        })
                    ) : (
                      <>
                        {(selectedEvent?.title && (
                          selectedEvent.title.toLowerCase().includes("fórmula 1") ||
                          selectedEvent.title.toLowerCase().includes("formula 1") ||
                          selectedEvent.title.toLowerCase().includes("grande prêmio") ||
                          selectedEvent.title.toLowerCase().includes("f1")
                        )) ? (
                          <>
                            <div className="space-y-2">
                              <p className="flex items-start gap-2">
                                <span>🏎️</span>
                                <span className="text-foreground font-semibold">Formula 1 MSC Cruises Grande Prêmio de São Paulo 2026</span>
                              </p>
                              <p className="pl-6">
                                O Grande Prêmio de São Paulo de Fórmula 1 2026 promete marcar época no Autódromo de Interlagos, trazendo as novas regulamentações da categoria, muitas ultrapassagens e disputas intensas na pista.
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="flex items-start gap-2">
                                <span className="text-brand">🔐</span>
                                <span><strong>Acesso e Transferência</strong> Acesse o site da Eventim e clique em "Transferir Ingresso". Em seguida, envie o link para o suporte da TransferTicket. Caso o ingresso não seja transferível pelo sistema, envie o arquivo em PDF. Para acessar o evento, basta apresentar o QR Code na tela do celular ou impresso na entrada.</span>
                              </p>
                            </div>

                            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-2">
                              <p className="flex items-start gap-2">
                                <span className="text-amber-500">⚠️</span>
                                <span><strong>ATENÇÃO:</strong> O prazo final para envio da comprovação de direito ao benefício de meia entrada, vai até o dia 05/09. Fique atento para não perder essa data, pois após esse limite não será possível a comprovação desse direito de meia-entrada. O aprovação para esse direito à meia-entrada é EXTREMAMENTE rigorosa. Por favor se atente às regras esclarecidas nesse link: Help Eventim.</span>
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="flex items-start gap-2">
                                <span className="text-brand">💰</span>
                                <span><strong>Sobre os Valores</strong> A TransferTicket é um marketplace secundário e não estabelece os preços dos ingressos. Os valores são definidos diretamente pelos vendedores.</span>
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg space-y-2">
                              <p className="flex items-start gap-2">
                                <span className="text-amber-500">⚠️</span>
                                <span><strong>Atenção:</strong> Esse evento possui assentos numerados, dessa forma não é possível adquirir lugares juntos. Você só saberá o local exato, através de conversa no chat com o vendedor.</span>
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="flex items-start gap-2">
                                <span className="text-brand">🔐</span>
                                <span><strong>Acesso E Regras de Transferência:</strong> Para transferir o ingresso, o vendedor deve acessar o arquivo em PDF do ingresso e enviá-lo diretamente ao comprador através do chat da TTB. Como medida de segurança para ambas as partes, recomenda-se salvar um print da conversa como comprovante da entrega.</span>
                              </p>
                            </div>

                            <div className="space-y-2">
                              <p className="flex items-start gap-2">
                                <span className="text-brand">💰</span>
                                <span><strong>Como Funcionam Os Preços:</strong> A TTB é um marketplace secundário: não definimos o valor de nenhum ingresso. Os preços são estabelecidos pelos vendedores com base na oferta e demanda. Sempre exibimos a opção mais barata disponível primeiro.</span>
                              </p>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="rounded-xl px-8 h-12 bg-secondary/30 border-none hover:bg-secondary/50 text-foreground font-semibold"
              >
                Voltar
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl px-10 h-12 font-semibold shadow-glow"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-foreground">Revisar anúncio</h2>
              <p className="text-sm text-muted-foreground">Confira os detalhes antes de publicar.</p>
            </div>

            <div className="space-y-4">
              <div className="p-6 bg-brand/5 border border-brand/10 border-dashed rounded-2xl space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center text-brand flex-shrink-0">
                    <Ticket className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-brand uppercase tracking-wider">
                      {selectedEvent?.ticket_tiers?.find((t: any) => t.id === selectedTier)?.name} — Inteira
                    </p>
                    <h3 className="font-bold text-foreground text-sm line-clamp-1">{selectedEvent?.title}</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-brand/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/5 flex items-center justify-center text-brand">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{new Date(selectedEvent?.starts_at).toLocaleDateString('pt-BR')}</p>
                      <p className="text-[10px] text-muted-foreground">Data do evento</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/5 flex items-center justify-center text-brand">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">{selectedEvent?.city}</p>
                      <p className="text-[10px] text-muted-foreground">São Paulo - Brasil</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-secondary/30 border border-border rounded-2xl p-6 space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Quantidade de ingressos</span>
                  <span className="font-bold text-foreground">{quantity}</span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">Valor do ingresso</span>
                    <span className="text-lg font-bold text-brand">R$ {Number(price).toFixed(2).replace('.', ',')}</span>
                  </div>
                  <div className="space-y-1.5 border-t border-border pt-3 mt-1">
                    <p className="text-[11px] text-muted-foreground flex justify-between">
                      <span>Você recebe:</span>
                      <span className="font-bold text-foreground">R$ {(Number(price) * 0.9).toFixed(2).replace('.', ',')}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground flex justify-between">
                      <span>O comprador paga:</span>
                      <span className="font-bold text-foreground">R$ {(Number(price) * 1.1).toFixed(2).replace('.', ',')}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-brand/5 rounded-2xl flex gap-4 items-center">
                <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center shadow-sm">
                  <div className="w-5 h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-brand">Ótimo valor!</h4>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Suas chances de vender esse ingresso aumentaram significativamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <Button
                onClick={async () => {
                  setIsCreating(true);
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) throw new Error("Não autenticado");

                    // Criar o organizer se não existir (ou usar o existente)
                    let organizerId = organizer?.id;
                    if (!organizerId) {
                      const { data: newOrg, error: orgError } = await supabase
                        .from("organizers")
                        .insert({
                          user_id: user.id,
                          name: user.email?.split('@')[0] || "Vendedor",
                          slug: `vendedor-${Math.random().toString(36).slice(2, 7)}`
                        })
                        .select('id')
                        .single();
                      
                      if (orgError) throw orgError;
                      organizerId = newOrg.id;
                    }

                    // O usuário quer que o anúncio vá para "Para vendedores" (painel) e fique em "eventos".
                    // Como não temos a tabela 'seller_listings' e o sistema usa 'events' com 'organizer_id',
                    // vamos criar um novo evento associado a este organizador se for um anúncio individual,
                    // ou simplesmente confirmar o sucesso se estivermos apenas simulando por enquanto.
                    // A instrução diz que deve ir para a aba "Para vendedores" automaticamente.
                    
                    if (selectedEvent && organizerId) {
                      // Criamos uma cópia do evento original mas vinculada ao organizador atual como um anúncio
                      const { error: listingError } = await supabase
                        .from("events")
                        .insert({
                          title: selectedEvent.title,
                          venue: selectedEvent.venue,
                          city: selectedEvent.city,
                          image_url: selectedEvent.image_url,
                          starts_at: selectedEvent.starts_at,
                          description: selectedEvent.description,
                          organizer_id: organizerId,
                          status: "published", // Fica visível até ser vendido
                          slug: `${selectedEvent.slug}-anuncio-${Math.random().toString(36).slice(2, 7)}`,
                          category: selectedEvent.category || "Shows"
                        });
                      
                      if (listingError) throw listingError;
                    }

                    toast.success("Anúncio criado com sucesso!");
                    navigate({ to: "/painel" });
                  } catch (err: any) {
                    toast.error("Erro ao criar anúncio: " + err.message);
                  } finally {
                    setIsCreating(false);
                  }
                }}
                disabled={isCreating}
                className="w-full bg-brand hover:bg-brand/90 text-brand-foreground rounded-xl h-14 font-bold text-base shadow-glow flex items-center justify-center gap-2"
              >
                {isCreating ? "Publicando..." : "Criar anúncio"}
              </Button>
              <button 
                onClick={() => setStep(3)}
                className="w-full mt-4 text-xs text-muted-foreground font-semibold hover:text-foreground transition-colors"
              >
                Voltar e editar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé informativo ou links extras podem ir aqui */}
      <div className="mt-8 text-center text-xs text-muted-foreground px-4">
        Ao prosseguir, você concorda com nossos termos de uso para vendedores.
      </div>
    </div>
  );
}
