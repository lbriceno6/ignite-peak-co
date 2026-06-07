import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DEFAULT_STYLE,
  PRESETS,
  STYLE_KEY,
  parseStyle,
  type HomeProductCardStyle,
  type TextCfg,
  type ButtonCfg,
  type LayoutCfg,
} from "@/lib/homeProductCardStyle";
import { HomeProductCardStyles } from "@/components/HomeProductCardStyles";

const FONTS = ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans", "Lato", "Nunito", "Work Sans"];

type Section = { key: keyof HomeProductCardStyle; label: string };
const TEXT_SECTIONS: Section[] = [
  { key: "category", label: "Categoría" },
  { key: "title", label: "Título" },
  { key: "description", label: "Descripción corta" },
  { key: "recommended", label: "Texto Recomendado" },
  { key: "price", label: "Precio" },
  { key: "priceOld", label: "Precio anterior" },
];

export default function AdminProductCardTypography() {
  const [style, setStyle] = useState<HomeProductCardStyle>(DEFAULT_STYLE);
  const [saved, setSaved] = useState<HomeProductCardStyle>(DEFAULT_STYLE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("site_content")
      .select("value")
      .eq("key", STYLE_KEY)
      .maybeSingle();
    const s = parseStyle(data?.value);
    setStyle(s);
    setSaved(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dirty = JSON.stringify(style) !== JSON.stringify(saved);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert({ key: STYLE_KEY, value: JSON.stringify(style) }, { onConflict: "key" });
      if (error) throw error;
      setSaved(style);
      toast.success("Tipografía guardada");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  const applyPreset = (name: string) => {
    const p = PRESETS[name];
    if (!p) return;
    setStyle((cur) => ({ ...cur, ...p } as HomeProductCardStyle));
    toast.success(`Preset "${name}" aplicado (sin guardar)`);
  };

  const updateText = (k: Section["key"], patch: Partial<TextCfg>) => {
    setStyle((s) => ({ ...s, [k]: { ...(s[k] as TextCfg), ...patch } }));
  };
  const updateButton = (patch: Partial<ButtonCfg>) => {
    setStyle((s) => ({ ...s, button: { ...s.button, ...patch } }));
  };

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Tipografía de productos del Home</h1>
        <p className="text-muted-foreground">
          Controla cómo se ven los textos de las tarjetas de producto en los carruseles del Home
          (Ofertas, Favoritos, Destacados…). No afecta al catálogo ni a la ficha de producto.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-3">
        <span className="text-sm font-medium mr-1">Presets:</span>
        {Object.keys(PRESETS).map((name) => (
          <Button key={name} variant="outline" size="sm" onClick={() => applyPreset(name)}>
            {name}
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setStyle(DEFAULT_STYLE)}>Restaurar recomendados</Button>
          <Button variant="outline" onClick={() => setStyle(saved)} disabled={!dirty}>Descartar</Button>
          <Button variant="dark" onClick={save} disabled={!dirty || saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {TEXT_SECTIONS.map(({ key, label }) => {
            const cfg = style[key] as TextCfg;
            const isCategory = key === "category";
            const isPriceOld = key === "priceOld";
            const isRecommended = key === "recommended";
            return (
              <section key={String(key)} className="rounded-lg border bg-background p-5">
                <header className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg">{label}</h2>
                  {isRecommended && (
                    <label className="flex items-center gap-2 text-sm">
                      Mostrar
                      <Switch checked={cfg.show !== false} onCheckedChange={(v) => updateText(key, { show: v })} />
                    </label>
                  )}
                </header>

                {isRecommended && (
                  <div className="mb-4">
                    <Label>Texto</Label>
                    <Input value={cfg.text ?? "Recomendado"} onChange={(e) => updateText(key, { text: e.target.value })} />
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label>Fuente</Label>
                    <Select value={cfg.font} onValueChange={(v) => updateText(key, { font: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tamaño desktop (px)</Label>
                    <Input type="number" value={cfg.sizeDesktop} onChange={(e) => updateText(key, { sizeDesktop: +e.target.value })} />
                  </div>
                  <div>
                    <Label>Tamaño mobile (px)</Label>
                    <Input type="number" value={cfg.sizeMobile} onChange={(e) => updateText(key, { sizeMobile: +e.target.value })} />
                  </div>
                  <div>
                    <Label>Peso</Label>
                    <Select value={String(cfg.weight)} onValueChange={(v) => updateText(key, { weight: +v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[300, 400, 500, 600, 700, 800].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      <input type="color" value={cfg.color} onChange={(e) => updateText(key, { color: e.target.value })} className="h-10 w-12 rounded border" />
                      <Input value={cfg.color} onChange={(e) => updateText(key, { color: e.target.value })} />
                    </div>
                  </div>
                  {!isCategory && !isPriceOld && (
                    <div>
                      <Label>Altura de línea</Label>
                      <Input type="number" step="0.05" value={cfg.lineHeight ?? 1.3} onChange={(e) => updateText(key, { lineHeight: +e.target.value })} />
                    </div>
                  )}
                  {(key === "title" || key === "description") && (
                    <div>
                      <Label>Máximo de líneas</Label>
                      <Input type="number" min={1} max={5} value={cfg.maxLines ?? 2} onChange={(e) => updateText(key, { maxLines: +e.target.value })} />
                    </div>
                  )}
                  {isCategory && (
                    <>
                      <div>
                        <Label>Transformación</Label>
                        <Select value={cfg.transform ?? "none"} onValueChange={(v) => updateText(key, { transform: v as any })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Normal</SelectItem>
                            <SelectItem value="uppercase">MAYÚSCULAS</SelectItem>
                            <SelectItem value="lowercase">minúsculas</SelectItem>
                            <SelectItem value="capitalize">Capitalizado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Letter-spacing (em)</Label>
                        <Input type="number" step="0.01" value={cfg.letterSpacing ?? 0} onChange={(e) => updateText(key, { letterSpacing: +e.target.value })} />
                      </div>
                    </>
                  )}
                  {isPriceOld && (
                    <div className="flex items-center gap-2">
                      <Switch checked={cfg.strikethrough !== false} onCheckedChange={(v) => updateText(key, { strikethrough: v })} />
                      <Label>Tachado</Label>
                    </div>
                  )}
                </div>
              </section>
            );
          })}

          {/* Botón */}
          <section className="rounded-lg border bg-background p-5">
            <h2 className="mb-4 font-display text-lg">Botón Agregar al carrito</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Fuente</Label>
                <Select value={style.button.font} onValueChange={(v) => updateButton({ font: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tamaño desktop (px)</Label>
                <Input type="number" value={style.button.sizeDesktop} onChange={(e) => updateButton({ sizeDesktop: +e.target.value })} />
              </div>
              <div>
                <Label>Tamaño mobile (px)</Label>
                <Input type="number" value={style.button.sizeMobile} onChange={(e) => updateButton({ sizeMobile: +e.target.value })} />
              </div>
              <div>
                <Label>Peso</Label>
                <Select value={String(style.button.weight)} onValueChange={(v) => updateButton({ weight: +v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[400,500,600,700,800].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color de texto</Label>
                <div className="flex gap-2">
                  <input type="color" value={style.button.textColor} onChange={(e) => updateButton({ textColor: e.target.value })} className="h-10 w-12 rounded border" />
                  <Input value={style.button.textColor} onChange={(e) => updateButton({ textColor: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Color de fondo</Label>
                <div className="flex gap-2">
                  <input type="color" value={style.button.bgColor} onChange={(e) => updateButton({ bgColor: e.target.value })} className="h-10 w-12 rounded border" />
                  <Input value={style.button.bgColor} onChange={(e) => updateButton({ bgColor: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Color hover</Label>
                <div className="flex gap-2">
                  <input type="color" value={style.button.hoverColor} onChange={(e) => updateButton({ hoverColor: e.target.value })} className="h-10 w-12 rounded border" />
                  <Input value={style.button.hoverColor} onChange={(e) => updateButton({ hoverColor: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Alto (px)</Label>
                <Input type="number" value={style.button.height} onChange={(e) => updateButton({ height: +e.target.value })} />
              </div>
              <div>
                <Label>Borde redondeado (px)</Label>
                <Input type="number" value={style.button.radius} onChange={(e) => updateButton({ radius: +e.target.value })} />
              </div>
            </div>
          </section>
        </div>

        {/* Live Preview */}
        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <h2 className="mb-3 font-display text-lg">Vista previa en vivo</h2>
          <div className="hpc-scope rounded-xl border bg-secondary/40 p-4">
            <HomeProductCardStyles style={style} scope=".hpc-preview" />
            <div className="hpc-preview">
              <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
                <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center text-5xl">🥤</div>
                <div className="flex flex-col gap-1 p-3">
                  <div data-pc="category">SUPLEMENTOS · PROTEÍNAS</div>
                  <div data-pc="title">Proteína Whey Premium 1kg sabor chocolate intenso</div>
                  <p data-pc="description">Fórmula con 24g de proteína por porción, ideal para recuperación muscular y energía.</p>
                  <div className="h-4 flex items-center">
                    <div data-pc="recommended">{style.recommended.text || "Recomendado"}</div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                    <span data-pc="price">S/ 89.00</span>
                    <span data-pc="price-old">S/ 119.00</span>
                  </div>
                  <button data-pc="button" type="button" className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3">
                    🛒 Agregar al carrito
                  </button>
                </div>
              </article>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            La vista previa refleja cambios al instante. Guarda para aplicar a todo el Home.
          </p>
        </aside>
      </div>
    </div>
  );
}
