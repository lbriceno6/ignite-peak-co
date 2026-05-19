import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

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

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("goal_cards").select("*").order("sort_order").order("created_at");
    setGoals((data as Goal[]) ?? []);
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
    const slug = `goal-${Date.now()}`;
    const { error } = await supabase.from("goal_cards").insert({
      slug, name: "New goal", description: "Short description", cta_label: "Shop", cta_href: "/", sort_order: nextOrder,
    });
    if (error) toast.error(error.message);
    else { toast.success("Goal card added"); load(); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl">Goal cards</h1>
          <p className="text-muted-foreground">Edit the “Shop by goal” cards on the home page.</p>
        </div>
        <Button variant="dark" onClick={addNew}><Plus size={16} /> Add card</Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          {goals.map((g, i) => (
            <GoalEditor
              key={g.id}
              goal={g}
              isFirst={i === 0}
              isLast={i === goals.length - 1}
              position={i + 1}
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
  goal, isFirst, isLast, position, onChanged, onMoveUp, onMoveDown,
}: {
  goal: Goal; isFirst: boolean; isLast: boolean; position: number;
  onChanged: () => void; onMoveUp: () => void; onMoveDown: () => void;
}) {
  const [f, setF] = useState<Goal>(goal);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setF(goal); }, [goal]);
  const set = (k: keyof Goal, v: any) => setF((p) => ({ ...p, [k]: v }));
  const dirty = JSON.stringify(f) !== JSON.stringify(goal);

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from("goal_cards").update({
        name: f.name, description: f.description, slug: f.slug,
        cta_label: f.cta_label, cta_href: f.cta_href, is_active: f.is_active,
      }).eq("id", goal.id);
      if (error) throw error;
      toast.success("Card saved");
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
    if (!confirm("Delete this goal card?")) return;
    const { error } = await supabase.from("goal_cards").delete().eq("id", goal.id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); onChanged(); }
  };

  return (
    <div className={`rounded-lg border bg-background p-5 ${!f.is_active ? "opacity-60" : ""}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums">#{position}</span>
          <p className="font-display text-lg leading-tight">{f.name || "Untitled"}</p>
        </div>
        <div className="flex items-center gap-1">
          <div className="mr-2 flex items-center gap-2">
            {f.is_active ? <Eye size={14} className="text-muted-foreground" /> : <EyeOff size={14} className="text-muted-foreground" />}
            <Switch checked={f.is_active} onCheckedChange={toggleActive} />
          </div>
          <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={isFirst} aria-label="Move up"><ArrowUp size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={isLast} aria-label="Move down"><ArrowDown size={16} /></Button>
          <Button variant="ghost" size="icon" onClick={remove} aria-label="Delete"><Trash2 size={16} /></Button>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Title</Label>
            <Input value={f.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Slug (used for the URL)</Label>
            <Input value={f.slug} onChange={(e) => set("slug", e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Subtitle / description</Label>
          <Textarea rows={2} value={f.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Button</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Label (e.g. Shop)" value={f.cta_label ?? ""} onChange={(e) => set("cta_label", e.target.value)} />
            <Input placeholder="URL (e.g. /category/goal-build-muscle)" value={f.cta_href ?? ""} onChange={(e) => set("cta_href", e.target.value)} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => setF(goal)} disabled={!dirty || saving}>Discard</Button>
          <Button variant="dark" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : "Save card"}</Button>
        </div>
      </div>
    </div>
  );
}
