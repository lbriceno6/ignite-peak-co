import { useEffect, useState } from "react";
import { Star, Trash2, Pencil, X, ThumbsUp, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  is_published: boolean;
  helpful_count: number;
  author?: { full_name: string | null } | null;
  iVoted?: boolean;
};

type SortKey = "recent" | "helpful" | "rating";

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
  const [sort, setSort] = useState<SortKey>("recent");
  const [canReview, setCanReview] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as Review[];
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name").in("id", ids);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
      rows.forEach((r) => { r.author = { full_name: map.get(r.user_id) ?? null }; });
    }
    if (user && rows.length) {
      const { data: votes } = await supabase
        .from("review_helpful_votes")
        .select("review_id")
        .eq("user_id", user.id)
        .in("review_id", rows.map((r) => r.id));
      const set = new Set((votes ?? []).map((v: any) => v.review_id));
      rows.forEach((r) => { r.iVoted = set.has(r.id); });
    }
    setList(rows);
    setLoading(false);
  };

  const checkPurchase = async () => {
    if (!user) { setCanReview(false); return; }
    const { data } = await supabase.rpc("user_has_confirmed_purchase", {
      _user_id: user.id, _product_id: productId,
    });
    setCanReview(!!data);
  };

  useEffect(() => { load(); checkPurchase(); /* eslint-disable-next-line */ }, [productId, user?.id]);

  const mine = user ? list.find((r) => r.user_id === user.id) : undefined;

  const startEdit = (r: Review) => {
    setEditingId(r.id);
    setRating(r.rating);
    setComment(r.comment ?? "");
  };

  const reset = () => { setEditingId(null); setRating(mine?.rating ?? 5); setComment(mine?.comment ?? ""); };

  const submit = async () => {
    if (!user) return;
    if (rating < 1 || rating > 5) return toast.error("Elige una valoración de 1 a 5");
    setSaving(true);
    const id = editingId ?? mine?.id;
    const { error } = id
      ? await supabase.from("reviews").update({ rating, comment: comment.trim() || null }).eq("id", id)
      : await supabase.from("reviews").insert({ product_id: productId, user_id: user.id, rating, comment: comment.trim() || null });
    setSaving(false);
    if (error) {
      const msg = /row-level security|violates/i.test(error.message)
        ? "Necesitas una compra confirmada de este producto para valorarlo."
        : error.message;
      return toast.error(msg);
    }
    toast.success(id ? "Reseña actualizada" : "Reseña publicada");
    setEditingId(null);
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

  const toggleHelpful = async (r: Review) => {
    if (!user) return toast.error("Inicia sesión para votar");
    if (r.user_id === user.id) return;
    if (r.iVoted) {
      const { error } = await supabase.from("review_helpful_votes")
        .delete().eq("review_id", r.id).eq("user_id", user.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("review_helpful_votes")
        .insert({ review_id: r.id, user_id: user.id });
      if (error) return toast.error(error.message);
    }
    load();
  };

  // Prefill form with existing review when present
  useEffect(() => {
    if (mine && editingId === null) { setRating(mine.rating); setComment(mine.comment ?? ""); }
  }, [mine?.id]); // eslint-disable-line

  const visible = list.filter((r) => r.is_published || r.user_id === user?.id);
  const sorted = [...visible].sort((a, b) => {
    if (sort === "helpful") return (b.helpful_count - a.helpful_count) || (+new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "rating") return (b.rating - a.rating) || (+new Date(b.created_at) - +new Date(a.created_at));
    return +new Date(b.created_at) - +new Date(a.created_at);
  });

  const avg = visible.length ? visible.reduce((s, r) => s + r.rating, 0) / visible.length : 0;

  return (
    <section className="container-x pb-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl uppercase">Valoraciones</h2>
          <div className="mt-2 flex items-center gap-3">
            <Stars rating={avg} size={18} />
            <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
            <span className="text-sm text-muted-foreground">({visible.length} reseñas)</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground uppercase">Ordenar</span>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Más recientes</SelectItem>
              <SelectItem value="helpful">Más útiles</SelectItem>
              <SelectItem value="rating">Mayor calificación</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {user ? (
        canReview || mine ? (
          <div className="mb-8 max-w-2xl rounded-lg border bg-secondary/30 p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold uppercase tracking-wider">
                {mine ? "Edita tu reseña" : "Comparte tu opinión"}
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
                {saving ? "Guardando…" : mine ? "Actualizar mi reseña" : "Publicar reseña"}
              </Button>
              {mine && (
                <Button variant="ghost" onClick={() => remove(mine.id)}>
                  <Trash2 size={14} /> Eliminar
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="mb-8 max-w-2xl rounded-lg border bg-secondary/30 p-5 text-sm text-muted-foreground">
            Solo los clientes con una <strong>compra confirmada</strong> de este producto pueden dejar una valoración.
          </div>
        )
      ) : (
        <div className="mb-8 max-w-2xl rounded-lg border bg-secondary/30 p-5 text-sm">
          <Link to="/auth" className="font-semibold text-accent hover:underline">Inicia sesión</Link>{" "}
          para dejar tu valoración.
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Cargando reseñas…</p>
      ) : sorted.length === 0 ? (
        <p className="text-muted-foreground">Aún no hay reseñas. ¡Sé el primero en opinar!</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sorted.map((r) => {
            const isMine = user && r.user_id === user.id;
            return (
              <li key={r.id} className={`rounded-lg border bg-background p-4 ${!r.is_published ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {r.author?.full_name?.trim() || "Cliente"}
                      <BadgeCheck size={14} className="text-accent" aria-label="Compra verificada" />
                      {!r.is_published && <span className="text-xs text-muted-foreground">(oculta)</span>}
                    </p>
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
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant={r.iVoted ? "accent" : "ghost"}
                    onClick={() => toggleHelpful(r)}
                    disabled={!!isMine}
                  >
                    <ThumbsUp size={14} /> Útil ({r.helpful_count})
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
