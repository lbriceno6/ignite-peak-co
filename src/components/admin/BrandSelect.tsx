import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { slugify } from "@/lib/slug";

const sb = supabase as any;

type BrandLite = { id: string; name: string };

type Props = {
  value: string | null;
  onChange: (id: string | null, brand?: BrandLite) => void;
};

export function BrandSelect({ value, onChange }: Props) {
  const [brands, setBrands] = useState<BrandLite[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    const { data } = await sb.from("brands").select("id,name").order("name");
    setBrands((data as BrandLite[]) ?? []);
  };
  useEffect(() => { load(); }, []);

  const quickCreate = async () => {
    if (!name.trim()) return toast.error("Ingresa un nombre.");
    setCreating(true);
    try {
      const slug = slugify(name);
      const { data, error } = await sb
        .from("brands")
        .insert({ name: name.trim(), slug, is_active: true })
        .select("id,name")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("Ya existe una marca con ese nombre/slug.");
        throw error;
      }
      toast.success("Marca creada");
      setBrands((p) => [...p, data].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(data.id, data);
      setOpen(false);
      setName("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1">
        <Select
          value={value ?? "__none__"}
          onValueChange={(v) => {
            if (v === "__none__") onChange(null);
            else onChange(v, brands.find((b) => b.id === v));
          }}
        >
          <SelectTrigger><SelectValue placeholder="Selecciona una marca" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin marca</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" className="shrink-0">
            <Plus size={14} /> Nueva marca
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nueva marca</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Nutribatidos"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Slug: <code>{name ? slugify(name) : "..."}</code>. Puedes editarla luego en el panel de marcas.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={creating}>Cancelar</Button>
            <Button type="button" variant="dark" onClick={quickCreate} disabled={creating}>
              {creating ? "Creando…" : "Crear marca"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
