import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import { ALL_PAGES, FILTER_TYPE_META, type FilterType, type PageKey } from "@/hooks/useCatalogFilters";

const sb = supabase as any;

const slugify = (s: string) =>
  s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

type OptionDraft = {
  id?: string;
  name: string;
  slug: string;
  value: string;
  display_order: number;
  is_active: boolean;
  color?: string | null;
  image_url?: string | null;
  _deleted?: boolean;
};

export default function AdminCatalogFilterForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("brand");
  const [selectionType, setSelectionType] = useState<"single" | "multi">("multi");
  const [isActive, setIsActive] = useState(true);
  const [showDesktop, setShowDesktop] = useState(true);
  const [showMobile, setShowMobile] = useState(true);
  const [defaultOpen, setDefaultOpen] = useState(true);
  const [displayOrder, setDisplayOrder] = useState(99);
  const [pages, setPages] = useState<PageKey[]>(ALL_PAGES.map((p) => p.key));
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const typeMeta = useMemo(() => FILTER_TYPE_META.find((t) => t.key === filterType), [filterType]);
  const hasOptions = !!typeMeta?.hasOptions;

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const [{ data: f }, { data: opts }] = await Promise.all([
        sb.from("catalog_filters").select("*").eq("id", id).maybeSingle(),
        sb.from("catalog_filter_options").select("*").eq("filter_id", id).order("display_order"),
      ]);
      if (f) {
        setName(f.name); setSlug(f.slug); setFilterType(f.filter_type);
        setSelectionType(f.selection_type); setIsActive(f.is_active);
        setShowDesktop(f.show_desktop); setShowMobile(f.show_mobile);
        setDefaultOpen(f.default_open); setDisplayOrder(f.display_order);
        setPages(Array.isArray(f.pages_visibility) ? f.pages_visibility : []);
      }
      setOptions(((opts ?? []) as any[]).map((o) => ({
        id: o.id, name: o.name, slug: o.slug, value: o.value ?? "",
        display_order: o.display_order, is_active: o.is_active,
        color: o.color, image_url: o.image_url,
      })));
      setLoading(false);
    })();
  }, [id, isEdit]);

  const togglePage = (p: PageKey) =>
    setPages((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);

  const addOption = () =>
    setOptions((cur) => [...cur, { name: "", slug: "", value: "", display_order: cur.length, is_active: true }]);

  const save = async () => {
    if (!name.trim()) return toast.error("Nombre obligatorio");
    const finalSlug = slug.trim() || slugify(name);
    setSaving(true);
    const payload = {
      name: name.trim(),
      slug: finalSlug,
      filter_type: filterType,
      selection_type: selectionType,
      is_active: isActive,
      show_desktop: showDesktop,
      show_mobile: showMobile,
      default_open: defaultOpen,
      display_order: displayOrder,
      pages_visibility: pages,
      ui_widget: typeMeta?.widget ?? "checkbox",
    };
    let filterId = id;
    if (isEdit) {
      const { error } = await sb.from("catalog_filters").update(payload).eq("id", id);
      if (error) { setSaving(false); return toast.error(error.message); }
    } else {
      const { data, error } = await sb.from("catalog_filters").insert(payload).select("id").single();
      if (error) { setSaving(false); return toast.error(error.message); }
      filterId = data.id;
    }
    if (hasOptions && filterId) {
      const toDelete = options.filter((o) => o._deleted && o.id).map((o) => o.id!);
      const toUpsert = options.filter((o) => !o._deleted && o.name.trim()).map((o, i) => ({
        id: o.id,
        filter_id: filterId,
        name: o.name.trim(),
        slug: o.slug.trim() || slugify(o.name),
        value: o.value.trim() || slugify(o.name),
        display_order: o.display_order ?? i,
        is_active: o.is_active,
        color: o.color || null,
        image_url: o.image_url || null,
      }));
      if (toDelete.length) await sb.from("catalog_filter_options").delete().in("id", toDelete);
      if (toUpsert.length) {
        const { error: e2 } = await sb.from("catalog_filter_options").upsert(toUpsert, { onConflict: "id" });
        if (e2) { setSaving(false); return toast.error(e2.message); }
      }
    }
    setSaving(false);
    toast.success(isEdit ? "Filtro actualizado" : "Filtro creado");
    nav("/admin/catalog-filters");
  };

  if (loading) return <div className="text-muted-foreground">Cargando…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/admin/catalog-filters"><ArrowLeft size={16} /> Volver</Link></Button>
        <h1 className="font-display text-3xl">{isEdit ? "Editar filtro" : "Nuevo filtro"}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border bg-background p-5 space-y-4">
            <h2 className="font-medium">General</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nombre</Label>
                <Input value={name} onChange={(e) => { setName(e.target.value); if (!isEdit) setSlug(slugify(e.target.value)); }} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="auto-generado" />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de filtro</Label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FILTER_TYPE_META.map((t) => (
                      <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Selección</Label>
                <Select value={selectionType} onValueChange={(v) => setSelectionType(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multi">Múltiple</SelectItem>
                    <SelectItem value="single">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Orden</Label>
                <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-background p-5 space-y-4">
            <h2 className="font-medium">Páginas donde aparece</h2>
            <p className="text-xs text-muted-foreground">Marca las páginas donde quieres que este filtro esté disponible.</p>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {ALL_PAGES.map((p) => (
                <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox checked={pages.includes(p.key)} onCheckedChange={() => togglePage(p.key)} />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          {hasOptions && (
            <div className="rounded-lg border bg-background p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Opciones</h2>
                <Button variant="outline" size="sm" onClick={addOption}><Plus size={14} /> Añadir opción</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Define las opciones disponibles. El "valor" debe coincidir con el dato guardado en cada producto.
              </p>
              <div className="space-y-2">
                {options.filter((o) => !o._deleted).map((o, idx) => (
                  <div key={o.id ?? idx} className="grid grid-cols-[1fr_1fr_1fr_60px_40px] items-center gap-2">
                    <Input placeholder="Etiqueta" value={o.name}
                      onChange={(e) => setOptions((cur) => cur.map((x) => x === o ? { ...x, name: e.target.value, slug: x.slug || slugify(e.target.value) } : x))} />
                    <Input placeholder="Slug" value={o.slug}
                      onChange={(e) => setOptions((cur) => cur.map((x) => x === o ? { ...x, slug: slugify(e.target.value) } : x))} />
                    <Input placeholder="Valor (= dato en producto)" value={o.value}
                      onChange={(e) => setOptions((cur) => cur.map((x) => x === o ? { ...x, value: e.target.value } : x))} />
                    <Input type="number" value={o.display_order}
                      onChange={(e) => setOptions((cur) => cur.map((x) => x === o ? { ...x, display_order: Number(e.target.value) } : x))} />
                    <Button variant="ghost" size="icon" onClick={() =>
                      setOptions((cur) => cur.map((x) => x === o ? { ...x, _deleted: true } : x).filter((x) => x.id || !x._deleted))
                    }><Trash2 size={14} /></Button>
                  </div>
                ))}
                {!options.filter((o) => !o._deleted).length && (
                  <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                    Sin opciones aún. Añade la primera.
                  </p>
                )}
              </div>
            </div>
          )}

          {!hasOptions && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              Este tipo de filtro genera sus opciones automáticamente desde los datos de los productos
              (categoría, marca, precio, stock, etc.). No requiere configurar opciones manualmente.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-background p-5 space-y-4">
            <h2 className="font-medium">Visibilidad</h2>
            <div className="flex items-center justify-between"><span className="text-sm">Activo</span><Switch checked={isActive} onCheckedChange={setIsActive} /></div>
            <div className="flex items-center justify-between"><span className="text-sm">Visible en desktop</span><Switch checked={showDesktop} onCheckedChange={setShowDesktop} /></div>
            <div className="flex items-center justify-between"><span className="text-sm">Visible en móvil</span><Switch checked={showMobile} onCheckedChange={setShowMobile} /></div>
            <div className="flex items-center justify-between"><span className="text-sm">Abierto por defecto</span><Switch checked={defaultOpen} onCheckedChange={setDefaultOpen} /></div>
          </div>
          <Button variant="dark" className="w-full" disabled={saving} onClick={save}>
            {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear filtro"}
          </Button>
        </div>
      </div>
    </div>
  );
}
