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

const BADGE_OPTIONS = [
  { value: "", label: "None" },
  { value: "new", label: "New" },
  { value: "best-seller", label: "Best seller" },
  { value: "sale", label: "Sale" },
  { value: "limited", label: "Limited" },
  { value: "popular", label: "Popular" },
  { value: "exclusive", label: "Exclusive" },
];


const empty = {
  name: "", slug: "", short_description: "", description: "",
  price: 0, sale_price: null as number | null,
  category: "", main_ingredient: "", goal: "", flavor: "", size: "",
  stock: 0, main_image: "", gallery_images: "" as any,
  is_active: true, badge: "",
  usage_instructions: "", ingredients: "",
  nutrition_facts: "", faqs: "",
  subscription_enabled: false,
  subscription_discount_percent: 10,
  subscription_intervals: "30,60,90",
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
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);

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
      toast.success("Image uploaded");
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
      toast.success(`${urls.length} image(s) uploaded`);
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
      const { data } = await supabase.from("categories").select("name, slug").eq("type", "product").order("sort_order");
      setCategories(data ?? []);
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
        });
      }
    })();
  }, [id, isEdit]);

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const save = async () => {
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
      };
      delete payload.created_at; delete payload.updated_at; delete payload.id;
      const res = isEdit
        ? await supabase.from("products").update(payload).eq("id", id!)
        : await supabase.from("products").insert(payload);
      if (res.error) throw res.error;
      toast.success(isEdit ? "Product updated" : "Product created");
      nav("/admin/products");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-3xl">{isEdit ? "Edit product" : "Create product"}</h1>

      <div className="grid gap-4 rounded-lg border bg-background p-6">
        <Field label="Name"><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Slug"><Input value={f.slug} placeholder="auto from name" onChange={(e) => set("slug", e.target.value)} /></Field>
        <Field label="Short description"><Input value={f.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} /></Field>
        <Field label="Long description"><Textarea rows={5} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price"><Input type="number" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} /></Field>
          <Field label="Sale price"><Input type="number" step="0.01" value={f.sale_price ?? ""} onChange={(e) => set("sale_price", e.target.value)} /></Field>
          <Field label="Category">
            <Input list="product-categories" value={f.category ?? ""} onChange={(e) => set("category", e.target.value)} />
            <datalist id="product-categories">
              {categories.map((c) => <option key={c.slug} value={c.name} />)}
            </datalist>
          </Field>
          <Field label="Badge">
            <Select value={f.badge ?? ""} onValueChange={(v) => set("badge", v === "__none__" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select a badge" /></SelectTrigger>
              <SelectContent>
                {BADGE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value || "__none__"} value={opt.value || "__none__"}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Main ingredient"><Input value={f.main_ingredient ?? ""} onChange={(e) => set("main_ingredient", e.target.value)} /></Field>
          <Field label="Goal"><Input value={f.goal ?? ""} onChange={(e) => set("goal", e.target.value)} /></Field>
          <Field label="Flavor"><Input value={f.flavor ?? ""} onChange={(e) => set("flavor", e.target.value)} /></Field>
          <Field label="Size"><Input value={f.size ?? ""} onChange={(e) => set("size", e.target.value)} /></Field>
          <Field label="Stock"><Input type="number" value={f.stock} onChange={(e) => set("stock", e.target.value)} /></Field>
        </div>

        <Field label="Main image URL"><Input value={f.main_image ?? ""} onChange={(e) => set("main_image", e.target.value)} /></Field>
        <Field label="Gallery image URLs (one per line)"><Textarea rows={3} value={f.gallery_images} onChange={(e) => set("gallery_images", e.target.value)} /></Field>

        <Field label="Usage instructions"><Textarea rows={3} value={f.usage_instructions ?? ""} onChange={(e) => set("usage_instructions", e.target.value)} /></Field>
        <Field label="Ingredients"><Textarea rows={3} value={f.ingredients ?? ""} onChange={(e) => set("ingredients", e.target.value)} /></Field>
        <Field label='Nutrition facts (JSON, e.g. {"protein":"24g"})'>
          <Textarea rows={4} value={f.nutrition_facts} onChange={(e) => set("nutrition_facts", e.target.value)} />
        </Field>
        <Field label='FAQs (JSON array, e.g. [{"q":"…","a":"…"}])'>
          <Textarea rows={4} value={f.faqs} onChange={(e) => set("faqs", e.target.value)} />
        </Field>

        <div className="flex items-center gap-3">
          <Switch checked={f.is_active} onCheckedChange={(v) => set("is_active", v)} />
          <Label>Active</Label>
        </div>

        <div className="space-y-4 rounded-md border bg-secondary/30 p-4">
          <div className="flex items-center gap-3">
            <Switch checked={!!f.subscription_enabled} onCheckedChange={(v) => set("subscription_enabled", v)} />
            <Label>Enable recurring purchase (Subscribe & save)</Label>
          </div>
          {f.subscription_enabled && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Discount %">
                <Input type="number" step="1" min={0} max={90} value={f.subscription_discount_percent}
                  onChange={(e) => set("subscription_discount_percent", e.target.value)} />
              </Field>
              <Field label="Intervals in days (comma-separated)">
                <Input placeholder="30,60,90" value={f.subscription_intervals}
                  onChange={(e) => set("subscription_intervals", e.target.value)} />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => nav("/admin/products")}>Cancel</Button>
          <Button variant="dark" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save product"}</Button>
        </div>
      </div>
    </div>
  );
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5"><Label>{label}</Label>{children}</div>
);

function safeJson(s: string) { try { return JSON.parse(s); } catch { return null; } }
