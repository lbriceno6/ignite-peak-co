import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

type ProductLite = { id: string; name: string };

export function BlogAiGenerateDialog({ onCreated }: { onCreated?: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<ProductLite[]>([]);
  const [productName, setProductName] = useState("");
  const [tone, setTone] = useState("equilibrado");
  const [genImage, setGenImage] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || products.length) return;
    supabase
      .from("products")
      .select("id, name")
      .order("name", { ascending: true })
      .limit(500)
      .then(({ data }) => setProducts((data as ProductLite[]) ?? []));
  }, [open, products.length]);

  const generate = async () => {
    const name = productName.trim();
    if (!name) {
      toast.error("Menciona un producto.");
      return;
    }
    const match = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("blog-ai-generate", {
        body: {
          product_id: match?.id,
          product_name: match ? undefined : name,
          tone,
          generate_image: genImage,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const p = data.post;
      const { data: inserted, error: insErr } = await supabase
        .from("blog_posts")
        .insert({
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          content: p.content,
          category: p.category,
          read_time: p.read_time,
          cover_image: p.cover_image,
          is_published: false,
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      toast.success(`Borrador generado para “${data.product?.name ?? name}”`);
      setOpen(false);
      setProductName("");
      onCreated?.();
      navigate(`/admin/blog/${inserted.id}/edit`);
    } catch (e: any) {
      toast.error(e.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && setOpen(v)}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Sparkles size={16} /> Generar con IA
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generar artículo con IA</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Producto</Label>
            <Input
              list="ai-blog-products"
              placeholder="Menciona un producto…"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              disabled={loading}
            />
            <datalist id="ai-blog-products">
              {products.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              La IA generará el título, el contenido, la categoría y una imagen de portada. Se guarda como borrador para revisar.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Tono</Label>
            <Select value={tone} onValueChange={setTone} disabled={loading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico</SelectItem>
                <SelectItem value="equilibrado">Equilibrado</SelectItem>
                <SelectItem value="vendedor">Vendedor</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center justify-between rounded-md border p-3">
            <span className="text-sm">Generar imagen de portada</span>
            <Switch checked={genImage} onCheckedChange={setGenImage} disabled={loading} />
          </label>
        </div>
        <DialogFooter>
          <Button onClick={generate} disabled={loading} className="gap-1.5">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generando…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Generar borrador
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
