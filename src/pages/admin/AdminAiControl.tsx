// Phase 6 — AI Control Panel
// Central admin screen to toggle each AI block (home / cart / checkout / search),
// see hit-rate metrics from `lucia_events` (browse_* and purchase_intents),
// and jump to the dedicated config screen for each block.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Sparkles, ShoppingCart, CreditCard, Search, Home, Eye, PackageCheck,
  Activity, ExternalLink, FlaskConical, TrendingUp,
} from "lucide-react";
import {
  useAllAiBlockToggles,
  invalidateAiBlockToggles,
  type AiBlockKey,
} from "@/hooks/useAiBlockToggles";
import { AiPromptLab } from "@/components/admin/AiPromptLab";
import { AiConversionMetrics } from "@/components/admin/AiConversionMetrics";

type Metrics = {
  productViews: number;
  categoryViews: number;
  searches: number;
  addToCart: number;
  uniqueVisitors: number;
  signaledVisitors: number;
};

const BLOCK_META: Record<AiBlockKey, { icon: any; configHref?: string; configLabel?: string }> = {
  home_dynamic_banner: { icon: Home, configHref: "/admin/home/bloques", configLabel: "Editar bloque" },
  home_recommended: { icon: Sparkles, configHref: "/admin/home/bloques", configLabel: "Editar bloque" },
  home_recently_viewed: { icon: Eye, configHref: "/admin/home/bloques", configLabel: "Editar bloque" },
  cart_recommendations: { icon: ShoppingCart, configHref: "/admin/ia-recomendaciones", configLabel: "Configurar IA" },
  checkout_recommendations: { icon: CreditCard, configHref: "/admin/ia-recomendaciones", configLabel: "Configurar IA" },
  intelligent_search: { icon: Search, configHref: "/admin/buscador-ia", configLabel: "Configurar buscador" },
  product_why_for_you: { icon: Sparkles, configHref: "/admin/ia-intenciones", configLabel: "Editar intenciones" },
  product_ai_related: { icon: Sparkles, configHref: "/admin/ia-recomendaciones", configLabel: "Configurar IA" },
  post_purchase_insights: { icon: PackageCheck },
};

