import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { ShieldCheck, RefreshCw, Search, ChevronLeft, ChevronRight, CalendarDays, Building2, Receipt, Wallet, Plus, Pencil, Trash2, Ticket, X, Eye } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/image-upload";
import { CATEGORIES } from "@/lib/events-data";
import { AdminOrderDetails } from "@/components/admin-order-details";
import { deleteOwnerEvent, deleteOwnerOrder, deleteOwnerOrganizer, getOwnerDashboard, saveOwnerEvent, saveOwnerOrder, saveOwnerOrganizer } from "@/lib/owner.functions";
import { slugify } from "@/lib/painel-data";
import { toast } from "sonner";

const ownerQuery = queryOptions({ queryKey: ["owner-dashboard"], queryFn: () => getOwnerDashboard() });
export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Administração — Transfer Ticket Brasil" },
    { name: "description", content: "Administração restrita da Transfer Ticket Brasil." },
    { property: "og:title", content: "Administração — Transfer Ticket Brasil" },
    { property: "og:description", content: "Administração restrita da Transfer Ticket Brasil." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
  component: AdminDashboard,
});

type OwnerData = Awaited<ReturnType<typeof getOwnerDashboard>>;
type OwnerEvent = OwnerData["events"][number];
type OwnerOrganizer = OwnerData["organizers"][number];
type OwnerOrder = OwnerData["orders"][number];
type TierForm = { id?: string; name: string; description: string; price: string; fee: string; total: string; available: string; sort: string };
type EventForm = { id?: string; organizer_id: string; slug: string; title: string; subtitle: string; description: string; image_url: string; category: string; city: string; venue: string; address: string; starts_at: string; ends_at: string; status: "draft" | "published" | "ended" | "cancelled"; featured: boolean; highlights: string; tiers: TierForm[] };
type OrganizerForm = { id?: string; user_id: string; name: string; slug: string; bio: string; avatar_url: string };
type OrderForm = { id?: string; user_id: string; provider: "stripe" | "mercadopago" | "mock"; provider_ref: string; status: "pending" | "paid" | "failed" | "refunded" | "cancelled"; total: string; discount: string; currency: string; buyer_email: string; buyer_name: string; mp_preference_id: string; mp_payment_id: string; refund_status: "none" | "requested" | "refunded" | "failed" };

const labels: Record<string, string> = { published: "Publicado", draft: "Rascunho", cancelled: "Cancelado", ended: "Encerrado", pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado", requested: "Solicitado", none: "Nenhum" };
const money = (cents: number, currency = "BRL") => new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
const date = (value: string) => new Date(value).toLocaleDateString("pt-BR");
const localDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 16) : "";
const isoDate = (value: string) => new Date(value).toISOString();
const cents = (value: string) => Math.round(Number(value.replace(",", ".")) * 100);
const errorMessage = (error: unknown) => error instanceof Error ? error.message : "Não foi possível concluir a operação.";

