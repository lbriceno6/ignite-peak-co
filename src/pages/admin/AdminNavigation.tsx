import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, Loader2, Trash2, ArrowUp, ArrowDown, Plus, Image as ImageIcon, Eye, Monitor, Tablet, Smartphone } from "lucide-react";

type NavLinkRow = {
  id: string;
  label: string;
  href: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
};

type CategoryRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  menu_label: string | null;
  sort_order: number;
  is_active: boolean;
  show_in_menu: boolean;
  menu_show_desktop: boolean;
  menu_show_mobile: boolean;
  menu_type: string;
  menu_column: number;
  menu_group_title: string | null;
  menu_badge: string | null;
  menu_badge_bg: string | null;
  menu_badge_color: string | null;
  featured_enabled: boolean;
  featured_title: string | null;
  featured_text: string | null;
  featured_cta_label: string | null;
  featured_cta_href: string | null;
  featured_image_url: string | null;
};

type CustomField = {
  id: string;
  parent_category_id: string | null;
  field_type: string;
  title: string;
  subtitle: string | null;
  href: string | null;
  image_url: string | null;
  cta_label: string | null;
  column_index: number;
  sort_order: number;
  is_active: boolean;
  show_desktop: boolean;
  show_mobile: boolean;
  badge_text: string | null;
  badge_bg: string | null;
  badge_color: string | null;
};

const LOGO_KEYS = ["logo_text", "logo_accent", "logo_image_url", "favicon_url"] as const;
const MENU_KEYS = [
  "nav_menu_max_categories",
  "nav_menu_font_family",
  "nav_menu_text_color",
  "nav_menu_bg_color",
  "nav_menu_font_weight",
  "nav_menu_font_size_desktop",
  "nav_menu_font_size_mobile",
  "nav_menu_hover_color",
  "nav_menu_text_transform",
  "nav_menu_letter_spacing",
  "nav_menu_item_gap_desktop",
  "nav_menu_item_gap_tablet",
  "nav_menu_item_gap_mobile",
  "nav_menu_underline_active",
] as const;
const FONT_OPTIONS = [
  "", "Inter", "Poppins", "Montserrat", "Roboto", "Lato", "Oswald",
  "Bebas Neue", "Playfair Display", "Raleway", "Nunito", "system-ui", "serif", "sans-serif",
];
const WEIGHT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "400", label: "Normal 400" },
  { value: "500", label: "Medium 500" },
  { value: "600", label: "Semibold 600" },
  { value: "700", label: "Bold 700" },
  { value: "800", label: "Extra Bold 800" },
];
const TRANSFORM_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "none", label: "Normal" },
  { value: "uppercase", label: "MAYÚSCULAS" },
  { value: "capitalize", label: "Capitalizado" },
  { value: "lowercase", label: "minúsculas" },
];

const FIELD_TYPES: Array<{ value: string; label: string }> = [
  { value: "link", label: "Enlace personalizado" },
  { value: "block", label: "Bloque destacado" },
  { value: "banner", label: "Banner pequeño" },
  { value: "image", label: "Imagen con enlace" },
  { value: "text", label: "Texto informativo" },
  { value: "button", label: "Botón" },
  { value: "badge", label: "Etiqueta promocional" },
];

const db = supabase as any;

const MENU_DEFAULTS: Record<string, string> = {
  nav_menu_max_categories: "6",
  nav_menu_font_family: "Inter",
  nav_menu_text_color: "#151515",
  nav_menu_bg_color: "",
  nav_menu_font_weight: "600",
  nav_menu_font_size_desktop: "14",
  nav_menu_font_size_mobile: "15",
  nav_menu_hover_color: "#35A936",
  nav_menu_text_transform: "uppercase",
  nav_menu_letter_spacing: "0.03em",
  nav_menu_item_gap_desktop: "32",
  nav_menu_item_gap_tablet: "18",
  nav_menu_item_gap_mobile: "14",
  nav_menu_underline_active: "1",
};

