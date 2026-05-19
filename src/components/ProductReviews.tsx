import { useEffect, useState } from "react";
import { Star, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Stars } from "@/components/Stars";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author?: { full_name: string | null } | null;
};

const StarPicker = ({ value, onChange }: { value: number; onChange: (n: number) => void }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((i) => (
      <button key={i} type="button" onClick={() => onChange(i)} aria-label={`${i} estrellas`}>
        <Star size={22} className={i <= value ? "fill-accent text-accent" : "text-muted-foreground/40"} />
      </button>
    ))}
  </div>
);

export const ProductReviews = ({ productId }: { productId: string }) => {
  const { user } = useAuth();
  const [list, setList] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("*, author:profiles!reviews_user_id_fkey(full_name)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    // Fallback in case the FK alias isn't recognized
    let rows = (data ?? []) as any[];
    if (!data) {
      const { data: simple } = await supabase
        .from("reviews").select("*").eq("product_id", productId).order("created_at", { ascending: false });
      rows = simple ?? [];
    }
    setList(rows as Review[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [productId]);

  const mine = user ? list.find((r) => r.user_id === user.id) : undefined;

  const startEdit = (r: Review) => {
    setEditingId(r.id);
    setRating(r.rating);
    setComment(r.comment ?? "");
    window.scrollTo({ top: window.scrollY - 60, behavior: "smooth" });
  };

  const reset = () => { setEditingId(null); setRating(5); setComment(""); };

  const submit = async () => {
    if (!user) return;
    if (rating < 1 || rating > 5) return toast.error("Elige una valoración de 1 a 5");
    setSaving(true);
    const id = editingId ?? mine?.id;
    const { error } = id
      ? await supabase.from("reviews").update({ rating, comment: comment.trim() || null }).eq("id", id)
      : await supabase.from("reviews").insert({ product_id: productId, user_id: user.id, rating, comment: comment.trim() || null });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(id ? "Reseña actualizada" : "Reseña publicada");
    reset();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar tu reseña?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reseña eliminada");
    if (editingId === id) reset();
    load();
  };

  const avg = list.length ? list.reduce((s, r) => s + r.rating, 0) / list.length : 0;

  return (
    <section className="container-x pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl uppercase">Valoraciones</h2>
          <div className="mt-2 flex items-center gap-3">
            <Stars rating={avg} size={18} />
            <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({list.length} reseñas)</span>
          </div>
        </div>
      </div>

      {user ? (
        <div className="mb-8 max-w-2xl rounded-lg border bg-secondary/30 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider">
              {editingId || mine ? "Edita tu reseña" : "Comparte tu opinión"}
            </p>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={reset}><X size={14} /> Cancelar</Button>
            )}
          </div>
          <div className="mt-3"><StarPicker value={rating} onChange={setRating} /></div>
          <Textarea
            rows={3}
            placeholder="Cuéntanos tu experiencia con este producto…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="mt-3"
            maxLength={1000}
          />
          <div className="mt-3 flex gap-2">
            <Button variant="accent" onClick={submit} disabled={saving}>
              {saving ? "Guardando…" : editingId || mine ? "Actualizar reseña" : "Publicar reseña"}
            </Button>
            {!editingId && mine && (
              <Button variant="ghost" onClick={() => startEdit(mine)}>
                <Pencil size={14} /> Editar la mía
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-8 max-w-2xl rounded-lg border bg-secondary/30 p-5 text-sm">
          <Link to="/auth" className="font-semibold text-accent hover:underline">Inicia sesión</Link>{" "}
          para dejar tu valoración.
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Cargando reseñas…</p>
      ) : list.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {list.map((r) => {
            const isMine = user && r.user_id === user.id;
            return (
              <li key={r.id} className="rounded-lg border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{r.author?.full_name?.trim() || "Cliente"}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Stars rating={r.rating} size={14} />
                      <span className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {isMine && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(r)} aria-label="Editar"><Pencil size={14} /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)} aria-label="Eliminar"><Trash2 size={14} /></Button>
                    </div>
                  )}
                </div>
                {r.comment && <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">{r.comment}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
