import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import { ESTADO_BADGE, ESTADO_LABEL, INTEREST_LABEL, type CrmEstado } from "@/lib/crm";

export default function CrmCustomers() {
  const { format } = useCurrency();
  const [rows, setRows] = useState<any[]>([]);
  const [tags, setTags] = useState<Record<string, { tag: string; color: string | null }[]>>({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("crm_customers")
        .select("*")
        .order("last_order_at", { ascending: false, nullsFirst: false });
      const list = (data || []) as any[];
      setRows(list);
      if (list.length) {
        const ids = list.map((r) => r.user_id);
        const { data: tg } = await (supabase as any)
          .from("crm_customer_tags")
          .select("user_id, tag, color")
          .in("user_id", ids);
        const grouped: any = {};
        (tg || []).forEach((t: any) => {
          (grouped[t.user_id] ||= []).push({ tag: t.tag, color: t.color });
        });
        setTags(grouped);
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (estado !== "all" && r.estado !== estado) return false;
      if (!needle) return true;
      return [r.full_name, r.email, r.phone].filter(Boolean).some((s: string) => s.toLowerCase().includes(needle));
    });
  }, [rows, q, estado]);

  const counts = useMemo(() => {
    return {
      total: rows.length,
      vip: rows.filter((r) => r.estado === "vip").length,
      carritos: rows.filter((r) => r.has_abandoned_cart).length,
    };
  }, [rows]);

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {counts.total} clientes · {counts.vip} VIP · {counts.carritos} con carrito abandonado
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, email o teléfono" className="pl-8" />
        </div>
        <Select value={estado} onValueChange={setEstado}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(ESTADO_LABEL) as CrmEstado[]).map((k) => (
              <SelectItem key={k} value={k}>{ESTADO_LABEL[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-left">
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Contacto</th>
                    <th className="px-3 py-2">Ciudad</th>
                    <th className="px-3 py-2 text-right">Pedidos</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Última compra</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Interés</th>
                    <th className="px-3 py-2">Etiquetas</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const est = (r.estado || "nuevo") as CrmEstado;
                    return (
                      <tr key={r.user_id} className="border-b hover:bg-muted/30">
                        <td className="px-3 py-2">
                          <Link to={`/admin/crm/clientes/${r.user_id}`} className="font-medium hover:underline">
                            {r.full_name || "(sin nombre)"}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          <div>{r.email || "—"}</div>
                          <div>{r.phone || "—"}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">{r.city || "—"}</td>
                        <td className="px-3 py-2 text-right">{r.total_orders}</td>
                        <td className="px-3 py-2 text-right font-semibold">{format(Number(r.total_spent || 0))}</td>
                        <td className="px-3 py-2 text-xs">{r.last_order_at ? new Date(r.last_order_at).toLocaleDateString() : "—"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_BADGE[est]}`}>
                            {ESTADO_LABEL[est]}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs">{r.primary_interest ? (INTEREST_LABEL[r.primary_interest] || r.primary_interest) : "—"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(tags[r.user_id] || []).map((t) => (
                              <Badge key={t.tag} variant="outline" className="text-[10px]">{t.tag}</Badge>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Sin resultados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
