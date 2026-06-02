import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Loader2, Search, X, Check, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  promoLabel, promoTitle, VARIANT_LABELS,
  type PromotionBenefitType, type PromotionVariant,
} from "@/lib/promotions";
import { invalidatePromotionsCache } from "@/hooks/usePromotions";

type Row = {
  id: string;
  name: string;
  benefit_type: PromotionBenefitType;
  variant: PromotionVariant;
  discount_percent: number;
  discount_amount: number;
  min_quantity: number;
  priority: number;
  badge_label: string | null;
  benefit_message: string | null;
  cart_msg_applied: string | null;
  cart_msg_progress: string | null;
  start_date: string | null;
  end_date: string | null;
  usage_limit_per_order: number;
  show_on_home: boolean;
  show_on_product: boolean;
  show_in_carousel: boolean;
  sort_order_home: number;
  is_active: boolean;
  product_ids: string[];
};

type ProductLite = { id: string; name: string; price: number; main_image: string | null };

const PRESET_PCTS = [25, 30, 40, 50, 70];

const VARIANT_OPTIONS: { value: PromotionVariant; title: string; desc: string }[] = [
  { value: "second_discount", title: "2do con descuento", desc: "Compra 1 y lleva el 2do con un % menos." },
  { value: "second_free",     title: "Segundo gratis (2x1)", desc: "El producto de menor precio queda 100% gratis." },
  { value: "two_for_one",     title: "2x1", desc: "Llévate 2 y paga 1. Alias visual de 'Segundo gratis'." },
  { value: "percent_off",     title: "Descuento %", desc: "Aplica un % directo a cada unidad participante." },
  { value: "fixed_off",       title: "Descuento fijo", desc: "Aplica un monto fijo a cada unidad participante." },
  { value: "quantity_discount", title: "Por cantidad", desc: "Activa un % al llegar a una cantidad mínima." },
  { value: "custom",          title: "Personalizada", desc: "Solo visual: no calcula descuento automático." },
];

// benefit_type del enum BD debe seguir siendo válido (second_discount o second_free)
const toEnum = (v: PromotionVariant): PromotionBenefitType =>
  (v === "second_free" || v === "two_for_one") ? "second_free" : "second_discount";

const emptyForm = (): Row => ({
  id: "",
  name: "",
  benefit_type: "second_discount",
  variant: "second_discount",
  discount_percent: 50,
  discount_amount: 0,
  min_quantity: 2,
  priority: 0,
  badge_label: null,
  benefit_message: null,
  cart_msg_applied: null,
  cart_msg_progress: null,
  start_date: null,
  end_date: null,
  usage_limit_per_order: 1,
  show_on_home: true,
  show_on_product: true,
  show_in_carousel: true,
  sort_order_home: 0,
  is_active: true,
  product_ids: [],
});

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 16) : "");
const fromDateInput = (s: string) => (s ? new Date(s).toISOString() : null);

