import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Upload, Loader2, ArrowUp, ArrowDown, Image as ImageIcon, Eye, EyeOff, Copy, GripVertical } from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type CarouselSettings = {
  carousel_mode?: "auto" | "manual";
  promotion_ids?: string[];
  max_products?: number;
};

type Block = {
  id: string;
  block_key: string;
  block_type: string;
  sort_order: number;
  is_active: boolean;
  eyebrow: string | null;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  cta_href: string | null;
  cta2_label: string | null;
  cta2_href: string | null;
  image_url: string | null;
  settings: Record<string, any> | null;
};

type PromotionRow = { id: string; name: string; is_active: boolean };

const TYPE_LABELS: Record<string, { name: string; desc: string; hasImage: boolean; hasCta: boolean; hasCta2: boolean }> = {
  hero:          { name: "Hero carousel",       desc: "Slides edited from the “Hero carousel” page.", hasImage: false, hasCta: false, hasCta2: false },
  categories:    { name: "Categories grid",     desc: "Auto-populated from your categories.",         hasImage: false, hasCta: false, hasCta2: false },
  best_sellers:  { name: "Best sellers",        desc: "Products tagged as “best seller”.",            hasImage: false, hasCta: true,  hasCta2: false },
  goals:         { name: "Shop by goal",        desc: "Goal cards.",                                  hasImage: false, hasCta: false, hasCta2: false },
  promo:         { name: "Promo banner",        desc: "Big promo banner with image and CTA.",         hasImage: true,  hasCta: true,  hasCta2: false },
  products_grid: { name: "More products grid",  desc: "Grid of latest products.",                     hasImage: false, hasCta: false, hasCta2: false },
  reviews:       { name: "Customer reviews",    desc: "Reviews carousel.",                            hasImage: false, hasCta: false, hasCta2: false },
  blog:          { name: "Guides & insights",   desc: "Featured blog posts.",                         hasImage: false, hasCta: false, hasCta2: false },
  trust:         { name: "Trust badges",        desc: "Shipping / payment / quality badges.",         hasImage: false, hasCta: false, hasCta2: false },
  nutrition_advisory: { name: "Nutritional advisory", desc: "Section with image and WhatsApp CTA for nutritional advice.", hasImage: true, hasCta: true, hasCta2: false },
  promotions_carousel: { name: "Promociones para usted", desc: "Carrusel de productos con promociones activas. Edita los textos aquí y administra las promociones desde la sección Promociones.", hasImage: false, hasCta: true, hasCta2: false },
};

