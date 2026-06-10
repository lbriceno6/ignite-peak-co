import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, X, MessageCircle, Sparkles, Send } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { ESTADO_BADGE, ESTADO_LABEL, INTEREST_LABEL, renderTemplate, waLink, type CrmEstado } from "@/lib/crm";

export default function CrmCustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const { format } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Record<string, any>>({});
  const [events, setEvents] = useState<any[]>([]);
  const [searches, setSearches] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [wa, setWa] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [interests, setInterests] = useState<any[]>([]);
  const [aiOut, setAiOut] = useState<any>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const sb = supabase as any;
    const [{ data: c }, { data: ord }, { data: pe }, { data: sl }, { data: ci }, { data: pr }, { data: nt }, { data: tk }, { data: tg }, { data: wlog }, { data: tpl }, { data: ints }] = await Promise.all([
      sb.from("crm_customers").select("*").eq("user_id", id).maybeSingle(),
      sb.from("orders").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("product_events").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
      sb.from("search_logs").select("*").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
      sb.from("cart_items").select("*, products(name,slug,price,sale_price,main_image)").eq("user_id", id),
      sb.from("profiles").select("*").eq("id", id).maybeSingle(),
      sb.from("crm_customer_notes").select("*").eq("user_id", id).order("created_at", { ascending: false }),
      sb.from("crm_tasks").select("*").eq("user_id", id).order("due_date", { ascending: true, nullsFirst: false }),
      sb.from("crm_customer_tags").select("*").eq("user_id", id),
      sb.from("crm_whatsapp_log").select("*, crm_message_templates(name)").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      sb.from("crm_message_templates").select("*").eq("is_active", true).order("name"),
      sb.from("crm_customer_interests").select("*").eq("user_id", id).order("score", { ascending: false }),
    ]);
    setCustomer({ ...(c || {}), ...(pr || {}) });
    setOrders(ord || []);
    setEvents(pe || []);
    setSearches(sl || []);
    setCart(ci || []);
    setNotes(nt || []);
    setTasks(tk || []);
    setTags(tg || []);
    setWa(wlog || []);
    setTemplates(tpl || []);
    setInterests(ints || []);
    if ((ord || []).length) {
      const oids = (ord || []).map((o: any) => o.id);
      const { data: sh } = await sb.from("order_shipments").select("*").in("order_id", oids);
      const map: any = {};
      (sh || []).forEach((s: any) => (map[s.order_id] = s));
      setShipments(map);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const callAi = async (action: string) => {
    if (!customer) return;
    setAiBusy(action);
    try {
      const catalog = orders.flatMap((o) => o.order_items || []).map((it: any) => it?.product_name).filter(Boolean).slice(0, 20);
      const payload = {
        action,
        customer: {
          id: customer.user_id,
          full_name: customer.full_name,
          phone: customer.phone,
          city: customer.city,
          total_orders: customer.total_orders,
          total_spent: customer.total_spent,
          last_order_at: customer.last_order_at,
          estado: customer.estado,
          primary_interest: customer.primary_interest,
          interests: interests.map((i) => ({ code: i.interest_code, score: i.score, is_primary: i.is_primary })),
          recent_searches: searches.slice(0, 10).map((s) => s.query),
        },
        catalog,
      };
      const { data, error } = await (supabase as any).functions.invoke("crm-ai", { body: payload });
      if (error) throw error;
      setAiOut({ action, data });
    } catch (e: any) {
      toast.error("Error IA: " + (e?.message || e));
    } finally {
      setAiBusy(null);
    }
  };

  if (loading || !customer) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const est = (customer.estado || "nuevo") as CrmEstado;
  const totalSpent = Number(customer.total_spent || 0);
  const avgTicket = Number(customer.avg_ticket || 0);

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground"><Link to="/admin/crm/clientes" className="hover:underline">← Clientes</Link></div>
          <h1 className="text-2xl font-bold">{customer.full_name || "(sin nombre)"}</h1>
          <div className="mt-1 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{customer.email}</span><span>·</span><span>{customer.phone || "sin teléfono"}</span>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-medium ${ESTADO_BADGE[est]}`}>{ESTADO_LABEL[est]}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Contacto</div>
          <div className="mt-2 space-y-1 text-sm">
            <Row label="Email" value={customer.email} />
            <Row label="Teléfono" value={customer.phone} />
            <Row label="Dirección" value={customer.address} />
            <Row label="Ciudad" value={customer.city} />
            <Row label="País" value={customer.country} />
            <Row label="Registro" value={customer.registered_at ? new Date(customer.registered_at).toLocaleDateString() : null} />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Comercial</div>
          <div className="mt-2 space-y-1 text-sm">
            <Row label="Total comprado" value={format(totalSpent)} />
            <Row label="Ticket promedio" value={format(avgTicket)} />
            <Row label="Pedidos" value={customer.total_orders} />
            <Row label="Días desde última compra" value={customer.days_since_last ?? "—"} />
            <Row label="Frecuencia (días)" value={customer.frequency_days ? Math.round(Number(customer.frequency_days)) : "—"} />
            <Row label="Interés principal" value={customer.primary_interest ? (INTEREST_LABEL[customer.primary_interest] || customer.primary_interest) : "—"} />
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4 space-y-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Etiquetas</div>
          <TagEditor userId={id!} tags={tags} onChange={setTags} />
        </CardContent></Card>
      </div>

      <Card><CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4" /> Asistente IA</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {["summary","intent","recommend","whatsapp","next_action","coupon"].map((a) => (
            <Button key={a} size="sm" variant="outline" disabled={aiBusy !== null} onClick={() => callAi(a)}>
              {aiBusy === a ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
              {labelForAction(a)}
            </Button>
          ))}
        </div>
        {aiOut && (
          <pre className="mt-3 max-h-64 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(aiOut.data, null, 2)}</pre>
        )}
      </CardContent></Card>

      <Tabs defaultValue="pedidos">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="pedidos">Pedidos ({orders.length})</TabsTrigger>
          <TabsTrigger value="carrito">Carrito ({cart.length})</TabsTrigger>
          <TabsTrigger value="navegacion">Navegación</TabsTrigger>
          <TabsTrigger value="busquedas">Búsquedas</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          <TabsTrigger value="notas">Notas</TabsTrigger>
          <TabsTrigger value="tareas">Tareas</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <Card><CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left"><tr>
                <th className="px-3 py-2">Código</th><th className="px-3 py-2">Fecha</th><th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Tracking</th><th className="px-3 py-2 text-right">Total</th>
              </tr></thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b">
                    <td className="px-3 py-2 font-mono text-xs"><Link to={`/admin/orders/${o.id}`} className="hover:underline">{o.order_code}</Link></td>
                    <td className="px-3 py-2 text-xs">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2"><Badge variant="outline">{o.status}</Badge></td>
                    <td className="px-3 py-2 text-xs">{shipments[o.id]?.tracking_code || "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold">{format(Number(o.total))}</td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin pedidos.</td></tr>}
              </tbody>
            </table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="carrito">
          <Card><CardContent className="p-4">
            {cart.length === 0 ? <p className="text-sm text-muted-foreground">Carrito vacío.</p> : (
              <ul className="space-y-2 text-sm">
                {cart.map((c) => (
                  <li key={c.id} className="flex justify-between border-b py-1">
                    <span>{c.products?.name || c.product_id}</span>
                    <span className="text-muted-foreground">x{c.quantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="navegacion">
          <Card><CardContent className="p-4">
            {events.length === 0 ? <p className="text-sm text-muted-foreground">Sin actividad.</p> : (
              <ul className="space-y-1 text-xs">
                {events.map((e) => (
                  <li key={e.id} className="flex justify-between border-b py-1">
                    <span><Badge variant="outline" className="mr-2">{e.event_type}</Badge>{e.product_slug || "—"}</span>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="busquedas">
          <Card><CardContent className="p-4">
            {searches.length === 0 ? <p className="text-sm text-muted-foreground">Sin búsquedas.</p> : (
              <ul className="space-y-1 text-xs">
                {searches.map((s) => (
                  <li key={s.id} className="flex justify-between border-b py-1">
                    <span><strong>{s.query}</strong> · {s.results_count ?? 0} resultados</span>
                    <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppPanel
            userId={id!}
            phone={customer.phone}
            templates={templates}
            history={wa}
            customer={customer}
            onSent={load}
          />
        </TabsContent>

        <TabsContent value="notas">
          <NotesPanel userId={id!} notes={notes} onChange={setNotes} />
        </TabsContent>

        <TabsContent value="tareas">
          <TasksPanel userId={id!} tasks={tasks} onChange={setTasks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function labelForAction(a: string) {
  const map: Record<string, string> = {
    summary: "Resumen", intent: "Intención", recommend: "Recomendar",
    whatsapp: "Mensaje WhatsApp", next_action: "Próxima acción", coupon: "Cupón sugerido",
  };
  return map[a] || a;
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}

function TagEditor({ userId, tags, onChange }: { userId: string; tags: any[]; onChange: (t: any[]) => void }) {
  const [val, setVal] = useState("");
  const add = async () => {
    const tag = val.trim();
    if (!tag) return;
    const { data, error } = await (supabase as any).from("crm_customer_tags").insert({ user_id: userId, tag }).select().single();
    if (error) return toast.error(error.message);
    onChange([...tags, data]);
    setVal("");
  };
  const remove = async (id: string) => {
    await (supabase as any).from("crm_customer_tags").delete().eq("id", id);
    onChange(tags.filter((t) => t.id !== id));
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((t) => (
          <Badge key={t.id} variant="outline" className="gap-1">
            {t.tag}
            <button onClick={() => remove(t.id)} aria-label="Eliminar etiqueta"><X className="h-3 w-3" /></button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-1">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="Nueva etiqueta" className="h-8 text-sm" />
        <Button size="sm" onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function NotesPanel({ userId, notes, onChange }: { userId: string; notes: any[]; onChange: (n: any[]) => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!body.trim()) return;
    setBusy(true);
    const { data, error } = await (supabase as any).from("crm_customer_notes").insert({ user_id: userId, body: body.trim() }).select().single();
    setBusy(false);
    if (error) return toast.error(error.message);
    onChange([data, ...notes]);
    setBody("");
  };
  return (
    <Card><CardContent className="space-y-3 p-4">
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Agregar nota interna" rows={3} />
      <Button size="sm" onClick={add} disabled={busy}>{busy ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}Agregar nota</Button>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li key={n.id} className="border-b pb-2 text-sm">
            <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
            <div className="whitespace-pre-wrap">{n.body}</div>
          </li>
        ))}
        {notes.length === 0 && <li className="text-sm text-muted-foreground">Sin notas.</li>}
      </ul>
    </CardContent></Card>
  );
}

function TasksPanel({ userId, tasks, onChange }: { userId: string; tasks: any[]; onChange: (t: any[]) => void }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("llamar");
  const [due, setDue] = useState("");
  const add = async () => {
    if (!title.trim()) return;
    const { data, error } = await (supabase as any).from("crm_tasks").insert({ user_id: userId, title: title.trim(), type, due_date: due || null }).select().single();
    if (error) return toast.error(error.message);
    onChange([data, ...tasks]);
    setTitle(""); setDue("");
  };
  const setStatus = async (id: string, status: string) => {
    await (supabase as any).from("crm_tasks").update({ status }).eq("id", id);
    onChange(tasks.map((t) => (t.id === id ? { ...t, status } : t)));
  };
  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="grid gap-2 md:grid-cols-4">
        <Input className="md:col-span-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {["llamar","whatsapp","confirmar_pago","verificar_entrega","recompra","otro"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
      </div>
      <Button size="sm" onClick={add}>Crear tarea</Button>
      <ul className="space-y-1 text-sm">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center justify-between border-b py-1">
            <div>
              <Badge variant="outline" className="mr-2">{t.type}</Badge>
              <span className={t.status === "hecha" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
              {t.due_date && <span className="ml-2 text-xs text-muted-foreground">{new Date(t.due_date).toLocaleString()}</span>}
            </div>
            <Select value={t.status} onValueChange={(v) => setStatus(t.id, v)}>
              <SelectTrigger className="h-7 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["pendiente","en_progreso","hecha","cancelada"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </li>
        ))}
        {tasks.length === 0 && <li className="text-muted-foreground">Sin tareas.</li>}
      </ul>
    </CardContent></Card>
  );
}

function WhatsAppPanel({ userId, phone, templates, history, customer, onSent }: any) {
  const [tplId, setTplId] = useState("");
  const [body, setBody] = useState("");
  const tpl = templates.find((t: any) => t.id === tplId);

  useEffect(() => {
    if (!tpl) return;
    const rendered = renderTemplate(tpl.body, {
      nombre: customer.full_name || "",
      interes: customer.primary_interest || "",
      producto: "",
      link: "",
      order_code: "",
      tracking: "",
      cupon: "",
    });
    setBody(rendered);
  }, [tplId]); // eslint-disable-line

  const send = async () => {
    if (!body.trim()) return;
    const url = waLink(phone, body);
    if (!url) return toast.error("Cliente sin teléfono");
    await (supabase as any).from("crm_whatsapp_log").insert({
      user_id: userId, template_id: tplId || null, phone, body, status: "sent",
    });
    window.open(url, "_blank");
    onSent();
  };

  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Select value={tplId} onValueChange={setTplId}>
          <SelectTrigger><SelectValue placeholder="Elegir plantilla" /></SelectTrigger>
          <SelectContent>
            {templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground self-center">Tel: {phone || "—"}</div>
      </div>
      <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Mensaje" />
      <Button size="sm" onClick={send} disabled={!phone}><Send className="mr-2 h-3 w-3" />Abrir WhatsApp y registrar</Button>

      <div>
        <div className="mt-3 mb-1 text-xs font-semibold uppercase text-muted-foreground">Historial</div>
        <ul className="space-y-1 text-xs">
          {history.map((h: any) => (
            <li key={h.id} className="border-b py-1">
              <div className="flex justify-between">
                <span><MessageCircle className="mr-1 inline h-3 w-3" />{h.crm_message_templates?.name || h.template_id || "Manual"} · <Badge variant="outline">{h.status}</Badge></span>
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
              </div>
              <div className="text-muted-foreground">{h.body}</div>
            </li>
          ))}
          {history.length === 0 && <li className="text-muted-foreground">Sin envíos.</li>}
        </ul>
      </div>
    </CardContent></Card>
  );
}
