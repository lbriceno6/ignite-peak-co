import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, ArrowUp, ArrowDown, Plus, Image as ImageIcon, Monitor, Tablet, Smartphone } from "lucide-react";
import { HeroBannerSlide } from "@/components/HeroBannerSlide";
import { defaultHeroSlideDesign, heroPresets, mergeHeroSlideDesign, type HeroSlideDesign, type HeroPresetKey } from "@/lib/heroSlideDesign";

type Slide = {
  id: string;
  eyebrow: string | null;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  image_mobile_url: string | null;
  primary_label: string | null;
  primary_href: string | null;
  secondary_label: string | null;
  secondary_href: string | null;
  sort_order: number;
  is_active: boolean;
  design: any;
};

const empty = {
  eyebrow: "",
  title: "",
  subtitle: "",
  image_url: "",
  image_mobile_url: "",
  primary_label: "",
  primary_href: "",
  secondary_label: "",
  secondary_href: "",
  is_active: true,
  design: defaultHeroSlideDesign as any,
};

export default function AdminHeroSlides() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("hero_slides").select("*").order("sort_order").order("created_at");
    setSlides((data as Slide[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const sort_order = slides.length ? Math.max(...slides.map((s) => s.sort_order)) + 1 : 0;
    const { error } = await supabase.from("hero_slides").insert({ ...empty, title: "Nuevo slide", sort_order });
    if (error) return toast.error(error.message);
    toast.success("Slide creado");
    load();
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex((s) => s.id === id);
    const swap = slides[idx + dir];
    if (!swap) return;
    const cur = slides[idx];
    await Promise.all([
      supabase.from("hero_slides").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("hero_slides").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Home banner carousel</h1>
          <p className="text-muted-foreground">Controla diseño, tamaño, overlay, textos, botones y vista responsive de cada slide.</p>
        </div>
        <Button variant="default" onClick={create}><Plus size={16} /> Nuevo slide</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : slides.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-muted/30 p-10 text-center text-muted-foreground">
          Aún no hay slides. Haz clic en <strong>Nuevo slide</strong>.
        </div>
      ) : (
        <div className="space-y-4">
          {slides.map((s, i) => (
            <SlideEditor
              key={s.id}
              slide={s}
              isFirst={i === 0}
              isLast={i === slides.length - 1}
              onChanged={load}
              onMoveUp={() => move(s.id, -1)}
              onMoveDown={() => move(s.id, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SlideEditor({
  slide, isFirst, isLast, onChanged, onMoveUp, onMoveDown,
}: {
  slide: Slide; isFirst: boolean; isLast: boolean;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [f, setF] = useState<Slide>({ ...slide, design: mergeHeroSlideDesign(slide.design) });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const fileRef = useRef<HTMLInputElement>(null);
  const fileMobileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setF({ ...slide, design: mergeHeroSlideDesign(slide.design) }); }, [slide]);

  const set = (k: keyof Slide, v: any) => setF((p) => ({ ...p, [k]: v }));
  const design: HeroSlideDesign = f.design;
  const setDesign = (patch: Partial<HeroSlideDesign>) => set("design", { ...design, ...patch });
  const setSection = <K extends keyof HeroSlideDesign>(section: K, patch: Partial<HeroSlideDesign[K]>) =>
    setDesign({ [section]: { ...(design[section] as any), ...patch } } as any);

  const dirty = JSON.stringify(f) !== JSON.stringify({ ...slide, design: mergeHeroSlideDesign(slide.design) });

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("hero_slides")
        .update({
          eyebrow: f.eyebrow, title: f.title, subtitle: f.subtitle,
          image_url: f.image_url, image_mobile_url: f.image_mobile_url,
          primary_label: f.primary_label, primary_href: f.primary_href,
          secondary_label: f.secondary_label, secondary_href: f.secondary_href,
          is_active: f.is_active, design: f.design as any,
        })
        .eq("id", slide.id);
      if (error) throw error;
      toast.success("Slide guardado");
      onChanged();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const remove = async () => {
    if (!confirm("¿Eliminar este slide?")) return;
    const { error } = await supabase.from("hero_slides").delete().eq("id", slide.id);
    if (error) return toast.error(error.message);
    toast.success("Slide eliminado");
    onChanged();
  };

  const uploadImage = async (file: File, kind: "desktop" | "mobile") => {
    setUploading(kind);
    try {
      const ext = file.name.split(".").pop();
      const path = `hero-${kind}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      set(kind === "desktop" ? "image_url" : "image_mobile_url", data.publicUrl);
      toast.success("Imagen subida — recuerda guardar");
    } catch (e: any) { toast.error(e.message); } finally { setUploading(null); }
  };

  const applyPreset = (key: HeroPresetKey) => {
    set("design", { ...heroPresets[key].design });
    toast.success(`Preset "${heroPresets[key].label}" aplicado`);
  };

  const previewSize = previewMode === "desktop" ? { w: "100%", max: 1100 }
    : previewMode === "tablet" ? { w: "768px", max: 768 } : { w: "375px", max: 375 };

  return (
    <div className="rounded-lg border bg-background p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold uppercase tracking-wide">
            Slide #{slide.sort_order + 1}
          </span>
          <div className="flex items-center gap-2">
            <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} id={`active-${slide.id}`} />
            <Label htmlFor={`active-${slide.id}`} className="text-xs">Activo</Label>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst}><ArrowUp size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast}><ArrowDown size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={remove}><Trash2 size={16} className="text-destructive" /></Button>
        </div>
      </div>

      {/* Presets */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Presets:</span>
        {(Object.keys(heroPresets) as HeroPresetKey[]).map((k) => (
          <Button key={k} type="button" variant="outline" size="sm" onClick={() => applyPreset(k)}>
            {heroPresets[k].label}
          </Button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT: editor */}
        <div className="space-y-3">
          <Accordion type="multiple" defaultValue={["content"]} className="w-full">
            {/* CONTENT */}
            <AccordionItem value="content">
              <AccordionTrigger>1. Contenido y botones</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div><Label className="text-xs">Eyebrow</Label><Input value={f.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} /></div>
                <div><Label className="text-xs">Title</Label><Textarea rows={2} value={f.title} onChange={(e) => set("title", e.target.value)} /></div>
                <div><Label className="text-xs">Subtitle</Label><Textarea rows={2} value={f.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} /></div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Botón principal</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Label" value={f.primary_label ?? ""} onChange={(e) => set("primary_label", e.target.value)} />
                    <Input placeholder="URL" value={f.primary_href ?? ""} onChange={(e) => set("primary_href", e.target.value)} />
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Botón secundario</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Label" value={f.secondary_label ?? ""} onChange={(e) => set("secondary_label", e.target.value)} />
                    <Input placeholder="URL" value={f.secondary_href ?? ""} onChange={(e) => set("secondary_href", e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* IMAGES */}
            <AccordionItem value="images">
              <AccordionTrigger>2. Imágenes (desktop + mobile)</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <ImageField label="Imagen desktop" url={f.image_url ?? ""} onChange={(v) => set("image_url", v)}
                  onUpload={(file) => uploadImage(file, "desktop")} uploading={uploading === "desktop"} inputRef={fileRef} />
                <ImageField label="Imagen mobile (opcional)" url={f.image_mobile_url ?? ""} onChange={(v) => set("image_mobile_url", v)}
                  onUpload={(file) => uploadImage(file, "mobile")} uploading={uploading === "mobile"} inputRef={fileMobileRef} />
                <p className="text-xs text-muted-foreground">Si no hay imagen mobile, se usará la imagen desktop.</p>
              </AccordionContent>
            </AccordionItem>

            {/* SIZE */}
            <AccordionItem value="size">
              <AccordionTrigger>3. Tamaño del banner</AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <NumberField label="Alto desktop (px)" value={design.size.heightDesktop} onChange={(v) => setSection("size", { heightDesktop: v })} />
                <NumberField label="Alto tablet (px)" value={design.size.heightTablet} onChange={(v) => setSection("size", { heightTablet: v })} />
                <NumberField label="Alto mobile (px)" value={design.size.heightMobile} onChange={(v) => setSection("size", { heightMobile: v })} />
                <NumberField label="Padding vertical" value={design.size.paddingY} onChange={(v) => setSection("size", { paddingY: v })} />
                <NumberField label="Padding horizontal" value={design.size.paddingX} onChange={(v) => setSection("size", { paddingX: v })} />
              </AccordionContent>
            </AccordionItem>

            {/* OVERLAY */}
            <AccordionItem value="overlay">
              <AccordionTrigger>4. Opacidad y overlay</AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={design.overlay.enabled} onCheckedChange={(v) => setSection("overlay", { enabled: v })} id={`ov-${slide.id}`} />
                  <Label htmlFor={`ov-${slide.id}`} className="text-xs">Activar overlay</Label>
                </div>
                <div>
                  <Label className="text-xs">Tipo de overlay</Label>
                  <Select value={design.overlay.type} onValueChange={(v) => setSection("overlay", { type: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dark">Oscuro</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="gradient-side">Degradado lateral</SelectItem>
                      <SelectItem value="gradient-bottom">Degradado inferior</SelectItem>
                      <SelectItem value="none">Sin overlay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ColorField label="Color overlay" value={design.overlay.color} onChange={(v) => setSection("overlay", { color: v })} />
                <NumberField label="Opacidad overlay (%)" value={design.overlay.opacity} onChange={(v) => setSection("overlay", { opacity: v })} />
                <NumberField label="Opacidad imagen (%)" value={design.overlay.imageOpacity} onChange={(v) => setSection("overlay", { imageOpacity: v })} />
              </AccordionContent>
            </AccordionItem>

            {/* IMAGE POSITION */}
            <AccordionItem value="image-pos">
              <AccordionTrigger>5. Posición de imagen</AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Ajuste</Label>
                  <Select value={design.image.fit} onValueChange={(v) => setSection("image", { fit: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="cover">Cover</SelectItem><SelectItem value="contain">Contain</SelectItem></SelectContent>
                  </Select>
                </div>
                <NumberField label="Zoom (%)" value={design.image.zoom} onChange={(v) => setSection("image", { zoom: v })} />
                <PosXSelect label="Posición horizontal" value={design.image.posX} onChange={(v) => setSection("image", { posX: v })} />
                <PosYSelect label="Posición vertical" value={design.image.posY} onChange={(v) => setSection("image", { posY: v })} />
              </AccordionContent>
            </AccordionItem>

            {/* TEXT */}
            <AccordionItem value="text">
              <AccordionTrigger>6. Estilos de texto</AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-3">
                <ColorField label="Color del texto" value={design.text.color} onChange={(v) => setSection("text", { color: v })} />
                <NumberField label="Ancho máx. (px)" value={design.text.maxWidth} onChange={(v) => setSection("text", { maxWidth: v })} />
                <NumberField label="Título desktop (px)" value={design.text.titleDesktop} onChange={(v) => setSection("text", { titleDesktop: v })} />
                <NumberField label="Título mobile (px)" value={design.text.titleMobile} onChange={(v) => setSection("text", { titleMobile: v })} />
                <NumberField label="Subtítulo desktop (px)" value={design.text.subtitleDesktop} onChange={(v) => setSection("text", { subtitleDesktop: v })} />
                <NumberField label="Subtítulo mobile (px)" value={design.text.subtitleMobile} onChange={(v) => setSection("text", { subtitleMobile: v })} />
                <NumberField label="Máx. líneas título (0 = todas)" value={design.text.maxLines} onChange={(v) => setSection("text", { maxLines: v })} />
              </AccordionContent>
            </AccordionItem>

            {/* BUTTONS */}
            <AccordionItem value="buttons">
              <AccordionTrigger>7. Estilo de botones</AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-3">
                <ColorField label="Bg botón principal" value={design.buttons.primaryBg} onChange={(v) => setSection("buttons", { primaryBg: v })} />
                <ColorField label="Texto botón principal" value={design.buttons.primaryText} onChange={(v) => setSection("buttons", { primaryText: v })} />
                <ColorField label="Bg/borde botón secundario" value={design.buttons.secondaryBg} onChange={(v) => setSection("buttons", { secondaryBg: v })} />
                <ColorField label="Texto botón secundario" value={design.buttons.secondaryText} onChange={(v) => setSection("buttons", { secondaryText: v })} />
                <div>
                  <Label className="text-xs">Estilo secundario</Label>
                  <Select value={design.buttons.secondaryStyle} onValueChange={(v) => setSection("buttons", { secondaryStyle: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Sólido</SelectItem>
                      <SelectItem value="outline">Outline</SelectItem>
                      <SelectItem value="ghost">Ghost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <NumberField label="Borde redondeado (px)" value={design.buttons.radius} onChange={(v) => setSection("buttons", { radius: v })} />
                <div className="col-span-2 flex items-center gap-2">
                  <Switch checked={design.buttons.hideSecondary} onCheckedChange={(v) => setSection("buttons", { hideSecondary: v })} id={`hs-${slide.id}`} />
                  <Label htmlFor={`hs-${slide.id}`} className="text-xs">Ocultar botón secundario</Label>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ALIGN */}
            <AccordionItem value="align">
              <AccordionTrigger>8. Alineación del contenido</AccordionTrigger>
              <AccordionContent className="grid grid-cols-2 gap-3">
                <PosXSelect label="Desktop horizontal" value={design.align.desktopX} onChange={(v) => setSection("align", { desktopX: v })} />
                <PosYSelect label="Desktop vertical" value={design.align.desktopY} onChange={(v) => setSection("align", { desktopY: v })} />
                <PosXSelect label="Mobile horizontal" value={design.align.mobileX} onChange={(v) => setSection("align", { mobileX: v })} />
                <PosYSelect label="Mobile vertical" value={design.align.mobileY} onChange={(v) => setSection("align", { mobileY: v })} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setF({ ...slide, design: mergeHeroSlideDesign(slide.design) })} disabled={!dirty || saving}>
              Descartar
            </Button>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Guardando…" : "Guardar slide"}
            </Button>
          </div>
        </div>

        {/* RIGHT: live preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase">Vista previa en vivo</Label>
            <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
              <TabsList>
                <TabsTrigger value="desktop"><Monitor size={14} /></TabsTrigger>
                <TabsTrigger value="tablet"><Tablet size={14} /></TabsTrigger>
                <TabsTrigger value="mobile"><Smartphone size={14} /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mx-auto overflow-hidden rounded-md border bg-background" style={{ width: previewSize.w, maxWidth: previewSize.max }}>
              <HeroBannerSlide slide={{ ...f, id: `preview-${f.id}` } as any} mode={previewMode} asLinks={false} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-12 cursor-pointer rounded border bg-background" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

function PosXSelect({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="left">Izquierda</SelectItem>
          <SelectItem value="center">Centro</SelectItem>
          <SelectItem value="right">Derecha</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function PosYSelect({ label, value, onChange }: { label: string; value: any; onChange: (v: any) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="top">Arriba</SelectItem>
          <SelectItem value="center">Centro</SelectItem>
          <SelectItem value="bottom">Abajo</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function ImageField({
  label, url, onChange, onUpload, uploading, inputRef,
}: {
  label: string; url: string; onChange: (v: string) => void;
  onUpload: (file: File) => void; uploading: boolean; inputRef: React.RefObject<HTMLInputElement>;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="relative aspect-[16/9] overflow-hidden rounded-md border bg-muted">
        {url ? <img src={url} alt="" className="h-full w-full object-cover" /> : (
          <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon size={28} /></div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Subiendo…" : "Subir"}
        </Button>
        {url && <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>Quitar</Button>}
      </div>
      <Input value={url} onChange={(e) => onChange(e.target.value)} placeholder="…o pega URL" />
    </div>
  );
}
