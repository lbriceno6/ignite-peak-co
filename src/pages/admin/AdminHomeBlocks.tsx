import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import {
  Upload, Loader2, ArrowUp, ArrowDown, Image as ImageIcon, Eye, EyeOff, Copy,
  GripVertical, Plus, Trash2, RotateCcw, Archive,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, TouchSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

type CarouselSettings = {
  carousel_mode?: "auto" | "manual";
  promotion_ids?: string[];
  max_products?: number;
  products_per_view_desktop?: number;
};

type Block = {
  id: string;
  block_key: string;
  block_type: string;
  sort_order: number;
  is_active: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
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
  hero:                { name: "Hero carousel",            desc: "Slides edited from the “Hero carousel” page.",                              hasImage: false, hasCta: false, hasCta2: false },
  categories:          { name: "Categories grid",          desc: "Auto-populated from your categories.",                                       hasImage: false, hasCta: false, hasCta2: false },
  best_sellers:        { name: "Best sellers",             desc: "Products tagged as “best seller”.",                                          hasImage: false, hasCta: true,  hasCta2: false },
  goals:               { name: "Shop by goal",             desc: "Goal cards.",                                                                hasImage: false, hasCta: false, hasCta2: false },
  promo:               { name: "Promo banner",             desc: "Big promo banner with image and CTA.",                                        hasImage: true,  hasCta: true,  hasCta2: false },
  products_grid:       { name: "More products grid",       desc: "Grid of latest products.",                                                    hasImage: false, hasCta: false, hasCta2: false },
  reviews:             { name: "Customer reviews",         desc: "Reviews carousel.",                                                           hasImage: false, hasCta: false, hasCta2: false },
  blog:                { name: "Guides & insights",        desc: "Featured blog posts.",                                                        hasImage: false, hasCta: false, hasCta2: false },
  trust:               { name: "Trust badges",             desc: "Shipping / payment / quality badges.",                                       hasImage: false, hasCta: false, hasCta2: false },
  nutrition_advisory:  { name: "Nutritional advisory",     desc: "Section with image and WhatsApp CTA for nutritional advice.",                hasImage: true,  hasCta: true,  hasCta2: false },
  promotions_carousel: { name: "Promociones para usted",   desc: "Carrusel de productos con promociones activas.",                              hasImage: false, hasCta: true,  hasCta2: false },
  custom_simple:       { name: "Sección personalizada",    desc: "Bloque libre con título, subtítulo, imagen, botón y alineación.",            hasImage: true,  hasCta: true,  hasCta2: false },
  custom_html:         { name: "HTML personalizado",       desc: "Bloque HTML libre (sanitizado por seguridad).",                              hasImage: false, hasCta: false, hasCta2: false },
  brands:              { name: "Marcas / Logos",           desc: "Grid de logotipos de marcas o partners con enlaces opcionales.",             hasImage: false, hasCta: false, hasCta2: false },
  faq:                 { name: "Preguntas frecuentes",     desc: "Acordeón con preguntas y respuestas.",                                       hasImage: false, hasCta: false, hasCta2: false },
  image_text:          { name: "Imagen + Texto",           desc: "Sección de dos columnas con imagen y texto a la izquierda o derecha.",       hasImage: true,  hasCta: true,  hasCta2: true  },
  video:               { name: "Video destacado",          desc: "Video embebido de YouTube, Vimeo o MP4.",                                    hasImage: false, hasCta: true,  hasCta2: false },
  new_products:        { name: "Productos nuevos",         desc: "Grid de los productos más recientes del catálogo.",                          hasImage: false, hasCta: true,  hasCta2: false },
  category_showcase:   { name: "Nuestras Categorías",      desc: "Tarjetas grandes y visuales de categorías destacadas con imagen y color.",  hasImage: false, hasCta: true,  hasCta2: false },
  double_promo_banners:{ name: "Banners dobles promocionales", desc: "Dos banners promocionales lado a lado con imágenes editables y enlaces.", hasImage: false, hasCta: false, hasCta2: false },
};

const SELECTABLE_TYPES = [
  "promo", "promotions_carousel", "best_sellers", "products_grid", "new_products", "categories",
  "category_showcase",
  "double_promo_banners",
  "goals", "trust", "blog", "reviews", "nutrition_advisory",
  "brands", "faq", "image_text", "video",
  "custom_simple", "custom_html",
];

const DEFAULT_SHOWCASE_ITEMS = [
  { categorySlug: "", customTitle: "Mundo Gluten Free", customImageUrl: "", backgroundColor: "#8F87F1", gradientColor: "#746AE8", useGradient: true,  textColor: "#FFFFFF", customUrl: "/categoria/gluten-free", isActive: true },
  { categorySlug: "", customTitle: "Mundo Orgánico",    customImageUrl: "", backgroundColor: "#FF914D", gradientColor: "#F47A2E", useGradient: true,  textColor: "#FFFFFF", customUrl: "/categoria/organico",    isActive: true },
  { categorySlug: "", customTitle: "Mundo Sin Azúcar",  customImageUrl: "", backgroundColor: "#63D9C6", gradientColor: "#3FBFAB", useGradient: true,  textColor: "#FFFFFF", customUrl: "/categoria/sin-azucar",  isActive: true },
  { categorySlug: "", customTitle: "Mundo Vegano",      customImageUrl: "", backgroundColor: "#D9788E", gradientColor: "#C4596F", useGradient: true,  textColor: "#FFFFFF", customUrl: "/categoria/vegano",      isActive: true },
];

// Predefined Home sections — used by "Restore defaults".
const DEFAULT_BLOCKS: Array<Pick<Block, "block_key" | "block_type" | "sort_order" | "title" | "is_active"> & Partial<Block>> = [
  { block_key: "hero",                 block_type: "hero",                 sort_order: 10, is_active: true,  title: "Hero" },
  { block_key: "goals",                block_type: "goals",                sort_order: 20, is_active: true,  title: "Comprar por objetivo" },
  { block_key: "best_sellers",         block_type: "best_sellers",         sort_order: 40, is_active: true,  title: "Best sellers" },
  { block_key: "promo",                block_type: "promo",                sort_order: 60, is_active: true,  title: "Promo banner" },
  { block_key: "promotions_carousel",  block_type: "promotions_carousel",  sort_order: 90, is_active: true,  title: "Promociones para usted" },
  { block_key: "blog",                 block_type: "blog",                 sort_order: 93, is_active: true,  title: "Guías y consejos" },
  { block_key: "trust",                block_type: "trust",                sort_order: 94, is_active: true,  title: "Garantías" },
];

export default function AdminHomeBlocks() {
  const [allBlocks, setAllBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTrash, setShowTrash] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("home_blocks")
      .select("*")
      .order("sort_order")
      .order("created_at");
    setAllBlocks((data as Block[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const blocks = useMemo(() => allBlocks.filter((b) => !b.is_deleted), [allBlocks]);
  const trash  = useMemo(() => allBlocks.filter((b) =>  b.is_deleted), [allBlocks]);
  const visibleCount = blocks.filter((b) => b.is_active).length;

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

  const onDragEnd = async (e: any) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const reordered = arrayMove(blocks, oldIndex, newIndex);
    // Optimistic update
    setAllBlocks((prev) => {
      const trashRows = prev.filter((b) => b.is_deleted);
      const renumbered = reordered.map((b, i) => ({ ...b, sort_order: (i + 1) * 10 }));
      return [...renumbered, ...trashRows];
    });

    setSavingOrder(true);
    try {
      await Promise.all(
        reordered.map((b, i) =>
          supabase.from("home_blocks").update({ sort_order: (i + 1) * 10 }).eq("id", b.id),
        ),
      );
      toast.success("Orden actualizado correctamente");
    } catch (err: any) {
      toast.error(err.message || "No se pudo guardar el orden");
      load();
    } finally {
      setSavingOrder(false);
    }
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

  const softDelete = async (b: Block) => {
    const { error } = await supabase
      .from("home_blocks")
      .update({ is_deleted: true, is_active: false, deleted_at: new Date().toISOString() } as any)
      .eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sección enviada a la papelera");
    load();
  };

  const restoreFromTrash = async (b: Block) => {
    const maxOrder = blocks.reduce((m, x) => Math.max(m, x.sort_order), 0);
    const { error } = await supabase
      .from("home_blocks")
      .update({ is_deleted: false, deleted_at: null, sort_order: maxOrder + 10 } as any)
      .eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sección restaurada (oculta)");
    load();
  };

  const hardDelete = async (b: Block) => {
    const { error } = await supabase.from("home_blocks").delete().eq("id", b.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Sección eliminada definitivamente");
    load();
  };

  const addSection = async (type: string) => {
    if (!type || !TYPE_LABELS[type]) { toast.error("Tipo de sección inválido"); return; }
    const meta = TYPE_LABELS[type];
    const suffix = Math.random().toString(36).slice(2, 7);
    const newKey = `${type}-${suffix}`;
    const maxOrder = blocks.reduce((m, x) => Math.max(m, x.sort_order), 0);
    const defaultSettings: Record<string, any> =
      type === "category_showcase"
        ? {
            layout: "grid",
            desktopColumns: 4,
            tabletColumns: 2,
            mobileLayout: "carousel",
            showButton: false,
            buttonText: "Ver todas las categorías",
            buttonUrl: "/categorias",
            backgroundColor: "",
            spacingTop: 60,
            spacingBottom: 60,
            selectionMode: "manual",
            autoLimit: 4,
            animations: true,
            items: DEFAULT_SHOWCASE_ITEMS,
          }
        : type === "double_promo_banners"
        ? {
            containerWidth: "normal",
            backgroundColor: "",
            spacingTop: 40,
            spacingBottom: 40,
            rounded: true,
            shadow: true,
            hoverEffect: true,
            aspectRatio: "16/7",
            banners: [
              { id: "banner_1", uploaded_image_url: "", custom_image_url: "", link_url: "", alt_text: "Promoción especial 1", open_new_tab: false, is_active: true, sort_order: 1 },
              { id: "banner_2", uploaded_image_url: "", custom_image_url: "", link_url: "", alt_text: "Promoción especial 2", open_new_tab: false, is_active: true, sort_order: 2 },
            ],
          }
        : {};
    const { error } = await supabase.from("home_blocks").insert({
      block_key: newKey,
      block_type: type,
      sort_order: maxOrder + 10,
      is_active: false,
      title: type === "category_showcase" ? "NUESTRAS CATEGORÍAS" : meta.name,
      settings: defaultSettings,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Sección "${meta.name}" añadida (oculta). Edítala y actívala cuando esté lista.`);
    load();
  };

  const restoreDefaults = async () => {
    const existingKeys = new Set(allBlocks.map((b) => b.block_key));
    const missing = DEFAULT_BLOCKS.filter((d) => !existingKeys.has(d.block_key));
    if (missing.length === 0) {
      toast.info("Todas las secciones predeterminadas ya existen");
      return;
    }
    const rows = missing.map((d) => ({
      block_key: d.block_key,
      block_type: d.block_type,
      sort_order: d.sort_order,
      is_active: d.is_active ?? false,
      title: d.title ?? null,
      settings: {},
    }));
    const { error } = await supabase.from("home_blocks").insert(rows as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`Restauradas ${missing.length} sección(es) predeterminadas`);
    load();
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Home page sections</h1>
          <p className="text-muted-foreground">
            Arrastra para reordenar, oculta/muestra, edita, duplica o elimina cada sección del home.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <AddSectionDialog onAdd={addSection} />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1"><RotateCcw size={14} /> Restaurar predeterminadas</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Restaurar secciones predeterminadas?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esto volverá a crear las secciones base del Home si fueron eliminadas. No afectará las secciones personalizadas existentes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={restoreDefaults}>Restaurar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant={showTrash ? "dark" : "outline"} size="sm" className="gap-1" onClick={() => setShowTrash((v) => !v)}>
            <Archive size={14} /> Papelera ({trash.length})
          </Button>
        </div>
      </div>

      {savingOrder && <p className="text-xs text-muted-foreground">Guardando orden…</p>}
      {!loading && visibleCount === 0 && !showTrash && (
        <div className="rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          No hay secciones visibles en el Home. Agrega o activa una sección para mostrar contenido.
        </div>
      )}

      {showTrash && (
        <TrashList items={trash} onRestore={restoreFromTrash} onHardDelete={hardDelete} />
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {blocks.map((b, i) => (
                <SortableBlockCard
                  key={b.id}
                  block={b}
                  isFirst={i === 0}
                  isLast={i === blocks.length - 1}
                  position={i + 1}
                  onChanged={load}
                  onMoveUp={() => move(b.id, -1)}
                  onMoveDown={() => move(b.id, 1)}
                  onDuplicate={() => duplicate(b)}
                  onDelete={() => softDelete(b)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function AddSectionDialog({ onAdd }: { onAdd: (type: string) => Promise<void> | void }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!type) { toast.error("Selecciona un tipo de sección"); return; }
    setBusy(true);
    try { await onAdd(type); setOpen(false); setType(""); }
    finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="dark" size="sm" className="gap-1"><Plus size={14} /> Agregar sección</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Agregar nueva sección al Home</DialogTitle>
          <DialogDescription>
            Elige un tipo de sección. Se creará oculta para que puedas editarla antes de mostrarla.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-2 overflow-auto sm:grid-cols-2">
          {SELECTABLE_TYPES.map((t) => {
            const meta = TYPE_LABELS[t];
            const active = type === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-md border p-3 text-left text-sm transition ${
                  active ? "border-accent bg-accent/5 ring-1 ring-accent" : "bg-background hover:border-foreground/40"
                }`}
              >
                <p className="font-semibold">{meta.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{meta.desc}</p>
              </button>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
          <Button variant="dark" onClick={handle} disabled={!type || busy}>
            {busy ? "Creando…" : "Crear sección"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrashList({
  items, onRestore, onHardDelete,
}: { items: Block[]; onRestore: (b: Block) => void; onHardDelete: (b: Block) => void }) {
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-4">
      <h2 className="mb-3 font-display text-lg">Papelera</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">La papelera está vacía.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((b) => {
            const meta = TYPE_LABELS[b.block_type] ?? { name: b.block_key, desc: "" };
            return (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded border bg-background px-3 py-2 text-sm">
                <div>
                  <p className="font-semibold">{b.title || meta.name}</p>
                  <p className="text-xs text-muted-foreground">{meta.name} · {b.block_key}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onRestore(b)} className="gap-1">
                    <RotateCcw size={14} /> Restaurar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" className="gap-1"><Trash2 size={14} /> Eliminar definitivamente</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar definitivamente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta sección se borrará para siempre. Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onHardDelete(b)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SortableBlockCard(props: {
  block: Block; isFirst: boolean; isLast: boolean; position: number;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.block.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : "auto" as any,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <BlockEditor {...props} dragHandle={{ attributes, listeners }} />
    </div>
  );
}

function BlockEditor({
  block, isFirst, isLast, position, onChanged, onMoveUp, onMoveDown, onDuplicate, onDelete, dragHandle,
}: {
  block: Block; isFirst: boolean; isLast: boolean; position: number;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
  onDuplicate: () => void; onDelete: () => void;
  dragHandle?: { attributes: any; listeners: any };
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
          {dragHandle && (
            <button
              type="button"
              className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
              aria-label="Arrastrar para reordenar"
              title="Arrastra para reordenar"
              {...dragHandle.attributes}
              {...dragHandle.listeners}
            >
              <GripVertical size={18} />
            </button>
          )}
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
                  Se creará una copia exacta de "{f.title || meta.name}" como <strong>oculta</strong>, al final del listado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDuplicate}>Duplicar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Eliminar sección" title="Eliminar sección" className="text-destructive hover:text-destructive">
                <Trash2 size={16} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar esta sección del Home?</AlertDialogTitle>
                <AlertDialogDescription>
                  La sección se enviará a la papelera. Podrás restaurarla desde ahí o eliminarla definitivamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>Eliminar sección</AlertDialogAction>
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
          {block.block_type !== "custom_html" && (
            <>
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
            </>
          )}

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

          {block.block_type === "custom_simple" && (
            <CustomSimpleSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "custom_html" && (
            <CustomHtmlSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "brands" && (
            <BrandsSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "faq" && (
            <FaqSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "image_text" && (
            <ImageTextSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "video" && (
            <VideoSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "new_products" && (
            <NewProductsSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "category_showcase" && (
            <CategoryShowcaseSettings
              settings={(f.settings ?? {}) as Record<string, any>}
              onChange={(next) => set("settings", { ...(f.settings ?? {}), ...next })}
            />
          )}

          {block.block_type === "double_promo_banners" && (
            <DoublePromoBannersSettings
              settings={(f.settings ?? {}) as Record<string, any>}
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

function CustomSimpleSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const align: "left" | "center" | "right" =
    ["left", "center", "right"].includes(settings.alignment) ? settings.alignment : "left";
  const bg = typeof settings.bg_color === "string" ? settings.bg_color : "";

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diseño de la sección personalizada</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Alineación</Label>
          <div className="mt-1 flex gap-1.5">
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => onChange({ alignment: a })}
                className={`h-9 flex-1 rounded-md border text-sm capitalize transition ${
                  align === a ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"
                }`}
              >
                {a === "left" ? "Izquierda" : a === "center" ? "Centro" : "Derecha"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Color de fondo (opcional)</Label>
          <div className="mt-1 flex gap-2">
            <Input type="color" value={bg || "#ffffff"} onChange={(e) => onChange({ bg_color: e.target.value })} className="h-9 w-16 p-1" />
            <Input value={bg} onChange={(e) => onChange({ bg_color: e.target.value })} placeholder="#ffffff o vacío" />
            {bg && <Button variant="ghost" size="sm" onClick={() => onChange({ bg_color: "" })}>Quitar</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomHtmlSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const html = typeof settings.html === "string" ? settings.html : "";
  const preview = useMemo(() => DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }), [html]);
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contenido HTML</p>
      <Textarea
        rows={8}
        value={html}
        onChange={(e) => onChange({ html: e.target.value })}
        placeholder={'<div class="text-center py-8"><h2>Mi sección</h2><p>Contenido libre</p></div>'}
        className="font-mono text-xs"
      />
      <p className="text-[11px] text-muted-foreground">
        El HTML se sanitiza automáticamente: se permiten etiquetas estándar pero se eliminan scripts y atributos peligrosos.
      </p>
      <div>
        <Label className="text-xs">Vista previa (sanitizada)</Label>
        <div className="mt-1 rounded border bg-background p-3 text-sm" dangerouslySetInnerHTML={{ __html: preview || '<span class="text-muted-foreground">Vacío</span>' }} />
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
  const perViewDesktopRaw = Number(settings.products_per_view_desktop ?? 4);
  const perViewDesktop = Math.min(6, Math.max(2, Number.isFinite(perViewDesktopRaw) ? perViewDesktopRaw : 4));

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

      <div className="grid gap-3 sm:grid-cols-2">
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
            0 = sin límite. Cantidad total de productos que cargará el carrusel.
          </p>
        </div>
        <div>
          <Label className="text-xs">Productos visibles en pantalla (escritorio)</Label>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {[2, 3, 4, 5, 6].map((n) => {
              const active = perViewDesktop === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange({ products_per_view_desktop: n })}
                  className={`h-9 w-10 rounded-md border text-sm font-semibold transition ${
                    active ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Tarjetas visibles a la vez en escritorio. Tablet: máx. 3 · Móvil: 1.
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
  ids, promos, onReorder, onRemove,
}: {
  ids: string[]; promos: PromotionRow[];
  onReorder: (next: string[]) => void; onRemove: (id: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
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

// ============== Phase 2 settings editors ==============

type BrandLogo = { url: string; alt?: string; href?: string };

function BrandsSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const logos: BrandLogo[] = Array.isArray(settings.logos) ? settings.logos : [];
  const columnsRaw = Number(settings.columns ?? 5);
  const columns = Math.min(8, Math.max(2, Number.isFinite(columnsRaw) ? columnsRaw : 5));
  const grayscale = settings.grayscale !== false;

  const update = (next: BrandLogo[]) => onChange({ logos: next });
  const addRow = () => update([...logos, { url: "", alt: "", href: "" }]);
  const removeRow = (i: number) => update(logos.filter((_, idx) => idx !== i));
  const editRow = (i: number, patch: Partial<BrandLogo>) =>
    update(logos.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= logos.length) return;
    const arr = [...logos];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    update(arr);
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Logos de marcas
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Columnas (en escritorio)</Label>
          <div className="mt-1 flex gap-1.5">
            {[2,3,4,5,6,7,8].map((n) => (
              <button key={n} type="button"
                onClick={() => onChange({ columns: n })}
                className={`h-9 flex-1 rounded-md border text-sm transition ${columns === n ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"}`}>{n}</button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
            <Switch checked={grayscale} onCheckedChange={(v) => onChange({ grayscale: v })} />
            <span>Logos en escala de grises (color al pasar el mouse)</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {logos.length === 0 && (
          <p className="text-xs text-muted-foreground">Aún no hay logos. Agrega el primero.</p>
        )}
        {logos.map((l, i) => (
          <div key={i} className="grid gap-2 rounded-md border bg-background p-2 sm:grid-cols-[64px,1fr,1fr,1fr,auto] sm:items-center">
            <div className="grid h-16 w-16 place-items-center overflow-hidden rounded border bg-muted">
              {l.url ? <img src={l.url} alt={l.alt || ""} className="max-h-full max-w-full object-contain" /> : <ImageIcon size={20} className="text-muted-foreground" />}
            </div>
            <Input placeholder="URL del logo" value={l.url} onChange={(e) => editRow(i, { url: e.target.value })} />
            <Input placeholder="Alt / nombre marca" value={l.alt || ""} onChange={(e) => editRow(i, { alt: e.target.value })} />
            <Input placeholder="Enlace (opcional)" value={l.href || ""} onChange={(e) => editRow(i, { href: e.target.value })} />
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="icon" onClick={() => moveRow(i, -1)} aria-label="Subir"><ArrowUp size={14} /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => moveRow(i, 1)} aria-label="Bajar"><ArrowDown size={14} /></Button>
              <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} aria-label="Quitar"><Trash2 size={14} /></Button>
            </div>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
          <Plus size={14} /> Agregar logo
        </Button>
      </div>
    </div>
  );
}

type FaqItem = { q: string; a: string };

function FaqSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const items: FaqItem[] = Array.isArray(settings.items) ? settings.items : [];
  const update = (next: FaqItem[]) => onChange({ items: next });
  const addRow = () => update([...items, { q: "", a: "" }]);
  const removeRow = (i: number) => update(items.filter((_, idx) => idx !== i));
  const editRow = (i: number, patch: Partial<FaqItem>) =>
    update(items.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const moveRow = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const arr = [...items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    update(arr);
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Preguntas y respuestas
      </p>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Aún no hay preguntas. Agrega la primera.</p>
        )}
        {items.map((it, i) => (
          <div key={i} className="space-y-2 rounded-md border bg-background p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
              <Input placeholder="Pregunta" value={it.q} onChange={(e) => editRow(i, { q: e.target.value })} />
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="icon" onClick={() => moveRow(i, -1)} aria-label="Subir"><ArrowUp size={14} /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => moveRow(i, 1)} aria-label="Bajar"><ArrowDown size={14} /></Button>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(i)} aria-label="Quitar"><Trash2 size={14} /></Button>
              </div>
            </div>
            <Textarea rows={3} placeholder="Respuesta" value={it.a} onChange={(e) => editRow(i, { a: e.target.value })} />
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addRow}>
          <Plus size={14} /> Agregar pregunta
        </Button>
      </div>
    </div>
  );
}

function ImageTextSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const side: "left" | "right" = settings.image_side === "right" ? "right" : "left";
  const bg = typeof settings.bg_color === "string" ? settings.bg_color : "";
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Diseño Imagen + Texto
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Posición de la imagen</Label>
          <div className="mt-1 flex gap-1.5">
            {(["left","right"] as const).map((s) => (
              <button key={s} type="button" onClick={() => onChange({ image_side: s })}
                className={`h-9 flex-1 rounded-md border text-sm transition ${side === s ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"}`}>
                {s === "left" ? "Izquierda" : "Derecha"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Color de fondo (opcional)</Label>
          <div className="mt-1 flex gap-2">
            <Input type="color" value={bg || "#ffffff"} onChange={(e) => onChange({ bg_color: e.target.value })} className="h-9 w-16 p-1" />
            <Input value={bg} onChange={(e) => onChange({ bg_color: e.target.value })} placeholder="#ffffff o vacío" />
            {bg && <Button variant="ghost" size="sm" onClick={() => onChange({ bg_color: "" })}>Quitar</Button>}
          </div>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Usa los campos generales (Eyebrow, Título, Subtítulo, Imagen y Botones) de arriba para el contenido.
      </p>
    </div>
  );
}

function VideoSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const url = typeof settings.video_url === "string" ? settings.video_url : "";
  const autoplay = !!settings.autoplay;
  const muted = settings.muted !== false;
  const loop = !!settings.loop;
  const cover = typeof settings.cover_image === "string" ? settings.cover_image : "";
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Video</p>
      <div>
        <Label className="text-xs">URL del video (YouTube, Vimeo o MP4)</Label>
        <Input value={url} onChange={(e) => onChange({ video_url: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=... o https://.../video.mp4" />
      </div>
      <div>
        <Label className="text-xs">Imagen de portada (opcional, para MP4)</Label>
        <Input value={cover} onChange={(e) => onChange({ cover_image: e.target.value })} placeholder="https://..." />
      </div>
      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm"><Switch checked={autoplay} onCheckedChange={(v) => onChange({ autoplay: v })} /> Autoplay</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={muted} onCheckedChange={(v) => onChange({ muted: v })} /> Silenciado</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={loop} onCheckedChange={(v) => onChange({ loop: v })} /> Repetir en bucle</label>
      </div>
    </div>
  );
}

function NewProductsSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const limitRaw = Number(settings.limit ?? 8);
  const limit = Math.min(24, Math.max(2, Number.isFinite(limitRaw) ? limitRaw : 8));
  const colsRaw = Number(settings.columns ?? 4);
  const columns = Math.min(6, Math.max(2, Number.isFinite(colsRaw) ? colsRaw : 4));
  const useBadge = settings.use_badge !== false;
  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Productos nuevos</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Cantidad a mostrar</Label>
          <Input type="number" min={2} max={24} value={limit}
            onChange={(e) => onChange({ limit: Math.max(2, Math.min(24, Number(e.target.value) || 8)) })} />
        </div>
        <div>
          <Label className="text-xs">Columnas (escritorio)</Label>
          <div className="mt-1 flex gap-1.5">
            {[2,3,4,5,6].map((n) => (
              <button key={n} type="button"
                onClick={() => onChange({ columns: n })}
                className={`h-9 flex-1 rounded-md border text-sm transition ${columns === n ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"}`}>{n}</button>
            ))}
          </div>
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch checked={useBadge} onCheckedChange={(v) => onChange({ use_badge: v })} />
        <span>Priorizar productos con badge "New"; si no hay suficientes, completar con los más recientes.</span>
      </label>
    </div>
  );
}

// ============== Category Showcase (Nuestras Categorías) ==============

type CategoryLite = { id: string; name: string; slug: string; image_url: string | null };
type ShowcaseItem = {
  id?: string;
  categorySlug?: string;
  customTitle?: string;
  customImageUrl?: string; // legacy
  custom_image_url?: string;
  uploaded_image_url?: string;
  backgroundColor?: string;
  gradientColor?: string;
  useGradient?: boolean;
  textColor?: string;
  customUrl?: string;
  isActive?: boolean;
};

function CategoryShowcaseSettings({
  settings, onChange,
}: { settings: Record<string, any>; onChange: (next: Record<string, any>) => void }) {
  const [cats, setCats] = useState<CategoryLite[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("categories")
        .select("id,name,slug,image_url")
        .eq("type", "product")
        .eq("is_active", true)
        .order("sort_order").order("name");
      setCats((data as CategoryLite[]) ?? []);
    })();
  }, []);

  const items: ShowcaseItem[] = Array.isArray(settings.items) ? settings.items : [];
  const selectionMode: "manual" | "auto" =
    settings.selectionMode === "auto" ? "auto" : "manual";
  const desktopColumns = Math.min(6, Math.max(3, Number(settings.desktopColumns ?? 4) || 4));
  const mobileLayout: "grid" | "carousel" =
    settings.mobileLayout === "grid" ? "grid" : "carousel";
  const showButton = !!settings.showButton;
  const autoLimit = Math.min(12, Math.max(2, Number(settings.autoLimit ?? 4) || 4));
  const bg = typeof settings.backgroundColor === "string" ? settings.backgroundColor : "";

  const updateItems = (next: ShowcaseItem[]) => onChange({ items: next });
  const addItem = () =>
    updateItems([
      ...items,
      { customTitle: "Nueva categoría", backgroundColor: "#8F87F1", gradientColor: "#746AE8", useGradient: true, textColor: "#FFFFFF", isActive: true },
    ]);
  const removeItem = (i: number) => updateItems(items.filter((_, idx) => idx !== i));
  const duplicateItem = (i: number) =>
    updateItems([...items.slice(0, i + 1), { ...items[i] }, ...items.slice(i + 1)]);
  const editItem = (i: number, patch: Partial<ShowcaseItem>) =>
    updateItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const arr = [...items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    updateItems(arr);
  };

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Diseño Nuestras Categorías
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Columnas en escritorio</Label>
          <div className="mt-1 flex gap-1.5">
            {[3, 4, 5, 6].map((n) => (
              <button key={n} type="button" onClick={() => onChange({ desktopColumns: n })}
                className={`h-9 flex-1 rounded-md border text-sm transition ${desktopColumns === n ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs">Móvil</Label>
          <div className="mt-1 flex gap-1.5">
            {(["carousel", "grid"] as const).map((m) => (
              <button key={m} type="button" onClick={() => onChange({ mobileLayout: m })}
                className={`h-9 flex-1 rounded-md border text-sm transition ${mobileLayout === m ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"}`}>
                {m === "carousel" ? "Carrusel" : "Grilla"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Espacio superior (px)</Label>
          <Input type="number" min={0} max={200} value={Number(settings.spacingTop ?? 60)}
            onChange={(e) => onChange({ spacingTop: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
        </div>
        <div>
          <Label className="text-xs">Espacio inferior (px)</Label>
          <Input type="number" min={0} max={200} value={Number(settings.spacingBottom ?? 60)}
            onChange={(e) => onChange({ spacingBottom: Math.max(0, Math.min(200, Number(e.target.value) || 0)) })} />
        </div>
        <div>
          <Label className="text-xs">Color de fondo de la sección</Label>
          <div className="mt-1 flex gap-2">
            <Input type="color" value={bg || "#ffffff"} onChange={(e) => onChange({ backgroundColor: e.target.value })} className="h-9 w-16 p-1" />
            <Input value={bg} onChange={(e) => onChange({ backgroundColor: e.target.value })} placeholder="vacío" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-md border bg-background p-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={!!settings.animations} onCheckedChange={(v) => onChange({ animations: v })} />
          <span>Animaciones hover</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={showButton} onCheckedChange={(v) => onChange({ showButton: v })} />
          <span>Mostrar botón "Ver todas las categorías"</span>
        </label>
        {showButton && (
          <>
            <Input className="max-w-[220px]" placeholder="Texto del botón"
              value={String(settings.buttonText ?? "")}
              onChange={(e) => onChange({ buttonText: e.target.value })} />
            <Input className="max-w-[260px]" placeholder="URL del botón"
              value={String(settings.buttonUrl ?? "")}
              onChange={(e) => onChange({ buttonUrl: e.target.value })} />
          </>
        )}
      </div>

      <div className="rounded-md border bg-background p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Label className="text-xs font-semibold uppercase tracking-wide">Modo de selección</Label>
          <div className="flex gap-1.5">
            {(["manual", "auto"] as const).map((m) => (
              <button key={m} type="button" onClick={() => onChange({ selectionMode: m })}
                className={`h-8 rounded-md border px-3 text-sm transition ${selectionMode === m ? "border-accent bg-accent text-accent-foreground" : "bg-background hover:border-foreground/40"}`}>
                {m === "manual" ? "Manual" : "Automático"}
              </button>
            ))}
          </div>
          {selectionMode === "auto" && (
            <div className="flex items-center gap-2">
              <Label className="text-xs">Cantidad</Label>
              <Input type="number" min={2} max={12} className="w-20" value={autoLimit}
                onChange={(e) => onChange({ autoLimit: Math.max(2, Math.min(12, Number(e.target.value) || 4)) })} />
            </div>
          )}
        </div>
        {selectionMode === "auto" && (
          <p className="text-xs text-muted-foreground">
            Se mostrarán las primeras {autoLimit} categorías activas (por orden). Las tarjetas usarán los colores predeterminados.
          </p>
        )}
      </div>

      {selectionMode === "manual" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tarjetas ({items.length})
            </p>
            <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
              <Plus size={14} /> Agregar tarjeta
            </Button>
          </div>

          {items.length === 0 && (
            <p className="text-xs text-muted-foreground">Aún no hay tarjetas. Agrega la primera.</p>
          )}

          {items.map((it, i) => {
            const bgColor = it.backgroundColor || "#8F87F1";
            const grad = it.useGradient ? (it.gradientColor || bgColor) : bgColor;
            return (
              <div key={i} className="rounded-md border bg-background p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                  <div className="h-8 w-12 rounded border" style={{ background: `linear-gradient(135deg, ${bgColor}, ${grad})` }} />
                  <Input className="flex-1" placeholder="Nombre visible (ej. Mundo Gluten Free)"
                    value={it.customTitle ?? ""} onChange={(e) => editItem(i, { customTitle: e.target.value })} />
                  <label className="flex items-center gap-1.5 text-xs">
                    <Switch checked={it.isActive !== false} onCheckedChange={(v) => editItem(i, { isActive: v })} />
                    <span>Activa</span>
                  </label>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(i, -1)} aria-label="Subir"><ArrowUp size={14} /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => moveItem(i, 1)} aria-label="Bajar"><ArrowDown size={14} /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => duplicateItem(i)} aria-label="Duplicar"><Copy size={14} /></Button>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(i)} aria-label="Quitar"><Trash2 size={14} /></Button>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <Label className="text-xs">Categoría asociada</Label>
                    <select
                      value={it.categorySlug ?? ""}
                      onChange={(e) => editItem(i, { categorySlug: e.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">— Sin categoría —</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs">URL personalizada (opcional)</Label>
                    <Input placeholder="/categoria/gluten-free"
                      value={it.customUrl ?? ""} onChange={(e) => editItem(i, { customUrl: e.target.value })} />
                  </div>
                </div>

                <ShowcaseImageField
                  item={it}
                  onChange={(patch) => editItem(i, patch)}
                />


                <div className="grid gap-2 sm:grid-cols-4">
                  <div>
                    <Label className="text-xs">Color fondo</Label>
                    <div className="mt-1 flex gap-1">
                      <Input type="color" value={it.backgroundColor || "#8F87F1"} onChange={(e) => editItem(i, { backgroundColor: e.target.value })} className="h-9 w-12 p-1" />
                      <Input value={it.backgroundColor ?? ""} onChange={(e) => editItem(i, { backgroundColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Color degradado</Label>
                    <div className="mt-1 flex gap-1">
                      <Input type="color" value={it.gradientColor || "#746AE8"} onChange={(e) => editItem(i, { gradientColor: e.target.value })} className="h-9 w-12 p-1" />
                      <Input value={it.gradientColor ?? ""} onChange={(e) => editItem(i, { gradientColor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Color texto</Label>
                    <div className="mt-1 flex gap-1">
                      <Input type="color" value={it.textColor || "#FFFFFF"} onChange={(e) => editItem(i, { textColor: e.target.value })} className="h-9 w-12 p-1" />
                      <Input value={it.textColor ?? ""} onChange={(e) => editItem(i, { textColor: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch checked={!!it.useGradient} onCheckedChange={(v) => editItem(i, { useGradient: v })} />
                      <span>Degradado</span>
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ShowcaseImageField({
  item,
  onChange,
}: {
  item: ShowcaseItem;
  onChange: (patch: Partial<ShowcaseItem>) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploaded = item.uploaded_image_url?.trim() || "";
  const manual =
    item.custom_image_url?.trim() ||
    item.customImageUrl?.trim() ||
    "";
  const preview = uploaded || manual;

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `category-showcase/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("blog-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      onChange({ uploaded_image_url: data.publicUrl });
      toast.success("Imagen subida");
    } catch (e: any) {
      toast.error(e?.message || "Error al subir la imagen");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Imagen personalizada (opcional)</Label>
      <div className="flex items-start gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted/30 grid place-items-center">
          {preview ? (
            <img
              src={preview}
              alt="preview"
              className="h-full w-full object-contain"
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.2")}
            />
          ) : (
            <span className="text-[10px] text-muted-foreground">Sin imagen</span>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Subiendo…" : uploaded ? "Cambiar imagen" : "Subir imagen"}
            </Button>
            {(uploaded || manual) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  onChange({
                    uploaded_image_url: "",
                    custom_image_url: "",
                    customImageUrl: "",
                  })
                }
              >
                Eliminar imagen
              </Button>
            )}
          </div>
          <Input
            placeholder="O pega una URL de imagen"
            value={manual}
            onChange={(e) =>
              onChange({ custom_image_url: e.target.value, customImageUrl: e.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}