const AdminPromotions = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [customPct, setCustomPct] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [{ data: promos }, { data: links }, { data: prods }] = await Promise.all([
      (supabase as any).from("promotions").select("*")
        .order("priority", { ascending: false })
        .order("sort_order_home", { ascending: true })
        .order("created_at", { ascending: false }),
      (supabase as any).from("promotion_products").select("promotion_id, product_id"),
      supabase.from("products").select("id, name, price, main_image").order("name"),
    ]);
    const byPromo = new Map<string, string[]>();
    (links ?? []).forEach((l: any) => {
      const arr = byPromo.get(l.promotion_id) ?? [];
      arr.push(l.product_id);
      byPromo.set(l.promotion_id, arr);
    });
    setRows(
      (promos ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        benefit_type: p.benefit_type,
        variant: (p.variant as PromotionVariant) || (p.benefit_type as PromotionVariant) || "second_discount",
        discount_percent: Number(p.discount_percent ?? 0),
        discount_amount: Number(p.discount_amount ?? 0),
        min_quantity: Number(p.min_quantity ?? 2),
        priority: Number(p.priority ?? 0),
        badge_label: p.badge_label ?? null,
        benefit_message: p.benefit_message ?? null,
        cart_msg_applied: p.cart_msg_applied ?? null,
        cart_msg_progress: p.cart_msg_progress ?? null,
        start_date: p.start_date,
        end_date: p.end_date,
        usage_limit_per_order: Number(p.usage_limit_per_order ?? 1),
        show_on_home: !!p.show_on_home,
        show_on_product: !!p.show_on_product,
        show_in_carousel: p.show_in_carousel == null ? true : !!p.show_in_carousel,
        sort_order_home: Number(p.sort_order_home ?? 0),
        is_active: !!p.is_active,
        product_ids: byPromo.get(p.id) ?? [],
      })),
    );
    setProducts(
      (prods ?? []).map((p: any) => ({
        id: p.id, name: p.name, price: Number(p.price ?? 0), main_image: p.main_image,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const openCreate = () => {
    setEditing(emptyForm());
    setCustomPct(false);
    setProductSearch("");
    setDialogOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditing(row);
    setCustomPct(!PRESET_PCTS.includes(Math.round(row.discount_percent)));
    setProductSearch("");
    setDialogOpen(true);
  };

  const buildPayload = (e: Row) => ({
    name: e.name.trim(),
    benefit_type: toEnum(e.variant),
    variant: e.variant,
    discount_percent: (e.variant === "second_free" || e.variant === "two_for_one")
      ? 100 : Number(e.discount_percent) || 0,
    discount_amount: Number(e.discount_amount) || 0,
    min_quantity: Math.max(1, Number(e.min_quantity) || 2),
    priority: Number(e.priority) || 0,
    badge_label: e.badge_label?.trim() || null,
    benefit_message: e.benefit_message?.trim() || null,
    cart_msg_applied: e.cart_msg_applied?.trim() || null,
    cart_msg_progress: e.cart_msg_progress?.trim() || null,
    start_date: e.start_date,
    end_date: e.end_date,
    usage_limit_per_order: Math.max(0, Number(e.usage_limit_per_order) || 0),
    show_on_home: e.show_on_home,
    show_on_product: e.show_on_product,
    show_in_carousel: e.show_in_carousel,
    sort_order_home: Number(e.sort_order_home) || 0,
    is_active: e.is_active,
  });

  const save = async () => {
    if (!editing.name.trim()) return toast.error("Falta el nombre de la promoción");
    if (editing.product_ids.length === 0) return toast.error("Selecciona al menos un producto participante");
    setSaving(true);
    try {
      const payload = buildPayload(editing);
      let promoId = editing.id;
      if (promoId) {
        const { error } = await (supabase as any).from("promotions").update(payload).eq("id", promoId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from("promotions").insert(payload).select("id").single();
        if (error) throw error;
        promoId = data.id;
      }
      await (supabase as any).from("promotion_products").delete().eq("promotion_id", promoId);
      if (editing.product_ids.length) {
        const links = editing.product_ids.map((pid) => ({ promotion_id: promoId, product_id: pid }));
        const { error: lErr } = await (supabase as any).from("promotion_products").insert(links);
        if (lErr) throw lErr;
      }
      toast.success("Promoción guardada");
      setDialogOpen(false);
      await invalidatePromotionsCache();
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (row: Row) => {
    try {
      const payload = {
        ...buildPayload(row),
        name: `Copia de ${row.name}`,
        is_active: false,
      };
      const { data, error } = await (supabase as any)
        .from("promotions").insert(payload).select("id").single();
      if (error) throw error;
      if (row.product_ids.length) {
        const links = row.product_ids.map((pid) => ({ promotion_id: data.id, product_id: pid }));
        await (supabase as any).from("promotion_products").insert(links);
      }
      toast.success("Promoción duplicada (creada como inactiva).");
      await invalidatePromotionsCache();
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo duplicar");
    }
  };

  const remove = async (row: Row) => {
    const { error } = await (supabase as any).from("promotions").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Promoción eliminada");
    await invalidatePromotionsCache();
    await loadAll();
  };

  const toggleActive = async (row: Row) => {
    const { error } = await (supabase as any).from("promotions").update({ is_active: !row.is_active }).eq("id", row.id);
    if (error) return toast.error(error.message);
    await invalidatePromotionsCache();
    await loadAll();
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const toggleProduct = (id: string) => {
    setEditing((e) => ({
      ...e,
      product_ids: e.product_ids.includes(id)
        ? e.product_ids.filter((x) => x !== id)
        : [...e.product_ids, id],
    }));
  };

  const v = editing.variant;
  const needsPct = v === "second_discount" || v === "percent_off" || v === "quantity_discount";
  const needsFixed = v === "fixed_off";
  const needsMinQty = v === "quantity_discount";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Promociones</h1>
          <p className="text-sm text-muted-foreground">
            Crea, duplica y ordena promociones. Aparecen en el carrusel "Promociones para usted" del Home.
          </p>
        </div>
        <Button onClick={openCreate} variant="accent" className="gap-2">
          <Plus size={16} /> Nueva promoción
        </Button>
      </div>

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-muted-foreground">
            <Loader2 size={16} className="animate-spin" /> Cargando…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No hay promociones creadas. Crea la primera para empezar.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{r.name}</p>
                    <Badge variant="secondary" className="text-[10px] uppercase">{promoLabel(r)}</Badge>
                    {!r.is_active && <Badge variant="outline" className="text-[10px] uppercase">Inactiva</Badge>}
                    {!r.show_in_carousel && <Badge variant="outline" className="text-[10px] uppercase">Fuera del carrusel</Badge>}
                    <Badge variant="outline" className="text-[10px]">Prio {r.priority}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {promoTitle(r)} · {r.product_ids.length} productos
                    {r.start_date || r.end_date
                      ? ` · ${r.start_date ? new Date(r.start_date).toLocaleDateString() : "—"} → ${
                          r.end_date ? new Date(r.end_date).toLocaleDateString() : "sin fin"
                        }`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(r)} aria-label="Editar">
                    <Pencil size={14} />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label="Duplicar"><Copy size={14} /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Duplicar esta promoción?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Se creará "Copia de {r.name}" como <strong>inactiva</strong>, con los mismos productos y reglas.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => duplicate(r)}>Duplicar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="text-destructive" aria-label="Eliminar">
                        <Trash2 size={14} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar "{r.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(r)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Editar promoción" : "Nueva promoción"}</DialogTitle>
            <DialogDescription>
              Configura el tipo, productos participantes, vigencia y textos visibles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label>Nombre de la promoción</Label>
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                placeholder="Ej. Promociones de la semana"
              />
            </div>

            <div>
              <Label>Tipo de promoción</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {VARIANT_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setEditing({
                      ...editing,
                      variant: opt.value,
                      discount_percent: opt.value === "second_free" || opt.value === "two_for_one" ? 100 : editing.discount_percent,
                    })}
                    className={`rounded-lg border-2 p-3 text-left text-sm transition-all ${
                      editing.variant === opt.value
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <p className="font-semibold">{opt.title}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {needsPct && (
              <div>
                <Label>Porcentaje de descuento</Label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {PRESET_PCTS.map((p) => (
                    <Button
                      key={p}
                      type="button"
                      size="sm"
                      variant={!customPct && Math.round(editing.discount_percent) === p ? "dark" : "outline"}
                      onClick={() => { setCustomPct(false); setEditing({ ...editing, discount_percent: p }); }}
                    >
                      {p}%
                    </Button>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant={customPct ? "dark" : "outline"}
                    onClick={() => setCustomPct(true)}
                  >
                    Personalizado
                  </Button>
                  {customPct && (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min={1} max={99} className="w-24"
                        value={editing.discount_percent}
                        onChange={(e) => setEditing({ ...editing, discount_percent: Number(e.target.value) || 0 })}
                      />
                      <span className="text-sm text-muted-foreground">%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {needsFixed && (
              <div>
                <Label>Monto fijo de descuento (S/)</Label>
                <Input
                  type="number" min={0} step="0.01"
                  value={editing.discount_amount}
                  onChange={(e) => setEditing({ ...editing, discount_amount: Number(e.target.value) || 0 })}
                />
              </div>
            )}

            {needsMinQty && (
              <div>
                <Label>Cantidad mínima para activar</Label>
                <Input
                  type="number" min={1}
                  value={editing.min_quantity}
                  onChange={(e) => setEditing({ ...editing, min_quantity: Number(e.target.value) || 2 })}
                />
              </div>
            )}

            <div className="grid gap-3 rounded-md border bg-muted/30 p-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Etiqueta visible (badge)</Label>
                <Input
                  value={editing.badge_label ?? ""}
                  onChange={(e) => setEditing({ ...editing, badge_label: e.target.value })}
                  placeholder='Ej. "2x1", "-30%", "PROMO"'
                />
              </div>
              <div>
                <Label className="text-xs">Prioridad</Label>
                <Input
                  type="number"
                  value={editing.priority}
                  onChange={(e) => setEditing({ ...editing, priority: Number(e.target.value) || 0 })}
                  placeholder="Mayor número gana cuando hay conflicto"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Mensaje comercial (subtítulo en la tarjeta)</Label>
                <Textarea
                  rows={2}
                  value={editing.benefit_message ?? ""}
                  onChange={(e) => setEditing({ ...editing, benefit_message: e.target.value })}
                  placeholder="Ej. Aprovecha estas ofertas especiales por tiempo limitado."
                />
              </div>
              <div>
                <Label className="text-xs">Mensaje en carrito (aplicada)</Label>
                <Input
                  value={editing.cart_msg_applied ?? ""}
                  onChange={(e) => setEditing({ ...editing, cart_msg_applied: e.target.value })}
                  placeholder='Ej. "Promoción aplicada: 2do con 50% off"'
                />
              </div>
              <div>
                <Label className="text-xs">Mensaje en carrito (falta {"{n}"} para activar)</Label>
                <Input
                  value={editing.cart_msg_progress ?? ""}
                  onChange={(e) => setEditing({ ...editing, cart_msg_progress: e.target.value })}
                  placeholder='Ej. "Agrega {n} más para activar"'
                />
              </div>
            </div>

            <div>
              <Label>Productos participantes ({editing.product_ids.length} seleccionados)</Label>
              {editing.product_ids.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {editing.product_ids.map((id) => {
                    const p = productById.get(id);
                    if (!p) return null;
                    return (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {p.name}
                        <button type="button" onClick={() => toggleProduct(id)}
                          className="ml-1 rounded hover:bg-background" aria-label={`Quitar ${p.name}`}>
                          <X size={12} />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
              <div className="relative mt-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Buscar producto…"
                  className="pl-9"
                />
              </div>
              <div className="mt-2 max-h-56 overflow-y-auto rounded-md border">
                {filteredProducts.slice(0, 100).map((p) => {
                  const selected = editing.product_ids.includes(p.id);
                  return (
                    <button
                      key={p.id} type="button" onClick={() => toggleProduct(p.id)}
                      className={`flex w-full items-center gap-2 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-secondary ${
                        selected ? "bg-accent/10" : ""
                      }`}
                    >
                      <span className={`grid h-4 w-4 place-items-center rounded border ${
                        selected ? "border-accent bg-accent text-accent-foreground" : "border-border"
                      }`}>
                        {selected && <Check size={10} />}
                      </span>
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.price.toFixed(2)}</span>
                    </button>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <p className="p-3 text-xs text-muted-foreground">Sin resultados.</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Fecha de inicio</Label>
                <Input type="datetime-local" value={toDateInput(editing.start_date)}
                  onChange={(e) => setEditing({ ...editing, start_date: fromDateInput(e.target.value) })} />
              </div>
              <div>
                <Label>Fecha de fin</Label>
                <Input type="datetime-local" value={toDateInput(editing.end_date)}
                  onChange={(e) => setEditing({ ...editing, end_date: fromDateInput(e.target.value) })} />
              </div>
              <div>
                <Label>Límite de usos por pedido (0 = sin límite)</Label>
                <Input type="number" min={0} value={editing.usage_limit_per_order}
                  onChange={(e) => setEditing({ ...editing, usage_limit_per_order: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label>Orden en carrusel del Home</Label>
                <Input type="number" value={editing.sort_order_home}
                  onChange={(e) => setEditing({ ...editing, sort_order_home: Number(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="space-y-2 rounded-md border p-3">
              <label className="flex items-center justify-between text-sm">
                <span>Mostrar en carrusel del Home ("Promociones para usted")</span>
                <Switch checked={editing.show_in_carousel}
                  onCheckedChange={(v) => setEditing({ ...editing, show_in_carousel: v })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                <span>Mostrar en sección "promo" del Home</span>
                <Switch checked={editing.show_on_home}
                  onCheckedChange={(v) => setEditing({ ...editing, show_on_home: v })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                <span>Mostrar en ficha de producto</span>
                <Switch checked={editing.show_on_product}
                  onCheckedChange={(v) => setEditing({ ...editing, show_on_product: v })} />
              </label>
              <label className="flex items-center justify-between text-sm">
                <span>Promoción activa</span>
                <Switch checked={editing.is_active}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
              </label>
            </div>

            <div className="rounded-md bg-secondary/40 p-3 text-xs">
              <p className="font-semibold">Vista previa</p>
              <p className="mt-1 text-muted-foreground">{VARIANT_LABELS[editing.variant]}</p>
              <p className="text-muted-foreground">
                Etiqueta: <span className="font-semibold text-foreground">{promoLabel(editing)}</span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={save} disabled={saving} variant="accent">
              {saving ? (<><Loader2 size={14} className="animate-spin" /> Guardando…</>) : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPromotions;
