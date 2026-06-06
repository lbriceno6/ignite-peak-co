import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Eye, EyeOff, Plus, Trash2, Wand2, RefreshCw, AlertTriangle, Link2 } from "lucide-react";
import { goalHref, isAutoGoalHref, normalizeGoal, suggestSpanishSlug } from "@/lib/goalLinks";

type Goal = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cta_label: string | null;
  cta_href: string | null;
  sort_order: number;
  is_active: boolean;
};

export default function AdminGoalCards() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [productCounts, setProductCounts] = useState<Record<string, { bySlug: number; byName: number }>>({});
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("goal_cards").select("*").order("sort_order").order("created_at");
    const list = (data as Goal[]) ?? [];
    setGoals(list);

    // Diagnóstico: contar productos por slug y por nombre visible
    const counts: Record<string, { bySlug: number; byName: number }> = {};
    await Promise.all(list.map(async (g) => {
      const [bySlug, byName] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("goal", g.slug),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("goal", g.name),
      ]);
      counts[g.id] = { bySlug: bySlug.count ?? 0, byName: byName.count ?? 0 };
    }));
    setProductCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const move = async (id: string, dir: -1 | 1) => {
    const idx = goals.findIndex((g) => g.id === id);
    const swap = goals[idx + dir];
    if (!swap) return;
    const cur = goals[idx];
    await Promise.all([
      supabase.from("goal_cards").update({ sort_order: swap.sort_order }).eq("id", cur.id),
      supabase.from("goal_cards").update({ sort_order: cur.sort_order }).eq("id", swap.id),
    ]);
    load();
  };

  const addNew = async () => {
    const nextOrder = (goals[goals.length - 1]?.sort_order ?? 0) + 1;
    const slug = `objetivo-${Date.now()}`;
    const { error } = await supabase.from("goal_cards").insert({
      slug, name: "Nuevo objetivo", description: "Descripción breve del objetivo.",
      cta_label: "Ver productos", cta_href: goalHref(slug), sort_order: nextOrder,
    });
    if (error) toast.error(error.message);
    else { toast.success("Objetivo agregado"); load(); }
  };

  // Sincroniza products.goal: convierte "Desarrollar músculo" → "desarrollar-musculo"
  const syncProducts = async () => {
    if (!confirm("Normalizar el campo 'objetivo' de los productos para que coincida con el slug de cada Goal card. ¿Continuar?")) return;
    setSyncing(true);
    try {
      const { data: products } = await supabase.from("products").select("id, goal").not("goal", "is", null);
      const rows = (products as { id: string; goal: string | null }[] | null) ?? [];
      let updated = 0;
      for (const p of rows) {
        if (!p.goal) continue;
        const norm = normalizeGoal(p.goal);
        const match = goals.find((g) =>
          g.slug === p.goal || g.slug === norm || normalizeGoal(g.name) === norm
        );
        if (match && match.slug !== p.goal) {
          const { error } = await supabase.from("products").update({ goal: match.slug }).eq("id", p.id);
          if (!error) updated++;
        }
      }
      toast.success(`Sincronización completa. ${updated} producto(s) actualizado(s).`);
      load();
    } catch (e: any) { toast.error(e.message); }
    finally { setSyncing(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Objetivos de compra</h1>
          <p className="text-muted-foreground">Edita las tarjetas de objetivos que aparecen en el Home. La URL se genera automáticamente desde el slug.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncProducts} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} /> Sincronizar productos con objetivos
          </Button>
          <Button variant="dark" onClick={addNew}><Plus size={16} /> Agregar objetivo</Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {goals.map((g, i) => (
            <GoalEditor
              key={g.id}
              goal={g}
              isFirst={i === 0}
              isLast={i === goals.length - 1}
              position={i + 1}
              counts={productCounts[g.id]}
              onChanged={load}
              onMoveUp={() => move(g.id, -1)}
              onMoveDown={() => move(g.id, 1)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GoalEditor({
  goal, isFirst, isLast, position, counts, onChanged, onMoveUp, onMoveDown,
}: {
  goal: Goal; isFirst: boolean; isLast: boolean; position: number;
  counts?: { bySlug: number; byName: number };
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [f, setF] = useState<Goal>(goal);
  const [saving, setSaving] = useState(false);
  const autoMode = useMemo(() => isAutoGoalHref(f.cta_href, f.slug), [f.cta_href, f.slug]);
  const [useCustomUrl, setUseCustomUrl] = useState(!autoMode);

  useEffect(() => { setF(goal); setUseCustomUrl(!isAutoGoalHref(goal.cta_href, goal.slug)); }, [goal]);
  const set = (k: keyof Goal, v: any) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(goal);

  const onNameChange = (name: string) => {
    setF((p) => {
      const isSlugTouched = p.slug && p.slug !== suggestSpanishSlug(p.name);
      const newSlug = isSlugTouched ? p.slug : suggestSpanishSlug(name);
      const newHref = !useCustomUrl ? goalHref(newSlug) : p.cta_href;
      return { ...p, name, slug: newSlug, cta_href: newHref };
    });
  };

  const onSlugChange = (slug: string) => {
    const cleaned = suggestSpanishSlug(slug);
    setF((p) => ({ ...p, slug: cleaned, cta_href: !useCustomUrl ? goalHref(cleaned) : p.cta_href }));
  };

  const applyAutoUrl = () => {
    setUseCustomUrl(false);
    set("cta_href", goalHref(f.slug));
  };

  const save = async () => {
    if (!f.slug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.slug)) {
      return toast.error("Slug inválido. Usa minúsculas, números y guiones (ej: desarrollar-musculo).");
    }
    setSaving(true);
    try {
      const finalHref = useCustomUrl ? (f.cta_href || goalHref(f.slug)) : goalHref(f.slug);
      const { error } = await supabase.from("goal_cards").update({
        name: f.name, description: f.description, slug: f.slug,
        cta_label: f.cta_label, cta_href: finalHref, is_active: f.is_active,
      }).eq("id", goal.id);
      if (error) throw error;

      // Mantener redirección 301 desde URL antigua: /category/goal-{slug} → /objetivo/{slug}
      const legacy = `/category/goal-${f.slug}`;
      const target = `/objetivo/${f.slug}`;
      await (supabase.from("seo_redirects" as any) as any)
        .upsert({ from_path: legacy, to_path: target, active: true }, { onConflict: "from_path" });
      // Si cambió el slug, redirigir también el slug viejo
      if (goal.slug && goal.slug !== f.slug) {
        await (supabase.from("seo_redirects" as any) as any).upsert(
          [
            { from_path: `/category/goal-${goal.slug}`, to_path: target, active: true },
            { from_path: `/objetivo/${goal.slug}`, to_path: target, active: true },
          ],
          { onConflict: "from_path" },
        );
      }

      toast.success("Objetivo guardado");
      onChanged();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const toggleActive = async (v: boolean) => {
    set("is_active", v);
    const { error } = await supabase.from("goal_cards").update({ is_active: v }).eq("id", goal.id);
    if (error) toast.error(error.message); else onChanged();
  };

  const remove = async () => {
    if (!confirm("¿Eliminar este objetivo?")) return;
    const { error } = await supabase.from("goal_cards").delete().eq("id", goal.id);
    if (error) toast.error(error.message);
    else { toast.success("Eliminado"); onChanged(); }
  };

  const totalProducts = (counts?.bySlug ?? 0) + (counts?.byName ?? 0);
  const slugEnIngles = /^(build|lose|burn|gain|boost|improve)-/.test(f.slug);

  return (
    <div className={`rounded-lg border bg-background p-5 ${!f.is_active ? "opacity-60" : ""}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums">#{position}</span>
          <p className="font-display text-lg leading-tight">{f.name || "Sin título"}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-2 flex items-center gap-2">
            {f.is_active ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground" />}
            <Switch checked={f.is_active} onCheckedChange={toggleActive} />
          </div>
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label="Subir"><ArrowUp size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label="Bajar"><ArrowDown size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Eliminar"><Trash2 size={16} /></Button>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={f.name} onChange={(e) => onNameChange(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Slug (se usa en la URL)</Label>
            <div className="flex gap-2">
              <Input value={f.slug} onChange={(e) => onSlugChange(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={() => onSlugChange(suggestSpanishSlug(f.name))} title="Sugerir slug en español">
                <Wand2 size={14} />
              </Button>
            </div>
            {slugEnIngles && (
              <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle size={12} /> Slug en inglés. Recomendado: usar español (ej: desarrollar-musculo).
              </p>
            )}
          </div>
        </div>
        <div>
          <Label className="text-xs">Subtítulo / descripción</Label>
          <Textarea rows={2} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Botón</p>
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={useCustomUrl} onCheckedChange={(v) => { setUseCustomUrl(v); if (!v) set("cta_href", goalHref(f.slug)); }} />
              Usar URL personalizada
            </label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Texto (ej: Ver productos)" value={f.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} />
            <div className="flex gap-2">
              <Input
                placeholder={goalHref(f.slug || "slug")}
                value={useCustomUrl ? (f.cta_href ?? "") : goalHref(f.slug)}
                disabled={!useCustomUrl}
                onChange={(e) => set("cta_href", e.target.value)}
              />
              {useCustomUrl && (
                <Button type="button" variant="outline" size="sm" onClick={applyAutoUrl} title="Usar URL automática">
                  <Link2 size={14} />
                </Button>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            URL automática: <code>{goalHref(f.slug || "slug")}</code>
          </p>
        </div>

        {/* Diagnóstico de productos */}
        <div className="rounded-md border bg-muted/20 p-3 text-xs">
          <div className="font-semibold uppercase tracking-wide text-muted-foreground mb-1">Diagnóstico</div>
          <div className="grid gap-1 sm:grid-cols-2">
            <span>Slug actual: <code>{goal.slug}</code></span>
            <span>URL: <code>{goalHref(goal.slug)}</code></span>
            <span>Productos con <code>goal = {goal.slug}</code>: <b>{counts?.bySlug ?? 0}</b></span>
            <span>Productos con <code>goal = "{goal.name}"</code>: <b>{counts?.byName ?? 0}</b></span>
          </div>
          {totalProducts === 0 ? (
            <p className="mt-2 flex items-center gap-1 text-amber-600">
              <AlertTriangle size={12} /> No hay productos conectados a este objetivo.
            </p>
          ) : (counts?.byName ?? 0) > 0 ? (
            <p className="mt-2 flex items-center gap-1 text-amber-600">
              <AlertTriangle size={12} /> Hay productos guardados con el texto visible. Usa "Sincronizar productos" para migrarlos al slug.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => { setF(goal); setUseCustomUrl(!isAutoGoalHref(goal.cta_href, goal.slug)); }} disabled={!dirty || saving}>Descartar</Button>
          <Button variant="dark" onClick={save} disabled={!dirty || saving}>{saving ? "Guardando…" : "Guardar"}</Button>
        </div>
      </div>
    </div>
  );
}
