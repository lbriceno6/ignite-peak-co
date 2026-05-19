import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Pencil, Star, X, Save } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Stars } from "@/components/Stars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  authorName?: string;
};

const StarPicker = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} type="button" onClick={() => onChange(i)}>
        <Star size={22} className={i <= value ? "fill-accent text-accent" : "text-muted-foreground/40"} />
      </button>
    ))}
  </div>
);

export const AdminReviewsDialog = ({
  open, onOpenChange, productId, productName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  productId: string | null;
  productName?: string;
}) => {
  const { user } = useAuth();
  const [list, setList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [authorEmail, setAuthorEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!productId) return;
    setLoading(true);
    const { data } = await supabase
      .from("reviews").select("*").eq("product_id", productId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Review[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name, email").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, `${p.full_name || "Cliente"}${p.email ? " · " + p.email : ""}`]));
      rows.forEach((r) => { r.authorName = map.get(r.user_id) ?? "Cliente"; });
    }
    setList(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (open && productId) { load(); reset(); }
    // eslint-disable-next-line
  }, [open, productId]);

  const reset = () => { setEditingId(null); setRating(5); setComment(""); setAuthorEmail(""); };

  const startEdit = (r: Review) => {
    setEditingId(r.id); setRating(r.rating); setComment(r.comment ?? ""); setAuthorEmail("");
  };

  const submit = async () => {
    if (!productId) return;
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("reviews")
          .update({ rating, comment: comment.trim() || null }).eq("id", editingId);
        if (error) throw error;
        toast.success("Reseña actualizada");
      } else {
        let targetUserId = user?.id ?? null;
        if (authorEmail.trim()) {
          const { data: p } = await supabase
            .from("profiles").select("id").eq("email", authorEmail.trim()).maybeSingle();
          if (!p) throw new Error("No se encontró un cliente con ese email");
          targetUserId = (p as any).id;
        }
        if (!targetUserId) throw new Error("Sesión no encontrada");
        const { error } = await supabase.from("reviews")
          .insert({ product_id: productId, user_id: targetUserId, rating, comment: comment.trim() || null });
        if (error) throw error;
        toast.success("Reseña creada");
      }
      reset();
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar esta reseña?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reseña eliminada");
    if (editingId === id) reset();
    load();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Valoraciones · {productName ?? ""}</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border bg-secondary/30 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider">
              {editingId ? "Editar reseña" : "Nueva reseña"}
            </p>
            {editingId && <Button size="sm" variant="ghost" onClick={reset}><X size={14} /> Cancelar</Button>}
          </div>
          <div>
            <Label className="text-xs">Valoración</Label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <Label className="text-xs">Comentario</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} className="mt-1" />
          </div>
          {!editingId && (
            <div>
              <Label className="text-xs">Email del cliente (opcional)</Label>
              <Input
                value={authorEmail}
                onChange={(e) => setAuthorEmail(e.target.value)}
                placeholder="Déjalo vacío para publicar como administrador"
                className="mt-1"
              />
            </div>
          )}
          <Button variant="accent" onClick={submit} disabled={saving}>
            {saving ? <><Loader2 size={14} className="animate-spin" /> Guardando…</> : <><Save size={14} /> {editingId ? "Guardar cambios" : "Crear reseña"}</>}
          </Button>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-semibold">Reseñas ({list.length})</p>
          {loading ? (
            <div className="py-6 text-center text-muted-foreground"><Loader2 className="mx-auto animate-spin" /></div>
          ) : list.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay reseñas.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((r) => (
                <li key={r.id} className="rounded border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{r.authorName}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Stars rating={r.rating} size={14} />
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">{r.comment}</p>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { Plus as _ };
