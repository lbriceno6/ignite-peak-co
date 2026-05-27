import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProductsCarouselConfig, type ProductsCarouselConfig, type CarouselSource } from "@/hooks/useProductsCarouselConfig";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Search, X } from "lucide-react";

type ProductRow = { id: string; slug: string; name: string; main_image: string | null; category: string | null };

const SOURCE_LABELS: Record<CarouselSource, string> = {
  recent: "Productos recientes",
  best_sellers: "Más vendidos",
  popular: "Más populares",
  sale: "En oferta",
  top_rated: "Mejor valorados",
  manual: "Selección manual",
};

const TOTAL_OPTIONS = [4, 6, 8, 10, 12, 16, 20];
const DESKTOP_OPTIONS = [3, 4, 5, 6];
const TABLET_OPTIONS = [2, 3];
const MOBILE_OPTIONS = [1, 1.2, 2];
const SPEED_OPTIONS = [3, 4, 5, 6];

export default function AdminProductsCarousel() {
  const { config, loading, reload } = useProductsCarouselConfig();
  const [f, setF] = useState<ProductsCarouselConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { if (config) setF(config); }, [config]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,slug,name,main_image,category")
        .eq("is_active", true)
        .order("name");
      setProducts((data as ProductRow[]) ?? []);
    })();
  }, []);

  const set = <K extends keyof ProductsCarouselConfig>(k: K, v: ProductsCarouselConfig[K]) =>
    setF((p) => (p ? { ...p, [k]: v } : p));

  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(config), [f, config]);

  const save = async () => {
    if (!f) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("products_carousel_config")
        .update({
          is_active: f.is_active,
          title: f.title,
          subtitle: f.subtitle,
          source: f.source,
          total_items: f.total_items,
          visible_desktop: f.visible_desktop,
          visible_tablet: f.visible_tablet,
          visible_mobile: f.visible_mobile,
          autoplay: f.autoplay,
          autoplay_speed: f.autoplay_speed,
          show_arrows: f.show_arrows,
          show_dots: f.show_dots,
          show_view_all: f.show_view_all,
          view_all_label: f.view_all_label,
          view_all_href: f.view_all_href,
          manual_slugs: f.manual_slugs,
        })
        .eq("id", f.id);
      if (error) throw error;
      toast.success("Carrusel actualizado");
      reload();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !f) return <p className="text-muted-foreground">Cargando…</p>;

  const selected = f.manual_slugs;
  const filtered = products.filter(
    (p) =>
      !selected.includes(p.slug) &&
      (search.trim() === "" || p.name.toLowerCase().includes(search.toLowerCase())),
  );
  const moveSlug = (slug: string, dir: -1 | 1) => {
    const arr = [...selected];
    const i = arr.indexOf(slug);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    set("manual_slugs", arr);
  };
  const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Carrusel de productos del Home</h1>
        <p className="text-muted-foreground">
          Configura qué productos se muestran y cómo se comporta el carrusel en desktop, tablet y mobile.
        </p>
      </div>

      <section className="space-y-4 rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Activar carrusel</p>
            <p className="text-xs text-muted-foreground">Si está desactivado, la sección no aparece en el Home.</p>
          </div>
          <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={f.title} onChange={(e) => set("title", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Subtítulo (opcional)</Label>
            <Textarea rows={1} value={f.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-5">
        <h2 className="font-display text-lg">Selección de productos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Tipo de productos a mostrar</Label>
            <Select value={f.source} onValueChange={(v) => set("source", v as CarouselSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(SOURCE_LABELS) as CarouselSource[]).map((s) => (
                  <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cantidad total de productos</Label>
            <Select value={String(f.total_items)} onValueChange={(v) => set("total_items", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TOTAL_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {f.source === "manual" && (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <p className="text-sm font-semibold">Productos seleccionados ({selected.length})</p>
            {selected.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aún no seleccionaste productos.</p>
            ) : (
              <ul className="space-y-2">
                {selected.map((slug, i) => {
                  const p = productBySlug(slug);
                  return (
                    <li key={slug} className="flex items-center gap-2 rounded border bg-background p-2">
                      <span className="w-6 text-xs tabular-nums text-muted-foreground">#{i + 1}</span>
                      {p?.main_image && <img src={p.main_image} alt="" className="h-10 w-10 rounded object-cover" />}
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">{p?.name ?? slug}</p>
                        <p className="truncate text-xs text-muted-foreground">{p?.category}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => moveSlug(slug, -1)} disabled={i === 0}><ArrowUp size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => moveSlug(slug, 1)} disabled={i === selected.length - 1}><ArrowDown size={14} /></Button>
                      <Button variant="ghost" size="icon" onClick={() => set("manual_slugs", selected.filter((s) => s !== slug))}><X size={14} /></Button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="pt-2">
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar producto…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="mt-2 max-h-64 space-y-1 overflow-auto rounded border bg-background p-2">
                {filtered.slice(0, 30).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set("manual_slugs", [...selected, p.slug])}
                    className="flex w-full items-center gap-2 rounded p-1.5 text-left hover:bg-muted"
                  >
                    {p.main_image && <img src={p.main_image} alt="" className="h-8 w-8 rounded object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{p.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{p.category}</p>
                    </div>
                    <span className="text-xs text-accent">+ Agregar</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <p className="p-2 text-xs text-muted-foreground">Sin resultados.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-5">
        <h2 className="font-display text-lg">Productos visibles por pantalla</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Desktop</Label>
            <Select value={String(f.visible_desktop)} onValueChange={(v) => set("visible_desktop", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DESKTOP_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tablet</Label>
            <Select value={String(f.visible_tablet)} onValueChange={(v) => set("visible_tablet", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TABLET_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mobile</Label>
            <Select value={String(f.visible_mobile)} onValueChange={(v) => set("visible_mobile", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOBILE_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">1.2 deja ver parte del siguiente producto.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-5">
        <h2 className="font-display text-lg">Comportamiento</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded border p-3">
            <span className="text-sm font-medium">Autoplay</span>
            <Switch checked={f.autoplay} onCheckedChange={(v) => set("autoplay", v)} />
          </label>
          <div>
            <Label className="text-xs">Velocidad de autoplay (segundos)</Label>
            <Select value={String(f.autoplay_speed)} onValueChange={(v) => set("autoplay_speed", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPEED_OPTIONS.map((n) => <SelectItem key={n} value={String(n)}>{n}s</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center justify-between rounded border p-3">
            <span className="text-sm font-medium">Mostrar flechas</span>
            <Switch checked={f.show_arrows} onCheckedChange={(v) => set("show_arrows", v)} />
          </label>
          <label className="flex items-center justify-between rounded border p-3">
            <span className="text-sm font-medium">Mostrar puntos</span>
            <Switch checked={f.show_dots} onCheckedChange={(v) => set("show_dots", v)} />
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-background p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Botón “Ver todos”</h2>
          <Switch checked={f.show_view_all} onCheckedChange={(v) => set("show_view_all", v)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Texto del botón</Label>
            <Input value={f.view_all_label} onChange={(e) => set("view_all_label", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Enlace</Label>
            <Input value={f.view_all_href} onChange={(e) => set("view_all_href", e.target.value)} placeholder="/productos" />
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex justify-end gap-2 rounded-lg border bg-background/95 p-3 shadow-md backdrop-blur">
        <Button variant="outline" onClick={() => config && setF(config)} disabled={!dirty || saving}>Descartar</Button>
        <Button variant="dark" onClick={save} disabled={!dirty || saving}>
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
