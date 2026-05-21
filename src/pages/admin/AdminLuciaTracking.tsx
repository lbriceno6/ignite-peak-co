import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Visitor = any;
type Evt = any;
type Sess = any;

const KPI = ({ label, value, hint }: { label: string; value: string | number; hint?: string }) => (
  <Card className="p-4">
    <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="mt-1 text-2xl font-semibold">{value}</div>
    {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
  </Card>
);

export const VisitorsTab = () => {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [evts, setEvts] = useState<Evt[]>([]);
  const [filter, setFilter] = useState({ source: "all", device: "all", country: "", q: "" });

  useEffect(() => {
    supabase.from("visitor_tracking" as any).select("*").order("last_seen_at", { ascending: false }).limit(500)
      .then(({ data }) => setVisitors((data ?? []) as any));
    supabase.from("lucia_events" as any).select("*").order("created_at", { ascending: false }).limit(1000)
      .then(({ data }) => setEvts((data ?? []) as any));
  }, []);

  const filtered = useMemo(() => visitors.filter((v) => {
    if (filter.source !== "all" && (v.source ?? "direct") !== filter.source) return false;
    if (filter.device !== "all" && (v.device_type ?? "unknown") !== filter.device) return false;
    if (filter.country && !(v.country ?? "").toLowerCase().includes(filter.country.toLowerCase())) return false;
    if (filter.q) {
      const q = filter.q.toLowerCase();
      const hay = `${v.visitor_id} ${v.referrer} ${v.campaign} ${v.first_page} ${v.last_page}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [visitors, filter]);

  const total = filtered.length;
  const consented = filtered.filter((v) => v.consent_analytics).length;
  const withWhatsapp = evts.filter((e) => e.event_type === "lucia_whatsapp_click").length;
  const chats = evts.filter((e) => e.event_type === "lucia_chat_open").length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Visitantes únicos" value={total} hint="últimos 500" />
        <KPI label="Consentimiento analytics" value={`${consented}/${total}`} />
        <KPI label="Aperturas de chat" value={chats} />
        <KPI label="Clics WhatsApp" value={withWhatsapp} />
      </div>

      <Card className="p-3">
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Buscar (visitor_id, página, campaña)…" value={filter.q} onChange={(e) => setFilter({ ...filter, q: e.target.value })} />
          <Select value={filter.source} onValueChange={(v) => setFilter({ ...filter, source: v })}>
            <SelectTrigger><SelectValue placeholder="Origen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              <SelectItem value="direct">Directo</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="referral">Referral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter.device} onValueChange={(v) => setFilter({ ...filter, device: v })}>
            <SelectTrigger><SelectValue placeholder="Dispositivo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="tablet">Tablet</SelectItem>
              <SelectItem value="desktop">Desktop</SelectItem>
            </SelectContent>
          </Select>
          <Input placeholder="País (ej. PE, MX)" value={filter.country} onChange={(e) => setFilter({ ...filter, country: e.target.value })} />
        </div>
      </Card>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase">
            <tr>
              <th className="p-2">Visitante</th>
              <th className="p-2">Origen</th>
              <th className="p-2">Campaña</th>
              <th className="p-2">Primera página</th>
              <th className="p-2">Última página</th>
              <th className="p-2">Dispositivo</th>
              <th className="p-2">País</th>
              <th className="p-2">Consent.</th>
              <th className="p-2">Última visita</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="p-2 font-mono text-xs">{(v.visitor_id ?? "").slice(0, 8)}</td>
                <td className="p-2">{v.source ?? "direct"}{v.medium ? ` · ${v.medium}` : ""}</td>
                <td className="p-2">{v.campaign ?? "—"}</td>
                <td className="p-2 max-w-[180px] truncate" title={v.first_page}>{v.first_page ?? "—"}</td>
                <td className="p-2 max-w-[180px] truncate" title={v.last_page}>{v.last_page ?? "—"}</td>
                <td className="p-2">{v.device_type ?? "—"}{v.browser ? ` · ${v.browser}` : ""}</td>
                <td className="p-2">{v.country ?? "—"}{v.city ? ` · ${v.city}` : ""}</td>
                <td className="p-2 text-xs">
                  {v.consent_analytics ? "📊" : "·"}{v.consent_marketing ? "🎯" : "·"}{v.consent_personalization ? "✨" : "·"}
                </td>
                <td className="p-2 text-xs text-muted-foreground">{v.last_seen_at ? new Date(v.last_seen_at).toLocaleString() : "—"}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={9} className="p-6 text-center text-muted-foreground">Sin visitantes registrados todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AttributionTab = () => {
  const [evts, setEvts] = useState<Evt[]>([]);
  const [sessions, setSessions] = useState<Sess[]>([]);

  useEffect(() => {
    supabase.from("lucia_events" as any).select("*").order("created_at", { ascending: false }).limit(2000)
      .then(({ data }) => setEvts((data ?? []) as any));
    supabase.from("chat_ai_sessions" as any).select("*").order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setSessions((data ?? []) as any));
  }, []);

  const byChannel = useMemo(() => {
    const map = new Map<string, { chats: number; whatsapp: number; product_clicks: number; sessions: number }>();
    const bump = (k: string, f: keyof { chats: number; whatsapp: number; product_clicks: number; sessions: number }) => {
      const cur = map.get(k) ?? { chats: 0, whatsapp: 0, product_clicks: 0, sessions: 0 };
      cur[f]++;
      map.set(k, cur);
    };
    for (const e of evts) {
      const ch = e.source ?? "direct";
      if (e.event_type === "lucia_chat_open") bump(ch, "chats");
      if (e.event_type === "lucia_whatsapp_click") bump(ch, "whatsapp");
      if (e.event_type === "lucia_product_click") bump(ch, "product_clicks");
    }
    for (const s of sessions) {
      const ch = s.source ?? "direct";
      bump(ch, "sessions");
    }
    return Array.from(map.entries()).sort((a, b) => b[1].sessions - a[1].sessions);
  }, [evts, sessions]);

  const byCampaign = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      const c = s.campaign || "(sin campaña)";
      map.set(c, (map.get(c) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
  }, [sessions]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Atribución por canal</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase">
              <tr>
                <th className="p-2">Canal</th>
                <th className="p-2">Sesiones chat</th>
                <th className="p-2">Aperturas</th>
                <th className="p-2">Clics producto</th>
                <th className="p-2">Clics WhatsApp</th>
              </tr>
            </thead>
            <tbody>
              {byChannel.map(([ch, k]) => (
                <tr key={ch} className="border-t">
                  <td className="p-2 font-medium">{ch}</td>
                  <td className="p-2">{k.sessions}</td>
                  <td className="p-2">{k.chats}</td>
                  <td className="p-2">{k.product_clicks}</td>
                  <td className="p-2">{k.whatsapp}</td>
                </tr>
              ))}
              {!byChannel.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Sin datos.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 font-semibold">Top campañas</h3>
        <div className="space-y-1 text-sm">
          {byCampaign.map(([c, n]) => (
            <div key={c} className="flex items-center justify-between border-b py-1">
              <span>{c}</span>
              <span className="font-mono text-xs">{n}</span>
            </div>
          ))}
          {!byCampaign.length && <p className="text-muted-foreground">Sin campañas registradas.</p>}
        </div>
      </Card>
    </div>
  );
};