function Field({ label, children, className = "", hint }: { label: string; children: ReactNode; className?: string; hint?: string }) {
  return <div className={`space-y-2 ${className}`}><Label>{label}</Label>{children}{hint && <p className="text-xs text-muted-foreground">{hint}</p>}</div>;
}
function Status({ value }: { value: string }) {
  return <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${value === "paid" || value === "published" ? "bg-accent text-accent-foreground" : value === "cancelled" || value === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{labels[value] ?? value}</span>;
}
function FormDialog({ open, onOpenChange, title, description, children, onSubmit, pending }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void; pending: boolean }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form onSubmit={onSubmit} className="space-y-6">{children}<DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={pending}>{pending ? "Salvando..." : "Salvar"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function AdminDashboard() {
  const { data, isLoading, error, refetch } = useQuery(ownerQuery);
  const queryClient = useQueryClient();
  const refresh = async () => queryClient.invalidateQueries({ queryKey: ownerQuery.queryKey });
  const saveEventFn = useServerFn(saveOwnerEvent), deleteEventFn = useServerFn(deleteOwnerEvent);
  const saveOrganizerFn = useServerFn(saveOwnerOrganizer), deleteOrganizerFn = useServerFn(deleteOwnerOrganizer);
  const saveOrderFn = useServerFn(saveOwnerOrder), deleteOrderFn = useServerFn(deleteOwnerOrder);

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="flex h-96 flex-col items-center justify-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">Carregando painel administrativo...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container mx-auto max-w-lg px-4 py-16 text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Administração</h1>
          <p className="my-4 text-muted-foreground">
            Acesso restrito. Esta conta não possui o privilégio de administrador ("admin") registrado no banco de dados.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => void refetch()} variant="default">
              Tentar novamente
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                const { supabase } = await import("@/integrations/supabase/client");
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
            >
              Trocar de conta
            </Button>
          </div>
        </main>
      </div>
    );
  }
  const success = async (message: string) => { await refresh(); toast.success(message); };
  const failed = (error: unknown) => toast.error(errorMessage(error));
  const eventSave = useMutation({ mutationFn: (value: Parameters<typeof saveEventFn>[0]["data"]) => saveEventFn({ data: value }), onSuccess: () => { setEventForm(null); void success("Anúncio salvo."); }, onError: failed });
  const eventDelete = useMutation({ mutationFn: (id: string) => deleteEventFn({ data: { id } }), onSuccess: () => void success("Anúncio excluído."), onError: failed });
  const organizerSave = useMutation({ mutationFn: (value: Parameters<typeof saveOrganizerFn>[0]["data"]) => saveOrganizerFn({ data: value }), onSuccess: () => { setOrganizerForm(null); void success("Vendedor salvo."); }, onError: failed });
  const organizerDelete = useMutation({ mutationFn: (id: string) => deleteOrganizerFn({ data: { id } }), onSuccess: () => void success("Vendedor excluído."), onError: failed });
  const orderSave = useMutation({ mutationFn: (value: Parameters<typeof saveOrderFn>[0]["data"]) => saveOrderFn({ data: value }), onSuccess: () => { setOrderForm(null); void success("Pedido salvo."); }, onError: failed });
  const orderDelete = useMutation({ mutationFn: (id: string) => deleteOrderFn({ data: { id } }), onSuccess: () => void success("Pedido excluído."), onError: failed });
  const [tab, setTab] = useState<"events" | "organizers" | "orders">("events");
  const [search, setSearch] = useState(""), [status, setStatus] = useState("all"), [page, setPage] = useState(0);
  const [eventForm, setEventForm] = useState<EventForm | null>(null);
  const [organizerForm, setOrganizerForm] = useState<OrganizerForm | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm | null>(null);
  const [viewOrder, setViewOrder] = useState<string | null>(null);
  const sellerName = (id: string) => data.organizers.find((seller) => seller.id === id)?.name ?? "—";
  const term = search.trim().toLocaleLowerCase("pt-BR");
  const events = data.events.filter((event) => `${event.title} ${event.city ?? ""} ${sellerName(event.organizer_id)}`.toLocaleLowerCase("pt-BR").includes(term) && (status === "all" || event.status === status));
  const organizers = data.organizers.filter((seller) => `${seller.name} ${seller.slug}`.toLocaleLowerCase("pt-BR").includes(term));
  const orders = data.orders.filter((order) => `${order.id} ${order.buyer_name ?? ""} ${order.buyer_email ?? ""}`.toLocaleLowerCase("pt-BR").includes(term) && (status === "all" || order.status === status));
  const count = tab === "events" ? events.length : tab === "organizers" ? organizers.length : orders.length;
  const pages = Math.max(1, Math.ceil(count / 20)), current = Math.min(page, pages - 1), start = current * 20;
  const paid = data.orders.filter((order) => order.status === "paid");
  const totals = paid.reduce<Record<string, number>>((result, order) => ({ ...result, [order.currency]: (result[order.currency] ?? 0) + order.total_cents }), {});
  const newTier = (): TierForm => ({ name: "", description: "", price: "0", fee: "0", total: "0", available: "0", sort: "0" });
  const newEvent = (): EventForm => ({ organizer_id: data.organizers[0]?.id ?? "", slug: "", title: "", subtitle: "", description: "", image_url: "", category: "Shows", city: "", venue: "", address: "", starts_at: "", ends_at: "", status: "draft", featured: false, highlights: "", tiers: [newTier()] });
  const editEvent = (event: OwnerEvent): EventForm => ({ id: event.id, organizer_id: event.organizer_id, slug: event.slug, title: event.title, subtitle: event.subtitle ?? "", description: event.description ?? "", image_url: event.image_url ?? "", category: event.category ?? "Shows", city: event.city ?? "", venue: event.venue ?? "", address: event.address ?? "", starts_at: localDate(event.starts_at), ends_at: localDate(event.ends_at), status: event.status, featured: event.featured, highlights: (event.highlights ?? []).join("\n"), tiers: [...event.ticket_tiers].sort((a, b) => a.sort_order - b.sort_order).map((tier) => ({ id: tier.id, name: tier.name, description: tier.description ?? "", price: String(tier.price_cents / 100), fee: String(tier.fee_cents / 100), total: String(tier.quantity_total), available: String(tier.quantity_available), sort: String(tier.sort_order) })) });
  const editOrganizer = (seller: OwnerOrganizer): OrganizerForm => ({ id: seller.id, user_id: seller.user_id ?? "", name: seller.name, slug: seller.slug, bio: seller.bio ?? "", avatar_url: seller.avatar_url ?? "" });
  const editOrder = (order: OwnerOrder): OrderForm => ({ id: order.id, user_id: order.user_id, provider: order.provider, provider_ref: order.provider_ref ?? "", status: order.status, total: String(order.total_cents / 100), discount: String(order.discount_cents / 100), currency: order.currency, buyer_email: order.buyer_email ?? "", buyer_name: order.buyer_name ?? "", mp_preference_id: order.mp_preference_id ?? "", mp_payment_id: order.mp_payment_id ?? "", refund_status: order.refund_status });
  const confirmDelete = (kind: string, name: string, action: () => void) => { if (window.confirm(`Excluir ${kind} “${name}”? Esta ação não pode ser desfeita.`)) action(); };

  return <div className="min-h-screen bg-background"><SiteHeader /><main className="container mx-auto max-w-7xl px-4 py-8 md:py-12">
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-brand"><ShieldCheck className="size-4" /> Transfer Ticket Brasil</div><h1 className="text-3xl font-semibold">Administração</h1></div><Button variant="outline" onClick={() => void refresh()}><RefreshCw />Atualizar</Button></div>
    <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">{[
      { icon: CalendarDays, label: "Anúncios", value: String(data.events.length), detail: `${data.events.filter((event) => event.status === "published").length} publicados` },
      { icon: Building2, label: "Vendedores", value: String(data.organizers.length), detail: "Cadastrados" },
      { icon: Receipt, label: "Pedidos", value: String(data.orders.length), detail: `${paid.length} pagos` },
      { icon: Wallet, label: "Vendas pagas", value: Object.entries(totals).map(([currency, value]) => money(value, currency)).join(" · ") || money(0), detail: "Total dos pedidos pagos" },
    ].map(({ icon: Icon, label, value, detail }) => <div key={label} className="rounded-md border border-border bg-card p-4"><div className="mb-4 flex items-center justify-between gap-2 text-sm text-muted-foreground">{label}<Icon className="size-4 shrink-0 text-brand" /></div><p className="break-words text-xl font-semibold">{value}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p></div>)}</div>
    <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-border pb-3">{([{ key: "events", label: "Anúncios", icon: CalendarDays }, { key: "organizers", label: "Vendedores", icon: Building2 }, { key: "orders", label: "Pedidos", icon: Receipt }] as const).map(({ key, label, icon: Icon }) => <Button key={key} variant={tab === key ? "default" : "ghost"} onClick={() => { setTab(key); setStatus("all"); setSearch(""); setPage(0); }}><Icon />{label}</Button>)}<Button className="ml-auto" onClick={() => tab === "events" ? setEventForm(newEvent()) : tab === "organizers" ? setOrganizerForm({ user_id: "", name: "", slug: "", bio: "", avatar_url: "" }) : setOrderForm({ user_id: "", provider: "mercadopago", provider_ref: "", status: "pending", total: "0", discount: "0", currency: "BRL", buyer_email: "", buyer_name: "", mp_preference_id: "", mp_payment_id: "", refund_status: "none" })}><Plus />Inserir {tab === "events" ? "anúncio" : tab === "organizers" ? "vendedor" : "pedido"}</Button></div>
    <div className="mb-5 flex flex-wrap gap-3"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input aria-label="Buscar na administração" placeholder={tab === "orders" ? "Buscar por comprador, e-mail ou pedido" : tab === "events" ? "Buscar anúncio, cidade ou vendedor" : "Buscar vendedor"} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="pl-10" /></div>{tab !== "organizers" && <select aria-label="Filtrar por situação" value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className="h-9 rounded-md border border-input bg-card px-3 text-sm"><option value="all">Todas as situações</option>{(tab === "events" ? ["published", "draft", "ended", "cancelled"] : ["pending", "paid", "failed", "refunded", "cancelled"]).map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select>}</div>
    <div className="overflow-x-auto border-y border-border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/50 text-xs text-muted-foreground"><tr>{(tab === "events" ? ["Anúncio", "Vendedor", "Data", "Situação", "Ações"] : tab === "organizers" ? ["Vendedor", "Anúncios", "Publicados", "Cadastro", "Ações"] : ["Pedido / Comprador", "Data", "Valor", "Pagamento", "Situação", "Ações"]).map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody className="divide-y divide-border">
      {tab === "events" && events.slice(start, start + 20).map((event) => <tr key={event.id}><td className="px-4 py-4"><div className="flex items-center gap-3">{event.image_url && <img src={event.image_url} alt="" className="h-12 w-16 shrink-0 rounded-md object-cover" />}<div><p className="font-medium">{event.title}</p><p className="mt-1 text-xs text-muted-foreground">{event.city ?? "—"}</p></div></div></td><td className="px-4 py-4">{sellerName(event.organizer_id)}</td><td className="whitespace-nowrap px-4 py-4">{date(event.starts_at)}</td><td className="px-4 py-4"><Status value={event.status} /></td><td className="px-4 py-4"><div className="flex gap-1"><Button size="icon" variant="ghost" title="Editar" onClick={() => setEventForm(editEvent(event))}><Pencil /></Button><Button size="icon" variant="ghost" title="Excluir" onClick={() => confirmDelete("o anúncio", event.title, () => eventDelete.mutate(event.id))}><Trash2 className="text-destructive" /></Button></div></td></tr>)}
      {tab === "organizers" && organizers.slice(start, start + 20).map((seller) => <tr key={seller.id}><td className="px-4 py-4"><p className="font-medium">{seller.name}</p><p className="mt-1 text-xs text-muted-foreground">{seller.slug}</p></td><td className="px-4 py-4">{data.events.filter((event) => event.organizer_id === seller.id).length}</td><td className="px-4 py-4">{data.events.filter((event) => event.organizer_id === seller.id && event.status === "published").length}</td><td className="px-4 py-4">{date(seller.created_at)}</td><td className="px-4 py-4"><div className="flex gap-1"><Button size="icon" variant="ghost" title="Editar" onClick={() => setOrganizerForm(editOrganizer(seller))}><Pencil /></Button><Button size="icon" variant="ghost" title="Excluir" onClick={() => confirmDelete("o vendedor", seller.name, () => organizerDelete.mutate(seller.id))}><Trash2 className="text-destructive" /></Button></div></td></tr>)}
      {tab === "orders" && orders.slice(start, start + 20).map((order) => <tr key={order.id}><td className="px-4 py-4"><p className="font-medium">{order.buyer_name ?? "Não informado"}</p><p className="mt-1 text-xs text-muted-foreground">{order.buyer_email ?? "—"}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{order.id}</p></td><td className="whitespace-nowrap px-4 py-4">{date(order.created_at)}</td><td className="whitespace-nowrap px-4 py-4 font-medium">{money(order.total_cents, order.currency)}</td><td className="px-4 py-4">{order.provider === "mercadopago" ? "Mercado Pago" : order.provider}</td><td className="px-4 py-4"><Status value={order.status} /></td><td className="px-4 py-4"><div className="flex gap-1"><Button size="icon" variant="ghost" title="Ver detalhes" onClick={() => setViewOrder(order.id)}><Eye /></Button><Button size="icon" variant="ghost" title="Editar" onClick={() => setOrderForm(editOrder(order))}><Pencil /></Button><Button size="icon" variant="ghost" title="Excluir" onClick={() => confirmDelete("o pedido", order.id, () => orderDelete.mutate(order.id))}><Trash2 className="text-destructive" /></Button></div></td></tr>)}
      {count === 0 && <tr><td colSpan={6} className="py-16 text-center text-muted-foreground">Nenhum resultado encontrado.</td></tr>}
    </tbody></table></div><div className="mt-4 flex items-center justify-between gap-3 text-sm text-muted-foreground"><p>{count} resultados · Página {current + 1} de {pages}</p><div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Página anterior" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft /></Button><Button variant="outline" size="icon" aria-label="Próxima página" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}><ChevronRight /></Button></div></div>
  </main>

  {viewOrder && <AdminOrderDetails orderId={viewOrder} onClose={() => setViewOrder(null)} />}
  {eventForm && <FormDialog open title={eventForm.id ? "Editar anúncio" : "Inserir anúncio"} description="Preencha as informações exibidas nas páginas do evento e os tipos de ingresso." pending={eventSave.isPending} onOpenChange={(open) => !open && setEventForm(null)} onSubmit={(e) => { e.preventDefault(); eventSave.mutate({ id: eventForm.id, organizer_id: eventForm.organizer_id, slug: eventForm.slug, title: eventForm.title, subtitle: eventForm.subtitle || null, description: eventForm.description || null, image_url: eventForm.image_url || null, category: eventForm.category || null, city: eventForm.city || null, venue: eventForm.venue || null, address: eventForm.address || null, starts_at: isoDate(eventForm.starts_at), ends_at: eventForm.ends_at ? isoDate(eventForm.ends_at) : null, status: eventForm.status, featured: eventForm.featured, highlights: eventForm.highlights.split("\n").map((v) => v.trim()).filter(Boolean), tiers: eventForm.tiers.map((tier) => ({ id: tier.id, name: tier.name, description: tier.description || null, price_cents: cents(tier.price), fee_cents: cents(tier.fee), quantity_total: Number(tier.total), quantity_available: Number(tier.available), sort_order: Number(tier.sort) })) }); }}>
    <div className="grid gap-4 md:grid-cols-2"><Field label="Vendedor"><select required value={eventForm.organizer_id} onChange={(e) => setEventForm({ ...eventForm, organizer_id: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Selecione</option>{data.organizers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name}</option>)}</select></Field><Field label="Situação"><select value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value as EventForm["status"] })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{["draft", "published", "ended", "cancelled"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></Field><Field label="Título"><Input required maxLength={200} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value, slug: eventForm.id ? eventForm.slug : slugify(e.target.value) })} /></Field><Field label="Endereço da página"><Input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={eventForm.slug} onChange={(e) => setEventForm({ ...eventForm, slug: slugify(e.target.value) })} /></Field><Field label="Subtítulo" className="md:col-span-2"><Input maxLength={300} value={eventForm.subtitle} onChange={(e) => setEventForm({ ...eventForm, subtitle: e.target.value })} /></Field><Field label="Categoria"><select value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label="Cidade"><Input maxLength={120} value={eventForm.city} onChange={(e) => setEventForm({ ...eventForm, city: e.target.value })} /></Field><Field label="Local"><Input maxLength={200} value={eventForm.venue} onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })} /></Field><Field label="Endereço"><Input maxLength={300} value={eventForm.address} onChange={(e) => setEventForm({ ...eventForm, address: e.target.value })} /></Field><Field label="Início"><Input required type="datetime-local" value={eventForm.starts_at} onChange={(e) => setEventForm({ ...eventForm, starts_at: e.target.value })} /></Field><Field label="Término"><Input type="datetime-local" value={eventForm.ends_at} onChange={(e) => setEventForm({ ...eventForm, ends_at: e.target.value })} /></Field><Field label="Descrição" className="md:col-span-2"><Textarea rows={7} maxLength={5000} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} /></Field><Field label="Destaques" className="md:col-span-2" hint="Um destaque por linha."><Textarea rows={3} value={eventForm.highlights} onChange={(e) => setEventForm({ ...eventForm, highlights: e.target.value })} /></Field><Field label="Imagem do anúncio" className="md:col-span-2"><ImageUpload value={eventForm.image_url} onChange={(image_url) => setEventForm({ ...eventForm, image_url })} guidance="Tamanho ideal: 1600 × 900 px, proporção 16:9. Use JPG, PNG ou WebP com até 5 MB; mantenha textos e rostos longe das bordas." /></Field><label className="flex items-center gap-2 text-sm font-medium md:col-span-2"><input type="checkbox" checked={eventForm.featured} onChange={(e) => setEventForm({ ...eventForm, featured: e.target.checked })} /> Destacar na página inicial</label></div>
    <section className="space-y-3 border-t border-border pt-5"><div className="flex items-center justify-between"><div><h3 className="font-semibold">Tipos de ingresso</h3><p className="text-xs text-muted-foreground">Defina preço, taxa e estoque de cada opção.</p></div><Button type="button" size="sm" variant="outline" onClick={() => setEventForm({ ...eventForm, tiers: [...eventForm.tiers, newTier()] })}><Plus />Adicionar tipo</Button></div>{eventForm.tiers.map((tier, index) => <div key={tier.id ?? index} className="grid gap-3 rounded-md border border-border p-4 md:grid-cols-6"><Field label="Nome" className="md:col-span-2"><Input required value={tier.name} onChange={(e) => { const tiers = [...eventForm.tiers]; tiers[index] = { ...tier, name: e.target.value }; setEventForm({ ...eventForm, tiers }); }} /></Field><Field label="Preço (R$)"><Input required inputMode="decimal" value={tier.price} onChange={(e) => { const tiers = [...eventForm.tiers]; tiers[index] = { ...tier, price: e.target.value }; setEventForm({ ...eventForm, tiers }); }} /></Field><Field label="Taxa (R$)"><Input required inputMode="decimal" value={tier.fee} onChange={(e) => { const tiers = [...eventForm.tiers]; tiers[index] = { ...tier, fee: e.target.value }; setEventForm({ ...eventForm, tiers }); }} /></Field><Field label="Total"><Input required type="number" min="0" value={tier.total} onChange={(e) => { const tiers = [...eventForm.tiers]; tiers[index] = { ...tier, total: e.target.value }; setEventForm({ ...eventForm, tiers }); }} /></Field><Field label="Disponível"><Input required type="number" min="0" value={tier.available} onChange={(e) => { const tiers = [...eventForm.tiers]; tiers[index] = { ...tier, available: e.target.value }; setEventForm({ ...eventForm, tiers }); }} /></Field><Field label="Descrição" className="md:col-span-5"><Input value={tier.description} onChange={(e) => { const tiers = [...eventForm.tiers]; tiers[index] = { ...tier, description: e.target.value }; setEventForm({ ...eventForm, tiers }); }} /></Field><div className="flex items-end justify-end"><Button type="button" size="icon" variant="ghost" aria-label="Remover tipo" onClick={() => setEventForm({ ...eventForm, tiers: eventForm.tiers.filter((_, tierIndex) => tierIndex !== index) })}><X className="text-destructive" /></Button></div></div>)}</section>
  </FormDialog>}

  {organizerForm && <FormDialog open title={organizerForm.id ? "Editar vendedor" : "Inserir vendedor"} description="Cadastre as informações públicas e, se necessário, vincule uma conta existente." pending={organizerSave.isPending} onOpenChange={(open) => !open && setOrganizerForm(null)} onSubmit={(e) => { e.preventDefault(); organizerSave.mutate({ id: organizerForm.id, user_id: organizerForm.user_id || null, name: organizerForm.name, slug: organizerForm.slug, bio: organizerForm.bio || null, avatar_url: organizerForm.avatar_url || null }); }}><div className="grid gap-4 md:grid-cols-2"><Field label="Nome"><Input required maxLength={160} value={organizerForm.name} onChange={(e) => setOrganizerForm({ ...organizerForm, name: e.target.value, slug: organizerForm.id ? organizerForm.slug : slugify(e.target.value) })} /></Field><Field label="Identificador público"><Input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={organizerForm.slug} onChange={(e) => setOrganizerForm({ ...organizerForm, slug: slugify(e.target.value) })} /></Field><Field label="ID da conta" className="md:col-span-2" hint="Opcional. Use o identificador UUID da conta que será proprietária dos anúncios."><Input value={organizerForm.user_id} onChange={(e) => setOrganizerForm({ ...organizerForm, user_id: e.target.value.trim() })} /></Field><Field label="Biografia" className="md:col-span-2"><Textarea rows={5} maxLength={5000} value={organizerForm.bio} onChange={(e) => setOrganizerForm({ ...organizerForm, bio: e.target.value })} /></Field><Field label="Imagem do vendedor" className="md:col-span-2"><ImageUpload folder="organizers" value={organizerForm.avatar_url} onChange={(avatar_url) => setOrganizerForm({ ...organizerForm, avatar_url })} guidance="Tamanho ideal: 800 × 800 px, proporção quadrada. JPG, PNG ou WebP com até 5 MB." /></Field></div></FormDialog>}

  {orderForm && <FormDialog open title={orderForm.id ? "Editar pedido" : "Inserir pedido"} description="Pedidos inseridos manualmente não processam cobrança nem emitem ingressos automaticamente." pending={orderSave.isPending} onOpenChange={(open) => !open && setOrderForm(null)} onSubmit={(e) => { e.preventDefault(); orderSave.mutate({ id: orderForm.id, user_id: orderForm.user_id, provider: orderForm.provider, provider_ref: orderForm.provider_ref || null, status: orderForm.status, total_cents: cents(orderForm.total), discount_cents: cents(orderForm.discount), currency: orderForm.currency, buyer_email: orderForm.buyer_email || null, buyer_name: orderForm.buyer_name || null, mp_preference_id: orderForm.mp_preference_id || null, mp_payment_id: orderForm.mp_payment_id || null, refund_status: orderForm.refund_status }); }}><div className="grid gap-4 md:grid-cols-2"><Field label="ID da conta" className="md:col-span-2"><Input required value={orderForm.user_id} onChange={(e) => setOrderForm({ ...orderForm, user_id: e.target.value.trim() })} /></Field><Field label="Nome do comprador"><Input maxLength={200} value={orderForm.buyer_name} onChange={(e) => setOrderForm({ ...orderForm, buyer_name: e.target.value })} /></Field><Field label="E-mail do comprador"><Input type="email" maxLength={255} value={orderForm.buyer_email} onChange={(e) => setOrderForm({ ...orderForm, buyer_email: e.target.value })} /></Field><Field label="Valor total"><Input required inputMode="decimal" value={orderForm.total} onChange={(e) => setOrderForm({ ...orderForm, total: e.target.value })} /></Field><Field label="Desconto"><Input required inputMode="decimal" value={orderForm.discount} onChange={(e) => setOrderForm({ ...orderForm, discount: e.target.value })} /></Field><Field label="Moeda"><Input required minLength={3} maxLength={3} value={orderForm.currency} onChange={(e) => setOrderForm({ ...orderForm, currency: e.target.value.toUpperCase() })} /></Field><Field label="Provedor"><select value={orderForm.provider} onChange={(e) => setOrderForm({ ...orderForm, provider: e.target.value as OrderForm["provider"] })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{["mercadopago", "stripe", "mock"].map((value) => <option key={value}>{value}</option>)}</select></Field><Field label="Situação"><select value={orderForm.status} onChange={(e) => setOrderForm({ ...orderForm, status: e.target.value as OrderForm["status"] })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{["pending", "paid", "failed", "refunded", "cancelled"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></Field><Field label="Reembolso"><select value={orderForm.refund_status} onChange={(e) => setOrderForm({ ...orderForm, refund_status: e.target.value as OrderForm["refund_status"] })} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">{["none", "requested", "refunded", "failed"].map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></Field><Field label="Referência do provedor"><Input maxLength={255} value={orderForm.provider_ref} onChange={(e) => setOrderForm({ ...orderForm, provider_ref: e.target.value })} /></Field><Field label="Preferência Mercado Pago"><Input maxLength={255} value={orderForm.mp_preference_id} onChange={(e) => setOrderForm({ ...orderForm, mp_preference_id: e.target.value })} /></Field><Field label="Pagamento Mercado Pago"><Input maxLength={255} value={orderForm.mp_payment_id} onChange={(e) => setOrderForm({ ...orderForm, mp_payment_id: e.target.value })} /></Field></div></FormDialog>}
  </div>;
}