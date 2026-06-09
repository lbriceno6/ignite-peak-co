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
  resolveTopText,
  type HomeProductCardStyle,
  type TextCfg,
  type ButtonCfg,
  type LayoutCfg,
  type TopTextCfg,
  type TopTextMode,
} from "@/lib/homeProductCardStyle";
import { HomeProductCardStyles } from "@/components/HomeProductCardStyles";

const FONTS = ["Inter", "Roboto", "Poppins", "Montserrat", "Open Sans", "Lato", "Nunito", "Work Sans"];

type Section = { key: keyof HomeProductCardStyle; label: string };
const TEXT_SECTIONS: Section[] = [
  { key: "category", label: "Categoría" },
  { key: "title", label: "Título" },
  { key: "description", label: "Descripción corta" },
  { key: "recommended", label: "Tiempo de entrega" },
  { key: "price", label: "Precio" },
  { key: "priceOld", label: "Precio anterior" },
  { key: "brand", label: "Marca / proveedor" },
];

const TOP_TEXT_MODES: { value: TopTextMode; label: string }[] = [
  { value: "none", label: "No mostrar" },
  { value: "brand", label: "Mostrar marca" },
  { value: "supplier", label: "Mostrar proveedor" },
  { value: "store", label: "Mostrar tienda / Nutribatidos" },
  { value: "category", label: "Mostrar categoría principal" },
  { value: "custom", label: "Personalizado" },
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
  const updateTopText = (patch: Partial<TopTextCfg>) => {
    setStyle((s) => ({ ...s, topText: { ...s.topText, ...patch } }));
  };
  const updateButton = (patch: Partial<ButtonCfg>) => {
    setStyle((s) => ({ ...s, button: { ...s.button, ...patch } }));
  };
  const updateLayout = (patch: Partial<LayoutCfg>) => {
    setStyle((s) => ({ ...s, layout: { ...s.layout, ...patch } }));
  };

  if (loading) return <div className="p-6 text-muted-foreground">Cargando…</div>;

  const previewProducts = [
    { name: "Whey 1kg", desc: "24g proteína por porción.", price: "S/ 89.00", old: "S/ 119.00", emoji: "🥤", hasPrice: true, brand: "OPTIMUM", supplier: "Optimum Perú", category: "Proteínas" },
    { name: "Proteína Whey Premium 1kg sabor chocolate intenso", desc: "Fórmula con 24g de proteína, recuperación muscular y energía.", price: "S/ 129.00", old: null, emoji: "🍫", hasPrice: true, brand: "NUTRIBATIDOS", supplier: "Nutribatidos", category: "Suplementos" },
    { name: "Pack avanzado deportivo", desc: "Suplemento personalizado para atletas.", price: null as string | null, old: null, emoji: "💪", hasPrice: false, brand: "", supplier: "", category: "Packs" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Tipografía de productos del Home</h1>
        <p className="text-muted-foreground">
          Controla qué textos se ven y cómo se ven en las tarjetas de los carruseles del Home
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

          {/* Top text mode */}
          <section className="rounded-lg border bg-background p-5">
            <header className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-lg">Texto superior de producto</h2>
                <p className="text-xs text-muted-foreground">
                  Decide qué se muestra arriba del título (donde aparecía “NUTRIBATIDOS”).
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                Mostrar
                <Switch
                  checked={style.topText.show !== false}
                  onCheckedChange={(v) => updateTopText({ show: v })}
                />
              </label>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Modo</Label>
                <Select
                  value={style.topText.mode}
                  onValueChange={(v) => updateTopText({ mode: v as TopTextMode })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOP_TEXT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {style.topText.mode === "store" && (
                <div>
                  <Label>Nombre de tienda</Label>
                  <Input
                    value={style.topText.storeName}
                    onChange={(e) => updateTopText({ storeName: e.target.value })}
                  />
                </div>
              )}
              {style.topText.mode === "custom" && (
                <div className="sm:col-span-2">
                  <Label>Texto personalizado</Label>
                  <Input
                    value={style.topText.customText}
                    onChange={(e) => updateTopText({ customText: e.target.value })}
                    placeholder="Ej: Recomendado por Lucía"
                  />
                </div>
              )}
              {(style.topText.mode === "brand" || style.topText.mode === "supplier" || style.topText.mode === "category") && (
                <div>
                  <Label>Fallback (si no existe)</Label>
                  <Input
                    value={style.topText.fallback}
                    onChange={(e) => updateTopText({ fallback: e.target.value })}
                    placeholder="Dejar vacío para no mostrar nada"
                  />
                </div>
              )}
              <div>
                <Label>Tamaño desktop (px)</Label>
                <Input type="number" value={style.topText.sizeDesktop}
                  onChange={(e) => updateTopText({ sizeDesktop: +e.target.value })} />
              </div>
              <div>
                <Label>Tamaño mobile (px)</Label>
                <Input type="number" value={style.topText.sizeMobile}
                  onChange={(e) => updateTopText({ sizeMobile: +e.target.value })} />
              </div>
              <div>
                <Label>Peso</Label>
                <Select value={String(style.topText.weight)} onValueChange={(v) => updateTopText({ weight: +v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[300, 400, 500, 600, 700, 800].map((w) => <SelectItem key={w} value={String(w)}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={style.topText.color}
                    onChange={(e) => updateTopText({ color: e.target.value })} className="h-10 w-12 rounded border" />
                  <Input value={style.topText.color}
                    onChange={(e) => updateTopText({ color: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Transformación</Label>
                <Select value={style.topText.transform ?? "uppercase"}
                  onValueChange={(v) => updateTopText({ transform: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Normal</SelectItem>
                    <SelectItem value="uppercase">MAYÚSCULAS</SelectItem>
                    <SelectItem value="lowercase">minúsculas</SelectItem>
                    <SelectItem value="capitalize">Capitalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {TEXT_SECTIONS.map(({ key, label }) => {
            const cfg = style[key] as TextCfg;
            const isCategory = key === "category";
            const isPriceOld = key === "priceOld";
            const isRecommended = key === "recommended";
            return (
              <section key={String(key)} className="rounded-lg border bg-background p-5">
                <header className="mb-4 flex items-center justify-between">
                  <h2 className="font-display text-lg">{label}</h2>
                  <label className="flex items-center gap-2 text-sm">
                    {isRecommended ? "Mostrar tiempo de entrega" : "Mostrar"}
                    <Switch checked={cfg.show !== false} onCheckedChange={(v) => updateText(key, { show: v })} />
                  </label>
                </header>

                {isRecommended && (
                  <div className="mb-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label>Texto de entrega por defecto</Label>
                      <Input
                        value={cfg.text ?? "Entrega: 7–15 días hábiles"}
                        onChange={(e) => updateText(key, { text: e.target.value })}
                        placeholder="Entrega: 7–15 días hábiles"
                      />
                    </div>
                    <div>
                      <Label>Ícono</Label>
                      <Select
                        value={(cfg as any).icon ?? "clock"}
                        onValueChange={(v) => updateText(key, { icon: v as any } as any)}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clock">🕒 Reloj</SelectItem>
                          <SelectItem value="truck">🚚 Camión</SelectItem>
                          <SelectItem value="none">Ninguno</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
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
            <header className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg">Botón Agregar al carrito</h2>
              <label className="flex items-center gap-2 text-sm">
                Mostrar
                <Switch checked={style.button.show !== false} onCheckedChange={(v) => updateButton({ show: v })} />
              </label>
            </header>
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

          {/* Estructura de tarjeta */}
          <section className="rounded-lg border bg-background p-5">
            <h2 className="mb-1 font-display text-lg">Estructura de tarjeta</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Controla el layout de las tarjetas en los carruseles del Home para que queden alineadas
              (imágenes, precios y botones al mismo nivel). No afecta al catálogo ni a la ficha de producto.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <Label>Alto imagen desktop (px)</Label>
                <Input type="number" value={style.layout.imageHeightDesktop}
                  onChange={(e) => updateLayout({ imageHeightDesktop: +e.target.value })} />
              </div>
              <div>
                <Label>Alto imagen mobile (px)</Label>
                <Input type="number" value={style.layout.imageHeightMobile}
                  onChange={(e) => updateLayout({ imageHeightMobile: +e.target.value })} />
              </div>
              <div>
                <Label>Ajuste de imagen</Label>
                <Select value={style.layout.imageFit}
                  onValueChange={(v) => updateLayout({ imageFit: v as "cover" | "contain" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contain">Contain (no recorta, ecommerce)</SelectItem>
                    <SelectItem value="cover">Cover (rellena, recorta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fondo del área de imagen</Label>
                <div className="flex gap-2">
                  <input type="color" value={style.layout.imageBg}
                    onChange={(e) => updateLayout({ imageBg: e.target.value })}
                    className="h-10 w-12 rounded border" />
                  <Input value={style.layout.imageBg}
                    onChange={(e) => updateLayout({ imageBg: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Padding interno (px)</Label>
                <Input type="number" value={style.layout.paddingInner}
                  onChange={(e) => updateLayout({ paddingInner: +e.target.value })} />
              </div>
              <div>
                <Label>Espacio entre elementos (px)</Label>
                <Input type="number" value={style.layout.gap}
                  onChange={(e) => updateLayout({ gap: +e.target.value })} />
              </div>
              <div>
                <Label>Alto bloque precio (px)</Label>
                <Input type="number" value={style.layout.priceBlockHeight}
                  onChange={(e) => updateLayout({ priceBlockHeight: +e.target.value })} />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={style.layout.buttonBottom !== false}
                  onCheckedChange={(v) => updateLayout({ buttonBottom: v })} />
                <Label>Alinear botón abajo</Label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={style.layout.equalizeHeights !== false}
                  onCheckedChange={(v) => updateLayout({ equalizeHeights: v })} />
                <Label>Igualar altura de cards</Label>
              </div>
            </div>
          </section>
        </div>

        {/* Live Preview */}
        <aside className="lg:sticky lg:top-4 lg:h-fit">
          <h2 className="mb-3 font-display text-lg">Vista previa en vivo</h2>
          <div className="hpc-scope rounded-xl border bg-secondary/40 p-4">
            <HomeProductCardStyles style={style} scope=".hpc-preview" />
            <div className="hpc-preview grid grid-cols-1 gap-3 sm:grid-cols-3 items-stretch">
              {previewProducts.map((p, i) => {
                const topText = resolveTopText(style.topText, {
                  brand: p.brand,
                  category: p.category,
                  supplier: { business_name: p.supplier },
                });
                return (
                  <article key={i} data-pc="card" className="overflow-hidden rounded-lg border border-border bg-card">
                    <div data-pc="image-wrap" className="grid place-items-center text-5xl">
                      <span>{p.emoji}</span>
                    </div>
                    <div data-pc="content">
                      {style.topText.mode !== "none" && style.topText.show !== false && topText && (
                        <div data-pc="top-text">{topText}</div>
                      )}
                      <div data-pc="category">SUPLEMENTOS · PROTEÍNAS</div>
                      <div data-pc="title">{p.name}</div>
                      <p data-pc="description">{p.desc}</p>
                      {style.recommended.show !== false && (
                        <div data-pc="recommended">{style.recommended.text || "Recomendado"}</div>
                      )}
                      <div data-pc="button-wrap">
                        <div data-pc="price-block">
                          {p.hasPrice ? (
                            <>
                              <span data-pc="price">{p.price}</span>
                              {p.old && <span data-pc="price-old">{p.old}</span>}
                            </>
                          ) : (
                            <span data-pc="price">Consultar precio</span>
                          )}
                        </div>
                        <button data-pc="button" type="button" className="mt-2 inline-flex items-center justify-center gap-2 px-3">
                          {p.hasPrice ? "🛒 Agregar al carrito" : "💬 Consultar"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            La vista previa muestra 3 productos para validar alineación cuando ocultas/mostrás elementos.
          </p>
        </aside>
      </div>
    </div>
  );
}
