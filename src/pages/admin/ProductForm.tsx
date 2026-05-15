import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const empty = {
  name: "", slug: "", short_description: "", description: "",
  price: 0, sale_price: null as number | null,
  category: "", main_ingredient: "", goal: "", flavor: "", size: "",
  stock: 0, main_image: "", gallery_images: "" as any,
  is_active: true, badge: "",
  usage_instructions: "", ingredients: "",
  nutrition_facts: "", faqs: "",
};

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const nav = useNavigate();
  const [f, setF] = useState<any>(empty);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);

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
          <Field label="Badge"><Input placeholder="new / best-seller / sale" value={f.badge ?? ""} onChange={(e) => set("badge", e.target.value)} /></Field>
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
