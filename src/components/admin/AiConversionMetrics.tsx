// Phase 9 — AI Conversion Analytics
// Reads `ai_reco_click` events from lucia_events and orders/order_items to
// surface:
//  - total AI clicks per source (cart, checkout, product, post-purchase)
//  - top clicked recommended slugs
//  - % of orders in window that contain at least one AI-recommended slug
//
// Heuristic — we treat a slug as "AI-recommended" if it has at least one
// ai_reco_click in the window. Then we compute how many orders in that window
// contain that slug as an item.

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TrendingUp } from "lucide-react";

type Click = { product_slug: string | null; metadata: any; created_at: string };
type OrderItemRow = { product_slug: string; product_name: string; quantity: number; unit_price: number; order_id: string };

const SOURCE_LABELS: Record<string, string> = {
  ai_cart: "Carrito",
  ai_checkout: "Checkout",
  ai_product_related: "Ficha de producto",
  ai_post_purchase: "Post-compra",
  ai_home_recommended: "Home — recomendado",
  ai_home_dynamic_banner: "Home — banner dinámico",
};

export function AiConversionMetrics() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(true);
  const [clicks, setClicks] = useState<Click[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [orderCount, setOrderCount] = useState<number>(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
      const [evRes, ordRes, oiRes] = await Promise.all([
        (supabase as any)
          .from("lucia_events")
          .select("product_slug, metadata, created_at")
          .eq("event_type", "ai_reco_click")
          .gte("created_at", since)
          .limit(5000),
        (supabase as any)
          .from("orders")
          .select("id", { count: "exact", head: true })
          .gte("created_at", since)
          .in("status", ["confirmed", "preparing", "shipped", "delivered"]),
        (supabase as any)
          .from("order_items")
          .select("product_slug, product_name, quantity, unit_price, order_id, orders!inner(created_at,status)")
          .gte("orders.created_at", since)
          .in("orders.status", ["confirmed", "preparing", "shipped", "delivered"])
          .limit(5000),
      ]);
      setClicks((evRes?.data ?? []) as Click[]);
      setOrderCount(ordRes?.count ?? 0);
      setOrderItems((oiRes?.data ?? []) as OrderItemRow[]);
      setLoading(false);
    })();
  }, [windowDays]);

  const stats = useMemo(() => {
    const bySource = new Map<string, number>();
    const bySlug = new Map<string, number>();
    for (const c of clicks) {
      const src = (c.metadata?.source ?? "unknown") as string;
      bySource.set(src, (bySource.get(src) ?? 0) + 1);
      if (c.product_slug) bySlug.set(c.product_slug, (bySlug.get(c.product_slug) ?? 0) + 1);
    }
    const recommendedSlugs = new Set(bySlug.keys());
    const ordersWithReco = new Set<string>();
    let revenueAttributed = 0;
    for (const oi of orderItems) {
      if (recommendedSlugs.has(oi.product_slug)) {
        ordersWithReco.add(oi.order_id);
        revenueAttributed += Number(oi.unit_price) * Number(oi.quantity);
      }
    }
    return {
      totalClicks: clicks.length,
      bySource: [...bySource.entries()].sort((a, b) => b[1] - a[1]),
      topSlugs: [...bySlug.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
      ordersWithReco: ordersWithReco.size,
      revenueAttributed,
      conversionRate: orderCount > 0 ? Math.round((ordersWithReco.size / orderCount) * 100) : 0,
    };
  }, [clicks, orderItems, orderCount]);

  if (loading) return <p className="text-muted-foreground">Cargando conversión IA…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl">Conversión de la IA</h2>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              variant={windowDays === d ? "default" : "outline"}
              size="sm"
              onClick={() => setWindowDays(d as any)}
            >{d}d</Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Clicks en recomendaciones IA" value={stats.totalClicks} />
        <Metric label="Pedidos con producto IA" value={`${stats.ordersWithReco}`} hint={`de ${orderCount} pedidos`} />
        <Metric label="% pedidos atribuibles a IA" value={`${stats.conversionRate}%`} />
        <Metric label="Revenue atribuido a IA" value={`${stats.revenueAttributed.toFixed(2)}`} hint="suma de líneas con slug clickeado" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp size={16} /> Clicks por fuente
          </CardTitle>
          <CardDescription>Dónde la IA está generando más interés.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay clicks registrados en este período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.bySource.map(([src, n]) => (
                  <TableRow key={src}>
                    <TableCell className="font-medium">{SOURCE_LABELS[src] ?? src}</TableCell>
                    <TableCell className="text-right">{n}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top productos recomendados por IA</CardTitle>
          <CardDescription>Los más clickeados desde bloques de IA.</CardDescription>
        </CardHeader>
        <CardContent>
          {stats.topSlugs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay datos.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topSlugs.map(([slug, n]) => (
                  <TableRow key={slug}>
                    <TableCell className="font-mono text-xs">{slug}</TableCell>
                    <TableCell className="text-right">{n}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-3xl">{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
