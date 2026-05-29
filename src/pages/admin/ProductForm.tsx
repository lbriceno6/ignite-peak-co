import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { SeoEditor } from "@/components/admin/SeoEditor";
import { ProductAiAssistant } from "@/components/admin/ProductAiAssistant";
import { ProductImageAiEditor } from "@/components/admin/ProductImageAiEditor";
import { mainCategories as staticMains, getSubcategories as getStaticSubs } from "@/lib/productCategories";
import { useTaxonomy } from "@/hooks/useTaxonomy";
import { BrandSelect } from "@/components/admin/BrandSelect";

const BADGE_OPTIONS = [
  { value: "", label: "Ninguno" },
  { value: "new", label: "Nuevo" },
  { value: "best-seller", label: "Más vendido" },
  { value: "sale", label: "Oferta" },
  { value: "limited", label: "Limitado" },
  { value: "popular", label: "Popular" },
  { value: "exclusive", label: "Exclusivo" },
];


const empty = {
  name: "", slug: "", short_description: "", description: "",
  price: 0, sale_price: null as number | null,
  category: "", subcategory: "", main_ingredient: "", goal: "", flavor: "", size: "",
  stock: 0, main_image: "", gallery_images: "" as any,
  is_active: true, badge: "",
  usage_instructions: "", ingredients: "",
  nutrition_facts: "", faqs: "",
  subscription_enabled: false,
  subscription_discount_percent: 10,
  subscription_intervals: "30,60,90",
  size_variants: "" as any,
  supplier_id: null as string | null,
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [uploadingMain, setUploadingMain] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const mainFileRef = useRef<HTMLInputElement>(null);
  const galleryFileRef = useRef<HTMLInputElement>(null);
  const [suppliers, setSuppliers] = useState<{ id: string; business_name: string }[]>([]);
  const { mains: dynamicMains, getSubsByMainName } = useTaxonomy({ activeOnly: true });
  const mainCategories = dynamicMains.length > 0 ? dynamicMains.map((m) => m.name) : staticMains;
  const getSubcategories = (name?: string | null) => {
    if (dynamicMains.length > 0) return getSubsByMainName(name).map((s) => s.name);
    return getStaticSubs(name);
  };

  const uploadToBucket = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
  };

  const onUploadMain = async (file?: File) => {
    if (!file) return;
    setUploadingMain(true);
    try {
      const url = await uploadToBucket(file, "product-main");
      set("main_image", url);
      toast.success("Imagen subida");
    } catch (e: any) { toast.error(e.message); } finally { setUploadingMain(false); }
  };

  const onUploadGallery = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        urls.push(await uploadToBucket(file, "product-gallery"));
      }
      const current = typeof f.gallery_images === "string"
        ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
        : (f.gallery_images ?? []);
      set("gallery_images", [...current, ...urls].join("\n"));
      toast.success(`${urls.length} imagen(es) subida(s)`);
    } catch (e: any) { toast.error(e.message); } finally { setUploadingGallery(false); }
  };

  const removeGalleryAt = (idx: number) => {
    const arr = typeof f.gallery_images === "string"
      ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
      : (f.gallery_images ?? []);
    arr.splice(idx, 1);
    set("gallery_images", arr.join("\n"));
  };


  useEffect(() => {
    (async () => {
      const { data: sup } = await supabase.from("suppliers").select("id, business_name").eq("is_active", true).order("business_name");
      setSuppliers(sup ?? []);
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const { data } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
      if (data) {
        setF({
          ...data,
          gallery_images: (data.gallery_images as any[] ?? []).join("\n"),
          nutrition_facts: data.nutrition_facts ? JSON.stringify(data.nutrition_facts, null, 2) : "",
          faqs: data.faqs ? JSON.stringify(data.faqs, null, 2) : "",
          subscription_intervals: (data.subscription_intervals as number[] ?? [30, 60, 90]).join(","),
          size_variants: ((data as any).size_variants as any[] ?? [])
            .map((v: any) => `${v?.label ?? ""}|${v?.price ?? ""}`).join("\n"),
        });
      }
    })();
  }, [id, isEdit]);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
    // Validate JSON fields before saving
    if (f.nutrition_facts && f.nutrition_facts.trim() && safeJson(f.nutrition_facts) === null) {
      return toast.error("La información nutricional no es un JSON válido.");
    }
    if (f.faqs && f.faqs.trim() && safeJson(f.faqs) === null) {
      return toast.error("Las preguntas frecuentes no son un JSON válido.");
    }
    setSaving(true);
    try {
      const payload: any = {
        ...f,
        slug: f.slug || slugify(f.name),
        price: Number(f.price) || 0,
        sale_price: f.sale_price ? Number(f.sale_price) : null,
        stock: Number(f.stock) || 0,
        gallery_images: typeof f.gallery_images === "string"
          ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
          : f.gallery_images,
        nutrition_facts: f.nutrition_facts ? safeJson(f.nutrition_facts) : null,
        faqs: f.faqs ? safeJson(f.faqs) : [],
        subscription_enabled: !!f.subscription_enabled,
        subscription_discount_percent: Number(f.subscription_discount_percent) || 0,
        subscription_intervals: typeof f.subscription_intervals === "string"
          ? f.subscription_intervals.split(",").map((s: string) => parseInt(s.trim(), 10)).filter((n: number) => !isNaN(n) && n > 0)
          : f.subscription_intervals,
        size_variants: typeof f.size_variants === "string"
          ? f.size_variants.split("\n").map((line: string) => {
              const [label, price] = line.split("|").map((s) => s.trim());
              if (!label) return null;
              return { label, price: Number(price) || 0 };
            }).filter(Boolean)
          : (f.size_variants ?? []),
      };
      delete payload.created_at; delete payload.updated_at; delete payload.id;
      const res = isEdit
        ? await supabase.from("products").update(payload).eq("id", id!)
        : await supabase.from("products").insert(payload);
      if (res.error) throw res.error;
      toast.success(isEdit ? "Producto actualizado" : "Producto creado");
      nav("/admin/products");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl">{isEdit ? "Editar producto" : "Crear producto"}</h1>

      <div className="grid gap-4 rounded-lg border bg-background p-6">
        <Field label="Nombre"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Slug"><Input value={f.slug} placeholder="se genera del nombre" onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field label="Descripción corta"><Input value={f.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} /></Field>
        <Field label="Descripción larga"><Textarea rows={5} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Precio"><Input type="number" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="Precio de oferta"><Input type="number" step="0.01" value={f.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value)} /></Field>
          <Field label="Categoría principal">
            <Select
              value={f.category || "__none__"}
              onValueChange={(v) => {
                const next = v === "__none__" ? "" : v;
                setF((p: any) => ({ ...p, category: next, subcategory: "" }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecciona una categoría</SelectItem>
                {mainCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Subcategoría">
            <Select
              value={f.subcategory || "__none__"}
              onValueChange={(v) => set("subcategory", v === "__none__" ? "" : v)}
              disabled={!f.category}
            >
              <SelectTrigger>
                <SelectValue placeholder={f.category ? "Selecciona una subcategoría" : "Primero elige una categoría"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin subcategoría</SelectItem>
                {getSubcategories(f.category).map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Etiqueta">
            <Select value={f.badge ?? ""} onValueChange={(v) => set("badge", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona una etiqueta" /></SelectTrigger>
              <SelectContent>
                {BADGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "__none__"} value={opt.value || "__none__"}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Ingrediente principal"><Input value={f.main_ingredient ?? ""} onChange={(e) => set("main_ingredient", e.target.value)} /></Field>
          <Field label="Objetivo"><Input value={f.goal ?? ""} onChange={(e) => set("goal", e.target.value)} /></Field>
          <Field label="Sabor"><Input value={f.flavor ?? ""} onChange={(e) => set("flavor", e.target.value)} /></Field>
          <Field label="Tamaño"><Input value={f.size ?? ""} onChange={(e) => set("size", e.target.value)} /></Field>
          <Field label="Stock"><Input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></Field>
          <Field label="Proveedor">
            <Select value={f.supplier_id ?? "__none__"} onValueChange={(v) => set("supplier_id", v === "__none__" ? null : v)}>
              <SelectTrigger><SelectValue placeholder="Selecciona un proveedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Ninguno</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.business_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Presentaciones / variantes de peso (una por línea, formato: etiqueta|precio, ej. 1kg|49.90)">
          <Textarea rows={4} placeholder={"500g|29.90\n1kg|49.90\n2kg|89.90"} value={f.size_variants}
            onChange={(e) => set("size_variants", e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Si agregas variantes, el cliente podrá elegir y se cobrará el precio de la variante seleccionada.</p>
        </Field>



        <Field label="Imagen principal">
          <div className="space-y-2">
            {f.main_image && (
              <img src={f.main_image} alt="Principal" className="h-32 w-32 rounded-md object-cover border" />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => mainFileRef.current?.click()} disabled={uploadingMain}>
                {uploadingMain ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploadingMain ? "Subiendo…" : "Subir imagen"}
              </Button>
              {f.main_image && (
                <Button type="button" variant="ghost" size="sm" onClick={() => set("main_image", "")}>Quitar</Button>
              )}
              <input ref={mainFileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => onUploadMain(e.target.files?.[0])} />
            </div>
            <Input placeholder="O pega la URL de la imagen" value={f.main_image ?? ""} onChange={(e) => set("main_image", e.target.value)} />
          </div>
        </Field>

        <Field label="Imágenes de galería">
          <div className="space-y-2">
            {(() => {
              const list = typeof f.gallery_images === "string"
                ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
                : (f.gallery_images ?? []);
              return list.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {list.map((url: string, i: number) => (
                    <div key={i} className="relative">
                      <img src={url} alt={`Galería ${i + 1}`} className="h-24 w-24 rounded-md object-cover border" />
                      <button type="button" onClick={() => removeGalleryAt(i)}
                        className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1 shadow">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => galleryFileRef.current?.click()} disabled={uploadingGallery}>
                {uploadingGallery ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                {uploadingGallery ? "Subiendo…" : "Subir imágenes"}
              </Button>
              <input ref={galleryFileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => onUploadGallery(e.target.files)} />
            </div>
            <Textarea rows={3} placeholder="O pega URLs (una por línea)" value={f.gallery_images}
              onChange={(e) => set("gallery_images", e.target.value)} />
          </div>
        </Field>

        <ProductImageAiEditor
          mainImage={f.main_image}
          onApplyMain={(url) => set("main_image", url)}
          onAppendGallery={(url) => {
            const current = typeof f.gallery_images === "string"
              ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
              : (f.gallery_images ?? []);
            set("gallery_images", [...current, url].join("\n"));
          }}
        />

        <ProductAiAssistant
          product={f}
          isEdit={isEdit}
          onApply={(patch) => setF((p: any) => ({ ...p, ...patch }))}
        />


        <Field label="Instrucciones de uso"><Textarea rows={3} value={f.usage_instructions ?? ""} onChange={(e) => set("usage_instructions", e.target.value)} /></Field>
        <Field label="Ingredientes"><Textarea rows={3} value={f.ingredients ?? ""} onChange={(e) => set("ingredients", e.target.value)} /></Field>
        <Field label='Información nutricional (JSON, ej. {"protein":"24g"})'>
          <Textarea rows={4} value={f.nutrition_facts} onChange={(e) => set("nutrition_facts", e.target.value)} />
        </Field>
        <Field label='Preguntas frecuentes (JSON, ej. [{"q":"…","a":"…"}])'>
          <Textarea rows={4} value={f.faqs} onChange={(e) => set("faqs", e.target.value)} />
        </Field>

        <div className="flex items-center gap-3">
          <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
          <Label>Activo</Label>
        </div>

        <div className="space-y-4 rounded-md border bg-secondary/30 p-4">
          <div className="flex items-center gap-3">
            <Switch checked={!!f.subscription_enabled} onCheckedChange={(v) => set("subscription_enabled", v)} />
            <Label>Habilitar compra recurrente (Suscribir y ahorrar)</Label>
          </div>
          {f.subscription_enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Descuento %">
                <Input type="number" step="1" min={0} max={90} value={f.subscription_discount_percent}
                  onChange={(e) => set("subscription_discount_percent", e.target.value)} />
              </Field>
              <Field label="Intervalos en días (separados por coma)">
                <Input placeholder="30,60,90" value={f.subscription_intervals}
                  onChange={(e) => set("subscription_intervals", e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        <SeoEditor
          entityType="product"
          entityId={isEdit ? (id ?? null) : null}
          fallbackTitle={f.name}
          fallbackDescription={f.short_description ?? f.description ?? ""}
          fallbackSlug={f.slug}
          images={[
            ...(f.main_image ? [f.main_image] : []),
            ...((typeof f.gallery_images === "string"
              ? f.gallery_images.split("\n").map((s: string) => s.trim()).filter(Boolean)
              : (f.gallery_images ?? [])) as string[]),
          ]}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => nav("/admin/products")}>Cancelar</Button>
          <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar producto"}</Button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);

function safeJson(s: string) { try { return JSON.parse(s); } catch { return null; } }