export default function AdminAiControl() {
  const { rows, loading, reload } = useAllAiBlockToggles();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [topIntents, setTopIntents] = useState<{ name: string; n: number }[]>([]);
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();

      const [evRes, catRes, intentsRes] = await Promise.all([
        (supabase as any)
          .from("lucia_events")
          .select("event_type, visitor_id, metadata")
          .gte("created_at", since)
          .in("event_type", [
            "browse_product_view",
            "browse_category_view",
            "browse_search",
            "browse_add_to_cart",
          ])
          .limit(5000),
        (supabase as any)
          .from("lucia_events")
          .select("visitor_id")
          .gte("created_at", since)
          .limit(5000),
        (supabase as any)
          .from("purchase_intents")
          .select("name, slug, keywords, category_slugs")
          .eq("is_active", true),
      ]);

      const evs = (evRes?.data ?? []) as {
        event_type: string; visitor_id: string | null; metadata: any;
      }[];
      const allEvs = (catRes?.data ?? []) as { visitor_id: string | null }[];
      const allVisitors = new Set<string>();
      for (const v of allEvs) if (v.visitor_id) allVisitors.add(v.visitor_id);

      const signaledVisitors = new Set<string>();
      let pv = 0, cv = 0, sr = 0, atc = 0;
      const intentHits = new Map<string, number>();
      const intents = (intentsRes?.data ?? []) as {
        name: string; slug: string; keywords: string[]; category_slugs: string[];
      }[];

      for (const e of evs) {
        if (e.visitor_id) signaledVisitors.add(e.visitor_id);
        if (e.event_type === "browse_product_view") pv++;
        else if (e.event_type === "browse_category_view") cv++;
        else if (e.event_type === "browse_search") sr++;
        else if (e.event_type === "browse_add_to_cart") atc++;

        const cat = e.metadata?.category_slug;
        const q = (e.metadata?.search_query ?? "").toString().toLowerCase();
        for (const i of intents) {
          const catMatch = cat && i.category_slugs?.includes(cat);
          const kwMatch = q && i.keywords?.some((k) => q.includes(k.toLowerCase()));
          if (catMatch || kwMatch) {
            intentHits.set(i.name, (intentHits.get(i.name) ?? 0) + 1);
          }
        }
      }
      const top = [...intentHits.entries()]
        .map(([name, n]) => ({ name, n }))
        .sort((a, b) => b.n - a.n)
        .slice(0, 8);

      setMetrics({
        productViews: pv,
        categoryViews: cv,
        searches: sr,
        addToCart: atc,
        uniqueVisitors: allVisitors.size,
        signaledVisitors: signaledVisitors.size,
      });
      setTopIntents(top);
    })();
  }, [windowDays]);

  const intentHitRate = useMemo(() => {
    if (!metrics) return 0;
    const denom = metrics.uniqueVisitors || 1;
    return Math.min(100, Math.round((metrics.signaledVisitors / denom) * 100));
  }, [metrics]);


  const toggleBlock = async (key: AiBlockKey, value: boolean) => {
    const { error } = await (supabase as any)
      .from("ai_block_toggles")
      .update({ enabled: value })
      .eq("block_key", key);
    if (error) {
      toast.error(error.message);
      return;
    }
    invalidateAiBlockToggles();
    toast.success(`${value ? "Activado" : "Desactivado"}: ${key}`);
    reload();
  };

  if (loading && !rows.length) {
    return <div className="p-6 text-muted-foreground">Cargando panel IA…</div>;
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" />
        <h1 className="font-display text-3xl">Panel de Control IA</h1>
      </div>
      <p className="text-muted-foreground">
        Activa o desactiva cada bloque de inteligencia artificial de la tienda y revisa su
        rendimiento. Los cambios se aplican inmediatamente en el storefront.
      </p>

      <Tabs defaultValue="blocks" className="w-full">
        <TabsList>
          <TabsTrigger value="blocks">Bloques IA</TabsTrigger>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="conversion"><TrendingUp size={14} className="mr-1" /> Conversión IA</TabsTrigger>
          <TabsTrigger value="prompts"><FlaskConical size={14} className="mr-1" /> Prompt Lab</TabsTrigger>
        </TabsList>

        <TabsContent value="conversion" className="pt-4">
          <AiConversionMetrics />
        </TabsContent>

        <TabsContent value="prompts" className="pt-4">
          <AiPromptLab />
        </TabsContent>

        <TabsContent value="blocks" className="space-y-4 pt-4">
          {rows.map((row) => {
            const meta = BLOCK_META[row.block_key as AiBlockKey] ?? { icon: Sparkles };
            const Icon = meta.icon;
            return (
              <Card key={row.block_key}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="rounded-md bg-primary/10 p-2 text-primary">
                        <Icon size={20} />
                      </span>
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {row.label}
                          <Badge variant={row.enabled ? "default" : "secondary"}>
                            {row.enabled ? "Activo" : "Inactivo"}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">{row.description}</CardDescription>
                      </div>
                    </div>
                    <Switch
                      checked={row.enabled}
                      onCheckedChange={(v) => toggleBlock(row.block_key as AiBlockKey, v)}
                    />
                  </div>
                </CardHeader>
                {meta.configHref && (
                  <CardContent className="pt-0">
                    <Button asChild variant="outline" size="sm">
                      <Link to={meta.configHref}>
                        {meta.configLabel ?? "Configurar"} <ExternalLink className="ml-2" size={14} />
                      </Link>
                    </Button>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Actividad detectada por la IA</h2>
            <div className="flex gap-2">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant={windowDays === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setWindowDays(d as any)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Visitantes únicos" value={metrics?.uniqueVisitors ?? 0} />
            <MetricCard label="Vistas de producto" value={metrics?.productViews ?? 0} />
            <MetricCard label="Vistas de categoría" value={metrics?.categoryViews ?? 0} />
            <MetricCard label="Búsquedas" value={metrics?.searches ?? 0} />
            <MetricCard label="Add to cart" value={metrics?.addToCart ?? 0} />
            <MetricCard
              label="Intent hit-rate"
              value={`${intentHitRate}%`}
              hint={`${metrics?.signaledVisitors ?? 0} visitantes con señal`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity size={16} /> Top intenciones detectadas
              </CardTitle>
              <CardDescription>
                Intenciones que la IA reconoció con más frecuencia en los últimos {windowDays} días.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {topIntents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay intenciones detectadas en este período.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Intención</TableHead>
                      <TableHead className="text-right">Detecciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topIntents.map((t) => (
                      <TableRow key={t.name}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell className="text-right">{t.n}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
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
