import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Search, MessageCircle, Clock, User, ExternalLink } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";

type Conv = {
  id: string; contact_id: string; channel: string; status: string;
  wa_id: string; phone: string | null; name: string | null; profile_id: string | null;
  last_message_at: string | null; last_message_preview: string | null;
  unread_count: number; window_open: boolean; last_inbound_at: string | null;
};
type Msg = {
  id: string; conversation_id: string; direction: "in" | "out"; type: string;
  body: string | null; media_url: string | null; status: string; created_at: string;
};

export default function WhatsAppInbox() {
  const { format } = useCurrency();
  const [convs, setConvs] = useState<Conv[]>([]);
  const [active, setActive] = useState<Conv | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [crm, setCrm] = useState<any | null>(null);
  const [crmTags, setCrmTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  const loadConvs = async () => {
    const { data } = await (supabase as any)
      .from("wa_conversations_v").select("*")
      .order("last_message_at", { ascending: false, nullsFirst: false })
      .limit(100);
    setConvs((data || []) as Conv[]);
    setLoading(false);
  };
  useEffect(() => { loadConvs(); }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("wa-inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wa_messages" }, (p) => {
        const m = p.new as Msg;
        if (active && m.conversation_id === active.id)
          setMsgs((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        loadConvs();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wa_messages" }, () => loadConvs())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [active]);

  const openConv = async (c: Conv) => {
    setActive(c); setCrm(null); setCrmTags([]);
    const { data } = await (supabase as any)
      .from("wa_messages").select("*").eq("conversation_id", c.id)
      .order("created_at", { ascending: true }).limit(200);
    setMsgs((data || []) as Msg[]);
    if (c.unread_count > 0) {
      await (supabase as any).from("wa_conversations").update({ unread_count: 0 }).eq("id", c.id);
      loadConvs();
    }
    // panel CRM 360
    if (c.profile_id) {
      const { data: cust } = await (supabase as any)
        .from("crm_customers").select("*").eq("user_id", c.profile_id).maybeSingle();
      setCrm(cust || null);
      const { data: tg } = await (supabase as any)
        .from("crm_customer_tags").select("tag, color").eq("user_id", c.profile_id);
      setCrmTags(tg || []);
    }
  };

  useEffect(() => { threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight }); }, [msgs]);

  const send = async () => {
    if (!active || !text.trim()) return;
    setSending(true);
    const body = text.trim(); setText("");
    const { data, error } = await supabase.functions.invoke("wa-send", {
      body: { conversation_id: active.id, type: "text", text: body },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      alert(`No se pudo enviar: ${(data as any)?.detail || (data as any)?.error || error?.message}`);
      setText(body);
    }
  };

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return convs;
    return convs.filter((c) => [c.name, c.phone, c.wa_id].filter(Boolean)
      .some((s) => String(s).toLowerCase().includes(n)));
  }, [convs, q]);

  const fmt = (s: string | null) => s
    ? new Date(s).toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* lista */}
      <div className="flex w-72 shrink-0 flex-col border-r">
        <div className="flex items-center gap-2 border-b p-3">
          <MessageCircle className="h-5 w-5 text-green-600" />
          <h1 className="font-semibold">WhatsApp</h1>
        </div>
        <div className="relative p-2">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar" className="pl-8" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.map((c) => (
            <button key={c.id} onClick={() => openConv(c)}
              className={`flex w-full flex-col gap-0.5 border-b px-3 py-2 text-left hover:bg-muted/40 ${active?.id === c.id ? "bg-muted/60" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="truncate font-medium">{c.name || c.phone || `+${c.wa_id}`}</span>
                <span className="text-[10px] text-muted-foreground">{fmt(c.last_message_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{c.last_message_preview || "—"}</span>
                <div className="flex items-center gap-1">
                  {c.profile_id && <Badge variant="outline" className="text-[9px] text-green-700 border-green-300">cliente</Badge>}
                  {c.unread_count > 0 && <span className="rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white">{c.unread_count}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* hilo */}
      <div className="flex flex-1 flex-col">
        {!active ? (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">Selecciona una conversación</div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b p-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{active.name || `+${active.wa_id}`}</div>
                <div className="text-xs text-muted-foreground">+{active.wa_id} · {active.channel}</div>
              </div>
            </div>

            <div ref={threadRef} className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-4">
              {msgs.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm ${m.direction === "out" ? "bg-green-600 text-white" : "border bg-background"}`}>
                    {m.media_url && (m.type === "image" || m.type === "sticker") && (
                      <img src={m.media_url} alt="" className="mb-1 max-h-48 rounded" />
                    )}
                    {m.media_url && m.type === "audio" && <audio controls src={m.media_url} className="mb-1 w-48" />}
                    {m.media_url && m.type === "document" && (
                      <a href={m.media_url} target="_blank" rel="noreferrer" className="mb-1 block underline">📎 {m.body || "documento"}</a>
                    )}
                    {(!m.media_url && m.type !== "text") && <div className="mb-0.5 text-[10px] opacity-70">[{m.type}]</div>}
                    {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                    <div className={`mt-0.5 text-[10px] ${m.direction === "out" ? "text-white/70" : "text-muted-foreground"}`}>
                      {fmt(m.created_at)}{m.direction === "out" ? ` · ${m.status}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {!active.window_open && active.channel === "cloud" ? (
              <div className="flex items-center gap-2 border-t bg-amber-50 p-3 text-sm text-amber-800">
                <Clock className="h-4 w-4 shrink-0" />
                Ventana de 24h cerrada. Solo plantilla aprobada (HSM), no texto libre.
              </div>
            ) : (
              <div className="flex items-center gap-2 border-t p-3">
                <Input value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Escribe un mensaje" disabled={sending} />
                <Button onClick={send} disabled={sending || !text.trim()} size="icon">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* panel CRM 360 */}
      {active && (
        <div className="hidden w-72 shrink-0 flex-col border-l p-4 lg:flex">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Ficha CRM</h2>
          {!active.profile_id ? (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              Contacto no vinculado a un cliente.<br />Se vincula solo al coincidir el teléfono con un pedido.
            </div>
          ) : !crm ? (
            <div className="flex h-24 items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="space-y-3 text-sm">
              <div>
                <div className="font-medium">{crm.full_name || "(sin nombre)"}</div>
                <div className="text-xs text-muted-foreground">{crm.email || "—"}</div>
                <div className="text-xs text-muted-foreground">{crm.city || "—"}</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Pedidos</div>
                  <div className="text-lg font-semibold">{crm.total_orders ?? 0}</div>
                </div>
                <div className="rounded-lg border p-2">
                  <div className="text-[10px] uppercase text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold">{format(Number(crm.total_spent || 0))}</div>
                </div>
              </div>
              <div className="text-xs">
                <span className="text-muted-foreground">Última compra: </span>
                {crm.last_order_at ? new Date(crm.last_order_at).toLocaleDateString("es-PE") : "—"}
              </div>
              {crmTags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {crmTags.map((t) => <Badge key={t.tag} variant="outline" className="text-[10px]">{t.tag}</Badge>)}
                </div>
              )}
              <Link to={`/admin/crm/clientes/${active.profile_id}`}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Ver ficha completa <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