export default function AdminNavigation() {
  const [logo, setLogo] = useState<Record<string, string>>({ logo_text: "", logo_accent: "", logo_image_url: "", favicon_url: "" });
  const [savedLogo, setSavedLogo] = useState<Record<string, string>>({ logo_text: "", logo_accent: "", logo_image_url: "", favicon_url: "" });
  const [menu, setMenu] = useState<Record<string, string>>(MENU_DEFAULTS);
  const [savedMenu, setSavedMenu] = useState<Record<string, string>>(MENU_DEFAULTS);
  const [savingMenu, setSavingMenu] = useState(false);
  const [links, setLinks] = useState<NavLinkRow[]>([]);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [fields, setFields] = useState<CustomField[]>([]);
  const [selectedMain, setSelectedMain] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [savingLogo, setSavingLogo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const roots = cats.filter((c) => !c.parent_id).sort((a, b) => a.sort_order - b.sort_order);
  const subsOf = (id: string) => cats.filter((c) => c.parent_id === id).sort((a, b) => a.sort_order - b.sort_order);

  const load = async () => {
    setLoading(true);
    const allKeys = [...LOGO_KEYS, ...MENU_KEYS] as unknown as string[];
    const [c, l, catsRes, fRes] = await Promise.all([
      supabase.from("site_content").select("key,value").in("key", allKeys),
      supabase.from("nav_links").select("*").order("sort_order").order("created_at"),
      supabase.from("categories").select("*").eq("type", "product").order("sort_order").order("name"),
      db.from("menu_custom_fields").select("*").order("sort_order").order("created_at"),
    ]);
    const m: Record<string, string> = { logo_text: "", logo_accent: "", logo_image_url: "", favicon_url: "" };
    const mm: Record<string, string> = { ...MENU_DEFAULTS };
    (c.data ?? []).forEach((r: any) => {
      if ((LOGO_KEYS as readonly string[]).includes(r.key)) m[r.key] = r.value ?? "";
      if ((MENU_KEYS as readonly string[]).includes(r.key) && r.value) mm[r.key] = r.value;
    });
    setLogo(m); setSavedLogo(m);
    setMenu(mm); setSavedMenu(mm);
    setLinks((l.data as NavLinkRow[]) ?? []);
    const allCats = (catsRes.data as CategoryRow[]) ?? [];
    setCats(allCats);
    setFields(((fRes.data as CustomField[]) ?? []));
    if (!selectedMain && allCats.length) {
      const firstRoot = allCats.find((c) => !c.parent_id);
      if (firstRoot) setSelectedMain(firstRoot.id);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const setL = (k: string, v: string) => setLogo((p) => ({ ...p, [k]: v }));
  const logoDirty = LOGO_KEYS.some((k) => (logo[k] ?? "") !== (savedLogo[k] ?? ""));
  const setM = (k: string, v: string) => setMenu((p) => ({ ...p, [k]: v }));
  const menuDirty = MENU_KEYS.some((k) => (menu[k] ?? "") !== (savedMenu[k] ?? ""));

  const saveMenu = async () => {
    setSavingMenu(true);
    try {
      const rows = MENU_KEYS.map((k) => ({ key: k, value: menu[k] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Estilos del menú guardados");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSavingMenu(false); }
  };

  const saveLogo = async () => {
    setSavingLogo(true);
    try {
      const rows = LOGO_KEYS.map((k) => ({ key: k, value: logo[k] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Logo guardado");
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSavingLogo(false); }
  };

  const uploadImg = async (file: File, kind: "logo" | "favicon" | "field") => {
    const setBusy = kind === "logo" ? setUploading : kind === "favicon" ? setUploadingFavicon : () => {};
    setBusy(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${kind}-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      toast.error(e.message);
      return null;
    } finally { setBusy(false); }
  };

  const createLink = async () => {
    const sort_order = links.length ? Math.max(...links.map((s) => s.sort_order)) + 1 : 0;
    const { error } = await supabase.from("nav_links").insert({ label: "Nuevo enlace", href: "/", sort_order });
    if (error) return toast.error(error.message);
    toast.success("Enlace creado");
    load();
  };

  const moveLink = async (id: string, dir: -1 | 1) => {
    const idx = links.findIndex((s) => s.id === id);
    const swap = links[idx + dir];
    if (!swap) return;
    const cur = links[idx];
    await Promise.all([
      supabase.from("nav_links").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("nav_links").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const updateCat = async (id: string, patch: Partial<CategoryRow>) => {
    setCats((p) => p.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const { error } = await supabase.from("categories").update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  };

  const moveCat = async (id: string, dir: -1 | 1) => {
    const list = roots;
    const idx = list.findIndex((c) => c.id === id);
    const swap = list[idx + dir];
    if (!swap) return;
    const cur = list[idx];
    await Promise.all([
      supabase.from("categories").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("categories").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  // Custom fields CRUD
  const createField = async () => {
    if (!selectedMain) return toast.error("Selecciona una categoría");
    const sort_order = fields.filter((f) => f.parent_category_id === selectedMain).length;
    const { error } = await db.from("menu_custom_fields").insert({
      parent_category_id: selectedMain,
      field_type: "link",
      title: "Nuevo campo",
      column_index: 1,
      sort_order,
    });
    if (error) return toast.error(error.message);
    load();
  };
  const updateField = async (id: string, patch: Partial<CustomField>) => {
    setFields((p) => p.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const { error } = await db.from("menu_custom_fields").update(patch).eq("id", id);
    if (error) toast.error(error.message);
  };
  const deleteField = async (id: string) => {
    if (!confirm("¿Eliminar este campo?")) return;
    const { error } = await db.from("menu_custom_fields").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  // Restore recommended menu: marks all root cats visible, resets sort by name
  const restoreRecommended = async () => {
    if (!confirm("Esto activará todas las categorías principales en el menú y reordenará. ¿Continuar?")) return;
    await Promise.all(
      roots.map((c, i) =>
        supabase.from("categories").update({ show_in_menu: true, menu_show_desktop: true, menu_show_mobile: true, sort_order: i, menu_type: "mega" }).eq("id", c.id),
      ),
    );
    toast.success("Menú restaurado");
    load();
  };

  const previewWidth = previewDevice === "desktop" ? "100%" : previewDevice === "tablet" ? "768px" : "390px";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Logo y Menú</h1>
        <p className="text-muted-foreground">Personaliza el logo, el menú principal y el mega menú.</p>
      </div>

      <Tabs defaultValue="logo" className="space-y-6">
        <TabsList className="flex h-auto flex-wrap gap-1">
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="main">Menú principal</TabsTrigger>
          <TabsTrigger value="mega">Mega menú</TabsTrigger>
          <TabsTrigger value="custom">Campos personalizados</TabsTrigger>
          <TabsTrigger value="preview"><Eye size={14} className="mr-1" /> Vista previa</TabsTrigger>
        </TabsList>

        {/* ===== LOGO ===== */}
        <TabsContent value="logo" className="space-y-6">
          <section className="rounded-lg border bg-background p-6">
            {loading ? <p className="text-muted-foreground">Cargando…</p> : (
              <div className="grid gap-5 md:grid-cols-[260px,1fr]">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-xs">Logo (imagen)</Label>
                    <div className="grid h-32 place-items-center overflow-hidden rounded-md border bg-muted">
                      {logo.logo_image_url ? <img src={logo.logo_image_url} alt="" className="max-h-full max-w-full object-contain" /> : <ImageIcon size={28} className="text-muted-foreground" />}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadImg(f, "logo"); if (url) { setL("logo_image_url", url); toast.success("Sube y guarda"); }
                    }} />
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => fileRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploading ? "Subiendo…" : "Subir"}
                      </Button>
                      {logo.logo_image_url && <Button variant="ghost" size="sm" onClick={() => setL("logo_image_url", "")}>Quitar</Button>}
                    </div>
                    <Input value={logo.logo_image_url} onChange={(e) => setL("logo_image_url", e.target.value)} placeholder="…o pega URL" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Favicon</Label>
                    <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-md border bg-muted">
                      {logo.favicon_url ? <img src={logo.favicon_url} alt="" className="h-full w-full object-contain" /> : <ImageIcon size={20} className="text-muted-foreground" />}
                    </div>
                    <input ref={faviconRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const url = await uploadImg(f, "favicon"); if (url) { setL("favicon_url", url); toast.success("Sube y guarda"); }
                    }} />
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => faviconRef.current?.click()} disabled={uploadingFavicon}>
                        {uploadingFavicon ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} {uploadingFavicon ? "Subiendo…" : "Subir"}
                      </Button>
                      {logo.favicon_url && <Button variant="ghost" size="sm" onClick={() => setL("favicon_url", "")}>Quitar</Button>}
                    </div>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div><Label className="text-xs">Texto del logo (principal)</Label><Input value={logo.logo_text} onChange={(e) => setL("logo_text", e.target.value)} placeholder="Nutri" /></div>
                  <div><Label className="text-xs">Texto del logo (acento)</Label><Input value={logo.logo_accent} onChange={(e) => setL("logo_accent", e.target.value)} placeholder="batidos" /></div>
                  <div className="rounded-md border bg-muted/30 p-4">
                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Vista previa</p>
                    {logo.logo_image_url ? <img src={logo.logo_image_url} alt="" className="h-10 object-contain" /> : <span className="font-display text-3xl">{logo.logo_text}<span className="text-accent">{logo.logo_accent}</span></span>}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setLogo(savedLogo)} disabled={!logoDirty || savingLogo}>Descartar</Button>
                    <Button variant="dark" onClick={saveLogo} disabled={!logoDirty || savingLogo}>{savingLogo ? "Guardando…" : "Guardar logo"}</Button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </TabsContent>

        {/* ===== MENÚ PRINCIPAL ===== */}
        <TabsContent value="main" className="space-y-6">
          <section className="rounded-lg border bg-background p-6">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Categorías visibles en el menú</h2>
                <p className="text-sm text-muted-foreground">Selecciona qué categorías aparecen, su orden, nombre visible y etiqueta.</p>
              </div>
              <Button variant="outline" onClick={restoreRecommended}>Restaurar menú recomendado</Button>
            </header>
            {loading ? <p className="text-muted-foreground">Cargando…</p> : (
              <div className="space-y-2">
                {roots.length === 0 && <p className="text-sm text-muted-foreground">No hay categorías. Crea categorías en Admin → Categorías.</p>}
                {roots.map((c, i) => (
                  <div key={c.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[auto,1fr,1fr,auto,auto,auto,auto] md:items-center">
                    <div className="flex flex-col gap-0.5">
                      <Button variant="ghost" size="icon" disabled={i === 0} onClick={() => moveCat(c.id, -1)}><ArrowUp size={14} /></Button>
                      <Button variant="ghost" size="icon" disabled={i === roots.length - 1} onClick={() => moveCat(c.id, 1)}><ArrowDown size={14} /></Button>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Nombre real</Label>
                      <div className="text-sm font-medium">{c.name} <span className="text-xs text-muted-foreground">/{c.slug}</span></div>
                    </div>
                    <div>
                      <Label className="text-[10px] uppercase text-muted-foreground">Nombre visible</Label>
                      <Input value={c.menu_label ?? ""} placeholder={c.name} onChange={(e) => updateCat(c.id, { menu_label: e.target.value })} />
                    </div>
                    <label className="flex flex-col items-center gap-1 text-xs">
                      <span>Menú</span>
                      <Switch checked={c.show_in_menu} onCheckedChange={(v) => updateCat(c.id, { show_in_menu: v })} />
                    </label>
                    <label className="flex flex-col items-center gap-1 text-xs">
                      <span>Desktop</span>
                      <Switch checked={c.menu_show_desktop} onCheckedChange={(v) => updateCat(c.id, { menu_show_desktop: v })} />
                    </label>
                    <label className="flex flex-col items-center gap-1 text-xs">
                      <span>Mobile</span>
                      <Switch checked={c.menu_show_mobile} onCheckedChange={(v) => updateCat(c.id, { menu_show_mobile: v })} />
                    </label>
                    <select className="h-9 rounded-md border bg-background px-2 text-sm" value={c.menu_type ?? "mega"} onChange={(e) => updateCat(c.id, { menu_type: e.target.value })}>
                      <option value="mega">Mega menú</option>
                      <option value="link">Enlace simple</option>
                    </select>
                    <div className="md:col-span-7 grid gap-2 md:grid-cols-3">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Etiqueta (badge)</Label>
                        <Input value={c.menu_badge ?? ""} placeholder="ej. Oferta, Nuevo, 2x1" onChange={(e) => updateCat(c.id, { menu_badge: e.target.value || null })} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Fondo etiqueta</Label>
                        <Input type="color" value={c.menu_badge_bg ?? "#35a936"} onChange={(e) => updateCat(c.id, { menu_badge_bg: e.target.value })} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Color texto</Label>
                        <Input type="color" value={c.menu_badge_color ?? "#ffffff"} onChange={(e) => updateCat(c.id, { menu_badge_color: e.target.value })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Estilo */}
          <section className="rounded-lg border bg-background p-6">
            <header className="mb-4">
              <h2 className="font-display text-xl">Estilo del menú principal</h2>
              <p className="text-sm text-muted-foreground">Tipografía, peso, colores, transformación y espaciado del texto del menú superior.</p>
            </header>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">Máximo de categorías visibles</Label>
                <Input type="number" min={1} max={20} value={menu.nav_menu_max_categories} onChange={(e) => setM("nav_menu_max_categories", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Fuente del menú</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={menu.nav_menu_font_family} onChange={(e) => setM("nav_menu_font_family", e.target.value)}>
                  {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f || "Por defecto (tema)"}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Peso del texto del menú</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={menu.nav_menu_font_weight} onChange={(e) => setM("nav_menu_font_weight", e.target.value)}>
                  {WEIGHT_OPTIONS.map((w) => <option key={w.value} value={w.value} style={{ fontWeight: parseInt(w.value, 10) }}>{w.label}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground">Recomendado: Semibold 600. Para verlo más fuerte, usa Bold 700.</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Transformación de texto</Label>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={menu.nav_menu_text_transform} onChange={(e) => setM("nav_menu_text_transform", e.target.value)}>
                  {TRANSFORM_OPTIONS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tamaño desktop (px)</Label>
                <Input type="number" min={10} max={28} value={menu.nav_menu_font_size_desktop} onChange={(e) => setM("nav_menu_font_size_desktop", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Tamaño mobile (px)</Label>
                <Input type="number" min={10} max={28} value={menu.nav_menu_font_size_mobile} onChange={(e) => setM("nav_menu_font_size_mobile", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Espaciado entre letras (ej. 0.03em)</Label>
                <Input value={menu.nav_menu_letter_spacing} onChange={(e) => setM("nav_menu_letter_spacing", e.target.value)} placeholder="0.03em" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Subrayado en activo</Label>
                <div className="flex h-10 items-center gap-2 rounded-md border px-3">
                  <Switch checked={menu.nav_menu_underline_active !== "0"} onCheckedChange={(v) => setM("nav_menu_underline_active", v ? "1" : "0")} />
                  <span className="text-sm text-muted-foreground">Mostrar línea inferior en la categoría activa</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color de letra</Label>
                <div className="flex gap-2">
                  <Input type="color" className="h-10 w-16 p-1" value={menu.nav_menu_text_color || "#151515"} onChange={(e) => setM("nav_menu_text_color", e.target.value)} />
                  <Input value={menu.nav_menu_text_color} onChange={(e) => setM("nav_menu_text_color", e.target.value)} placeholder="#151515" />
                  {menu.nav_menu_text_color && <Button variant="ghost" size="sm" onClick={() => setM("nav_menu_text_color", "")}>Limpiar</Button>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color al pasar el mouse (hover)</Label>
                <div className="flex gap-2">
                  <Input type="color" className="h-10 w-16 p-1" value={menu.nav_menu_hover_color || "#35A936"} onChange={(e) => setM("nav_menu_hover_color", e.target.value)} />
                  <Input value={menu.nav_menu_hover_color} onChange={(e) => setM("nav_menu_hover_color", e.target.value)} placeholder="#35A936" />
                  {menu.nav_menu_hover_color && <Button variant="ghost" size="sm" onClick={() => setM("nav_menu_hover_color", "")}>Limpiar</Button>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Color de fondo</Label>
                <div className="flex gap-2">
                  <Input type="color" className="h-10 w-16 p-1" value={menu.nav_menu_bg_color || "#ffffff"} onChange={(e) => setM("nav_menu_bg_color", e.target.value)} />
                  <Input value={menu.nav_menu_bg_color} onChange={(e) => setM("nav_menu_bg_color", e.target.value)} placeholder="#ffffff" />
                  {menu.nav_menu_bg_color && <Button variant="ghost" size="sm" onClick={() => setM("nav_menu_bg_color", "")}>Limpiar</Button>}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2 grid md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Separación entre ítems (desktop, px)</Label>
                  <Input type="number" min={4} max={80} value={menu.nav_menu_item_gap_desktop} onChange={(e) => setM("nav_menu_item_gap_desktop", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Separación (tablet, px)</Label>
                  <Input type="number" min={4} max={80} value={menu.nav_menu_item_gap_tablet} onChange={(e) => setM("nav_menu_item_gap_tablet", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Separación (mobile, px)</Label>
                  <Input type="number" min={4} max={60} value={menu.nav_menu_item_gap_mobile} onChange={(e) => setM("nav_menu_item_gap_mobile", e.target.value)} />
                </div>
              </div>

              {/* Live preview */}
              <div className="md:col-span-2">
                <Label className="text-xs">Vista previa en vivo</Label>
                <div
                  className="mt-2 overflow-x-auto rounded-md border p-4"
                  style={{ backgroundColor: menu.nav_menu_bg_color || "#ffffff" }}
                >
                  <div
                    className="flex items-center"
                    style={{ columnGap: `${parseInt(menu.nav_menu_item_gap_desktop || "32", 10) || 32}px` }}
                  >
                    {["PRODUCTOS", "PROTEÍNAS", "SUPERFOODS", "PARA TU SALUD", "PROMOCIONES"].map((t) => (
                      <span
                        key={t}
                        className="whitespace-nowrap transition-colors"
                        style={{
                          fontFamily: menu.nav_menu_font_family || undefined,
                          fontWeight: parseInt(menu.nav_menu_font_weight || "600", 10) || 600,
                          fontSize: `${parseInt(menu.nav_menu_font_size_desktop || "14", 10) || 14}px`,
                          color: menu.nav_menu_text_color || "#151515",
                          textTransform: (menu.nav_menu_text_transform || "uppercase") as React.CSSProperties["textTransform"],
                          letterSpacing: menu.nav_menu_letter_spacing || "0.03em",
                        }}
                        onMouseEnter={(e) => { if (menu.nav_menu_hover_color) (e.currentTarget as HTMLSpanElement).style.color = menu.nav_menu_hover_color; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLSpanElement).style.color = menu.nav_menu_text_color || "#151515"; }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">Pasa el mouse para ver el color hover. Los cambios se aplicarán al guardar.</p>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMenu(savedMenu)} disabled={!menuDirty || savingMenu}>Descartar</Button>
                <Button variant="dark" onClick={saveMenu} disabled={!menuDirty || savingMenu}>{savingMenu ? "Guardando…" : "Guardar estilo"}</Button>
              </div>
            </div>
          </section>


          {/* Nav links extra (About, Contact, etc) */}
          <section className="rounded-lg border bg-background p-6">
            <header className="mb-4 flex items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-xl">Enlaces extra (derecha)</h2>
                <p className="text-sm text-muted-foreground">Enlaces fijos del menú (Blog, Contacto, etc.).</p>
              </div>
              <Button variant="dark" onClick={createLink}><Plus size={16} /> Nuevo enlace</Button>
            </header>
            {links.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">Sin enlaces extra.</div>
            ) : (
              <div className="space-y-2">
                {links.map((row, i) => (
                  <LinkRow key={row.id} row={row} isFirst={i === 0} isLast={i === links.length - 1} onChanged={load} onMoveUp={() => moveLink(row.id, -1)} onMoveDown={() => moveLink(row.id, 1)} />
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* ===== MEGA MENÚ ===== */}
        <TabsContent value="mega" className="space-y-6">
          <MegaMenuBuilder />

          <section className="rounded-lg border bg-background p-6">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Configurar mega menú</h2>
                <p className="text-sm text-muted-foreground">Subcategorías visibles, columnas, grupos, etiquetas y bloque destacado.</p>
              </div>
              <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedMain} onChange={(e) => setSelectedMain(e.target.value)}>
                <option value="">— Selecciona categoría —</option>
                {roots.map((c) => <option key={c.id} value={c.id}>{c.menu_label || c.name}</option>)}
              </select>
            </header>

            {selectedMain && (() => {
              const parent = cats.find((c) => c.id === selectedMain);
              if (!parent) return null;
              const subs = subsOf(selectedMain);
              return (
                <div className="space-y-6">
                  {/* Sub list */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Subcategorías de {parent.name}</h3>
                    {subs.length === 0 && <p className="text-sm text-muted-foreground">Esta categoría no tiene subcategorías. Créalas en Admin → Categorías.</p>}
                    {subs.map((s) => (
                      <div key={s.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[1fr,1fr,90px,1fr,1fr,auto]">
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Nombre real</Label>
                          <div className="text-sm">{s.name}</div>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Nombre visible</Label>
                          <Input value={s.menu_label ?? ""} placeholder={s.name} onChange={(e) => updateCat(s.id, { menu_label: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Columna</Label>
                          <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={s.menu_column ?? 1} onChange={(e) => updateCat(s.id, { menu_column: parseInt(e.target.value, 10) })}>
                            {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Título de grupo</Label>
                          <Input value={s.menu_group_title ?? ""} placeholder="ej. Bienestar diario" onChange={(e) => updateCat(s.id, { menu_group_title: e.target.value || null })} />
                        </div>
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Etiqueta</Label>
                          <Input value={s.menu_badge ?? ""} placeholder="ej. Nuevo" onChange={(e) => updateCat(s.id, { menu_badge: e.target.value || null })} />
                        </div>
                        <label className="flex flex-col items-center gap-1 self-center text-xs">
                          <span>Visible</span>
                          <Switch checked={s.show_in_menu} onCheckedChange={(v) => updateCat(s.id, { show_in_menu: v })} />
                        </label>
                      </div>
                    ))}
                  </div>

                  {/* Featured block */}
                  <div className="rounded-md border p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">Bloque destacado</h3>
                      <Switch checked={parent.featured_enabled} onCheckedChange={(v) => updateCat(parent.id, { featured_enabled: v })} />
                    </div>
                    {parent.featured_enabled && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <div><Label className="text-xs">Título</Label><Input value={parent.featured_title ?? ""} onChange={(e) => updateCat(parent.id, { featured_title: e.target.value })} /></div>
                        <div><Label className="text-xs">Texto</Label><Input value={parent.featured_text ?? ""} onChange={(e) => updateCat(parent.id, { featured_text: e.target.value })} /></div>
                        <div><Label className="text-xs">Texto botón</Label><Input value={parent.featured_cta_label ?? ""} onChange={(e) => updateCat(parent.id, { featured_cta_label: e.target.value })} /></div>
                        <div><Label className="text-xs">Enlace</Label><Input value={parent.featured_cta_href ?? ""} onChange={(e) => updateCat(parent.id, { featured_cta_href: e.target.value })} /></div>
                        <div className="md:col-span-2">
                          <Label className="text-xs">Imagen (URL)</Label>
                          <Input value={parent.featured_image_url ?? ""} onChange={(e) => updateCat(parent.id, { featured_image_url: e.target.value })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </section>
        </TabsContent>

        {/* ===== CAMPOS PERSONALIZADOS ===== */}
        <TabsContent value="custom" className="space-y-6">
          <section className="rounded-lg border bg-background p-6">
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Campos personalizados del mega menú</h2>
                <p className="text-sm text-muted-foreground">Enlaces, bloques, banners y etiquetas manuales.</p>
              </div>
              <div className="flex gap-2">
                <select className="h-10 rounded-md border bg-background px-3 text-sm" value={selectedMain} onChange={(e) => setSelectedMain(e.target.value)}>
                  <option value="">— Categoría —</option>
                  {roots.map((c) => <option key={c.id} value={c.id}>{c.menu_label || c.name}</option>)}
                </select>
                <Button variant="dark" onClick={createField} disabled={!selectedMain}><Plus size={16} /> Agregar</Button>
              </div>
            </header>
            <div className="space-y-3">
              {fields.filter((f) => f.parent_category_id === selectedMain).length === 0 && (
                <p className="text-sm text-muted-foreground">No hay campos personalizados para esta categoría.</p>
              )}
              {fields.filter((f) => f.parent_category_id === selectedMain).map((f) => (
                <div key={f.id} className="grid gap-2 rounded-md border p-3 md:grid-cols-[150px,1fr,1fr,90px,auto,auto,auto]">
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={f.field_type} onChange={(e) => updateField(f.id, { field_type: e.target.value })}>
                    {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <Input value={f.title} placeholder="Título" onChange={(e) => updateField(f.id, { title: e.target.value })} />
                  <Input value={f.href ?? ""} placeholder="/enlace" onChange={(e) => updateField(f.id, { href: e.target.value })} />
                  <select className="h-9 rounded-md border bg-background px-2 text-sm" value={f.column_index} onChange={(e) => updateField(f.id, { column_index: parseInt(e.target.value, 10) })}>
                    {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>Col {n}</option>)}
                  </select>
                  <label className="flex flex-col items-center gap-1 self-center text-xs"><span>Activo</span><Switch checked={f.is_active} onCheckedChange={(v) => updateField(f.id, { is_active: v })} /></label>
                  <label className="flex flex-col items-center gap-1 self-center text-xs"><span>Desktop</span><Switch checked={f.show_desktop} onCheckedChange={(v) => updateField(f.id, { show_desktop: v })} /></label>
                  <Button variant="ghost" size="icon" onClick={() => deleteField(f.id)}><Trash2 size={14} /></Button>
                  <div className="md:col-span-7 grid gap-2 md:grid-cols-[1fr,1fr,1fr,160px,80px,80px]">
                    <Input value={f.subtitle ?? ""} placeholder="Subtítulo / texto corto" onChange={(e) => updateField(f.id, { subtitle: e.target.value })} />
                    <Input value={f.cta_label ?? ""} placeholder="Texto del botón" onChange={(e) => updateField(f.id, { cta_label: e.target.value })} />
                    <Input value={f.image_url ?? ""} placeholder="URL imagen (opcional)" onChange={(e) => updateField(f.id, { image_url: e.target.value })} />
                    <Input value={f.badge_text ?? ""} placeholder="Etiqueta (Oferta, 2x1...)" onChange={(e) => updateField(f.id, { badge_text: e.target.value })} />
                    <Input type="color" value={f.badge_bg ?? "#35a936"} onChange={(e) => updateField(f.id, { badge_bg: e.target.value })} />
                    <Input type="color" value={f.badge_color ?? "#ffffff"} onChange={(e) => updateField(f.id, { badge_color: e.target.value })} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </TabsContent>

        {/* ===== VISTA PREVIA ===== */}
        <TabsContent value="preview" className="space-y-4">
          <div className="flex gap-2">
            <Button variant={previewDevice === "desktop" ? "dark" : "outline"} size="sm" onClick={() => setPreviewDevice("desktop")}><Monitor size={14} /> Desktop</Button>
            <Button variant={previewDevice === "tablet" ? "dark" : "outline"} size="sm" onClick={() => setPreviewDevice("tablet")}><Tablet size={14} /> Tablet</Button>
            <Button variant={previewDevice === "mobile" ? "dark" : "outline"} size="sm" onClick={() => setPreviewDevice("mobile")}><Smartphone size={14} /> Mobile</Button>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="mx-auto overflow-hidden rounded-md border bg-background" style={{ width: previewWidth, maxWidth: "100%", height: "70vh" }}>
              <iframe src="/" className="h-full w-full" title="Vista previa" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LinkRow({
  row, isFirst, isLast, onChanged, onMoveUp, onMoveDown,
}: {
  row: NavLinkRow; isFirst: boolean; isLast: boolean; onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [local, setLocal] = useState(row);
  useEffect(() => setLocal(row), [row]);
  const dirty = local.label !== row.label || local.href !== row.href || local.is_active !== row.is_active || local.open_in_new_tab !== row.open_in_new_tab;
  const save = async () => {
    const { error } = await supabase.from("nav_links").update({ label: local.label, href: local.href, is_active: local.is_active, open_in_new_tab: local.open_in_new_tab }).eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Guardado"); onChanged();
  };
  const remove = async () => {
    if (!confirm("¿Eliminar enlace?")) return;
    const { error } = await supabase.from("nav_links").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    onChanged();
  };
  return (
    <div className="grid items-center gap-2 rounded-md border p-3 md:grid-cols-[auto,1fr,1fr,auto,auto,auto]">
      <div className="flex flex-col gap-0.5">
        <Button variant="ghost" size="icon" disabled={isFirst} onClick={onMoveUp}><ArrowUp size={14} /></Button>
        <Button variant="ghost" size="icon" disabled={isLast} onClick={onMoveDown}><ArrowDown size={14} /></Button>
      </div>
      <Input value={local.label} onChange={(e) => setLocal({ ...local, label: e.target.value })} placeholder="Etiqueta" />
      <Input value={local.href} onChange={(e) => setLocal({ ...local, href: e.target.value })} placeholder="/blog" />
      <label className="flex items-center gap-1 text-xs"><Switch checked={local.is_active} onCheckedChange={(v) => setLocal({ ...local, is_active: v })} /> Activo</label>
      <Button variant="dark" size="sm" disabled={!dirty} onClick={save}>Guardar</Button>
      <Button variant="ghost" size="icon" onClick={remove}><Trash2 size={14} /></Button>
    </div>
  );
}