export default function AdminHomeBlocks() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("home_blocks").select("*").order("sort_order").order("created_at");
    setBlocks((data as Block[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const move = async (id: string, dir: -1 | 1) => {
    const idx = blocks.findIndex((s) => s.id === id);
    const swap = blocks[idx + dir];
    if (!swap) return;
    const cur = blocks[idx];
    await Promise.all([
      supabase.from("home_blocks").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("home_blocks").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const duplicate = async (b: Block) => {
    try {
      const suffix = Math.random().toString(36).slice(2, 7);
      const newKey = `${b.block_key}-copy-${suffix}`.slice(0, 80);
      const maxOrder = blocks.reduce((m, x) => Math.max(m, x.sort_order), 0);
      const { error } = await supabase.from("home_blocks").insert({
        block_key: newKey,
        block_type: b.block_type,
        sort_order: maxOrder + 1,
        is_active: false,
        eyebrow: b.eyebrow,
        title: b.title ? `Copia de ${b.title}` : `Copia de ${b.block_key}`,
        subtitle: b.subtitle,
        cta_label: b.cta_label,
        cta_href: b.cta_href,
        cta2_label: b.cta2_label,
        cta2_href: b.cta2_href,
        image_url: b.image_url,
        settings: b.settings ?? {},
      } as any);
      if (error) throw error;
      toast.success("Sección duplicada correctamente (oculta).");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Home page sections</h1>
        <p className="text-muted-foreground">
          Reorder, hide/show and edit every section of the home page. Hero slides and Guides texts also have
          dedicated pages with extra options.
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {blocks.map((b, i) => (
            <BlockEditor
              key={b.id}
              block={b}
              isFirst={i === 0}
              isLast={i === blocks.length - 1}
              position={i + 1}
              onChanged={load}
              onMoveUp={() => move(b.id, -1)}
              onMoveDown={() => move(b.id, 1)}
              onDuplicate={() => duplicate(b)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockEditor({
  block, isFirst, isLast, position, onChanged, onMoveUp, onMoveDown, onDuplicate,
}: {
  block: Block; isFirst: boolean; isLast: boolean; position: number;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void; onDuplicate: () => void;
}) {
  const [f, setF] = useState<Block>(block);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setF(block); }, [block]);

  const meta = TYPE_LABELS[block.block_type] ?? { name: block.block_key, desc: "", hasImage: true, hasCta: true, hasCta2: true };
  const set = (k: keyof Block, v: any) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(block);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("home_blocks").update({
        is_active: f.is_active,
        eyebrow: f.eyebrow, title: f.title, subtitle: f.subtitle,
        cta_label: f.cta_label, cta_href: f.cta_href,
        cta2_label: f.cta2_label, cta2_href: f.cta2_href,
        image_url: f.image_url,
        settings: f.settings ?? {},
      } as any).eq("id", block.id);
      if (error) throw error;
      toast.success("Section saved");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (v: boolean) => {
    set("is_active", v);
    const { error } = await supabase.from("home_blocks").update({ is_active: v }).eq("id", block.id);
    if (error) toast.error(error.message);
    else toast.success(v ? "Section shown" : "Section hidden");
    onChanged();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `home-${block.block_key}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      set("image_url", data.publicUrl);
      toast.success("Image uploaded — remember to save");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  return (
    <div className={`rounded-lg border bg-background p-5 ${!f.is_active ? "opacity-60" : ""}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums">#{position}</span>
          <div>
            <p className="font-display text-lg leading-tight">{meta.name}</p>
            <p className="text-xs text-muted-foreground">{meta.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-2 flex items-center gap-2">
            {f.is_active ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground" />}
            <Switch checked={f.is_active} onCheckedChange={toggleActive} />
          </div>
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label="Move up">
            <ArrowUp size={16} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label="Move down">
            <ArrowDown size={16} />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Duplicar sección" title="Duplicar sección">
                <Copy size={16} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Deseas duplicar esta sección?</AlertDialogTitle>
                <AlertDialogDescription>
                  Se creará una copia exacta de "{f.title || meta.name}" como <strong>oculta</strong>, al final del listado. Podrás editarla sin afectar la original.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDuplicate}>Duplicar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className={`grid gap-5 ${meta.hasImage ? "md:grid-cols-[260px,1fr]" : ""}`}>
        {meta.hasImage && (
          <div className="space-y-2">
            <Label className="text-xs">Background image</Label>
            <div className="relative aspect-[4/3] overflow-hidden rounded-md border bg-muted">
              {f.image_url ? (
                <img src={f.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon size={28} /></div>
              )}
            </div>
            <input
              ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              {f.image_url && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("image_url", "")}>Remove</Button>
              )}
            </div>
            <Input value={f.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} placeholder="…or paste URL" />
          </div>
        )}

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Eyebrow (small label)</Label>
              <Input value={f.eyebrow ?? ""} onChange={(e) => set("eyebrow", e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <Label className="text-xs">Title</Label>
              <Input value={f.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Subtitle / description</Label>
            <Textarea rows={2} value={f.subtitle ?? ""} onChange={(e) => set("subtitle", e.target.value)} />
          </div>

          {meta.hasCta && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Button</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Label" value={f.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} />
                <Input placeholder="URL (e.g. /category/protein)" value={f.cta_href ?? ""} onChange={(e) => set("cta_href", e.target.value)} />
              </div>
            </div>
          )}

          {meta.hasCta2 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secondary button</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Input placeholder="Label" value={f.cta2_label ?? ""} onChange={(e) => set("cta2_label", e.target.value)} />
                <Input placeholder="URL" value={f.cta2_href ?? ""} onChange={(e) => set("cta2_href", e.target.value)} />
              </div>
            </div>
          )}

          {block.block_type === "promotions_carousel" && (
            <PromotionsCarouselSettings
              settings={(f.settings ?? {}) as CarouselSettings}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}


          <div className="flex items-center justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => setF(block)} disabled={!dirty || saving}>Discard</Button>
            <Button variant="dark" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save section"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PromotionsCarouselSettings({
  settings,
  onChange,
}: {
  settings: CarouselSettings;
  onChange: (next: CarouselSettings) => void;
}) {
  const [promos, setPromos] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const mode: "auto" | "manual" = settings.carousel_mode === "manual" ? "manual" : "auto";
  const selected: string[] = Array.isArray(settings.promotion_ids) ? settings.promotion_ids : [];
  const maxProducts: number = Number(settings.max_products ?? 0);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("promotions")
        .select("id,name,is_active")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      setPromos((data as PromotionRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const togglePromo = (id: string) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange({ promotion_ids: next });
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Configuración del carrusel de promociones
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChange({ carousel_mode: "auto" })}
          className={`rounded-md border p-3 text-left text-sm transition ${
            mode === "auto" ? "border-accent bg-background ring-1 ring-accent" : "bg-background hover:border-foreground/40"
          }`}
        >
          <p className="font-semibold">Automático</p>
          <p className="text-xs text-muted-foreground">
            Muestra todas las promociones activas marcadas como “visibles en carrusel”.
          </p>
        </button>
        <button
          type="button"
          onClick={() => onChange({ carousel_mode: "manual" })}
          className={`rounded-md border p-3 text-left text-sm transition ${
            mode === "manual" ? "border-accent bg-background ring-1 ring-accent" : "bg-background hover:border-foreground/40"
          }`}
        >
          <p className="font-semibold">Manual</p>
          <p className="text-xs text-muted-foreground">
            Muestra solo las promociones que selecciones a continuación.
          </p>
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr,auto] sm:items-end">
        <div>
          <Label className="text-xs">Límite de productos a mostrar</Label>
          <Input
            type="number"
            min={0}
            max={50}
            value={maxProducts}
            onChange={(e) => onChange({ max_products: Math.max(0, Number(e.target.value || 0)) })}
            placeholder="0 = sin límite"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            0 = sin límite. Recomendado: 8–12 productos.
          </p>
        </div>
      </div>

      {mode === "manual" && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Orden del carrusel (arrastra para reordenar)</Label>
            {loading ? (
              <p className="mt-2 text-xs text-muted-foreground">Cargando promociones…</p>
            ) : selected.length === 0 ? (
              <p className="mt-2 rounded-md border border-dashed bg-background p-3 text-xs text-muted-foreground">
                No has seleccionado promociones todavía. Agrégalas desde la lista de abajo.
              </p>
            ) : (
              <SortablePromotionList
                ids={selected}
                promos={promos}
                onReorder={(next) => onChange({ promotion_ids: next })}
                onRemove={(id) => onChange({ promotion_ids: selected.filter((x) => x !== id) })}
              />
            )}
          </div>

          <div>
            <Label className="text-xs">Agregar promociones</Label>
            {loading ? null : (
              <div className="mt-2 max-h-56 space-y-1 overflow-auto rounded-md border bg-background p-2">
                {promos.filter((p) => !selected.includes(p.id)).length === 0 ? (
                  <p className="px-2 py-1.5 text-xs text-muted-foreground">
                    Todas las promociones disponibles ya están en el carrusel.
                  </p>
                ) : (
                  promos
                    .filter((p) => !selected.includes(p.id))
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onChange({ promotion_ids: [...selected, p.id] })}
                        className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <span>{p.name}</span>
                        <span className="flex items-center gap-2">
                          {!p.is_active && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">inactiva</span>
                          )}
                          <span className="text-xs text-accent">+ Agregar</span>
                        </span>
                      </button>
                    ))
                )}
              </div>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Solo se mostrarán promociones activas y dentro de su rango de fechas. Recuerda guardar la sección.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SortablePromotionList({
  ids,
  promos,
  onReorder,
  onRemove,
}: {
  ids: string[];
  promos: PromotionRow[];
  onReorder: (next: string[]) => void;
  onRemove: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const byId = new Map(promos.map((p) => [p.id, p]));

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(e) => {
        const { active, over } = e;
        if (!over || active.id === over.id) return;
        const oldIndex = ids.indexOf(String(active.id));
        const newIndex = ids.indexOf(String(over.id));
        if (oldIndex < 0 || newIndex < 0) return;
        onReorder(arrayMove(ids, oldIndex, newIndex));
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="mt-2 max-h-72 space-y-1 overflow-auto rounded-md border bg-background p-2">
          {ids.map((id, i) => {
            const p = byId.get(id);
            return (
              <SortablePromoRow
                key={id}
                id={id}
                index={i}
                name={p?.name ?? "Promoción eliminada"}
                inactive={p ? !p.is_active : true}
                missing={!p}
                onRemove={() => onRemove(id)}
              />
            );
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortablePromoRow({
  id, index, name, inactive, missing, onRemove,
}: {
  id: string; index: number; name: string; inactive: boolean; missing: boolean; onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1.5 text-sm"
    >
      <span className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label="Arrastrar para reordenar"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={14} />
        </button>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold tabular-nums">
          {index + 1}
        </span>
        <span className="truncate">{name}</span>
        {inactive && !missing && (
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">inactiva</span>
        )}
        {missing && (
          <span className="text-[10px] uppercase tracking-wide text-destructive">no existe</span>
        )}
      </span>
      <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
        Quitar
      </Button>
    </li>
  );
}
