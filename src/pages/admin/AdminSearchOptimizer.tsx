import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Trash2, Save, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Synonym = {
  id: string;
  term: string;
  synonyms: string[];
  boost_product_ids: string[];
  related_intent_slug: string | null;
  related_category_slug: string | null;
  notes: string | null;
  is_active: boolean;
};

type SearchEvent = {
  metadata: any;
  category_slug: string | null;
  created_at: string;
};

const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function emptyDraft(): Omit<Synonym, "id"> {
  return {
    term: "",
    synonyms: [],
    boost_product_ids: [],
    related_intent_slug: null,
    related_category_slug: null,
    notes: null,
    is_active: true,
  };
}

export default function AdminSearchOptimizer() {
  const [rows, setRows] = useState<Synonym[]>([]);
  const [events, setEvents] = useState<SearchEvent[]>([]);
  const [intents, setIntents] = useState<Array<{ slug: string; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ slug: string; name: string }>>([]);
  const [products, setProducts] = useState<Array<{ id: string; name: string; slug: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Omit<Synonym, "id">>(emptyDraft());
  const [synonymsInput, setSynonymsInput] = useState("");
  const [boostInput, setBoostInput] = useState("");
  const [windowDays, setWindowDays] = useState(30);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - windowDays * 86400000).toISOString();
    const [synRes, evRes, intRes, catRes, prodRes] = await Promise.all([
      supabase.from("search_synonyms").select("*").order("term"),
      supabase
        .from("lucia_events")
        .select("metadata,category_slug,created_at")
        .eq("event_type", "browse_search")
        .gte("created_at", since)
        .limit(5000),
      supabase.from("purchase_intents").select("slug,name").eq("is_active", true).order("priority"),
      supabase.from("categories").select("slug,name").order("name"),
      supabase
        .from("products")
        .select("id,name,slug")
        .eq("is_active", true)
        .eq("approval_status", "approved")
        .order("name")
        .limit(500),
    ]);
    setRows((synRes.data ?? []) as Synonym[]);
    setEvents((evRes.data ?? []) as SearchEvent[]);
    setIntents((intRes.data ?? []) as any);
    setCategories((catRes.data ?? []) as any);
    setProducts((prodRes.data ?? []) as any);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays]);

  const topSearches = useMemo(() => {
    const m = new Map<string, { count: number; with_result: number }>();
    for (const e of events) {
      const q = norm(String(e?.metadata?.search_query ?? ""));
      if (!q) continue;
      const cur = m.get(q) ?? { count: 0, with_result: 0 };
      cur.count += 1;
      if (e.category_slug || e?.metadata?.intent_slug) cur.with_result += 1;
      m.set(q, cur);
    }
    return [...m.entries()]
      .map(([q, v]) => ({ query: q, count: v.count, with_result: v.with_result, no_result: v.count - v.with_result }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  const noResultSearches = useMemo(
    () => topSearches.filter((s) => s.no_result > 0).sort((a, b) => b.no_result - a.no_result),
    [topSearches],
  );

  async function save() {
    const term = norm(draft.term);
    if (!term) {
      toast({ title: "Falta el término", variant: "destructive" });
      return;
    }
    const synonyms = synonymsInput
      .split(",")
      .map((s) => norm(s))
      .filter(Boolean);
    const boost_product_ids = boostInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      term,
      synonyms,
      boost_product_ids,
      related_intent_slug: draft.related_intent_slug || null,
      related_category_slug: draft.related_category_slug || null,
      notes: draft.notes || null,
      is_active: draft.is_active,
    };
    const { error } = await supabase.from("search_synonyms").upsert(payload, { onConflict: "term" });
    if (error) {
      toast({ title: "Error al guardar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Sinónimo guardado" });
    setDraft(emptyDraft());
    setSynonymsInput("");
    setBoostInput("");
    void load();
  }

  async function remove(id: string) {
    if (!confirm("¿Borrar este sinónimo?")) return;
    const { error } = await supabase.from("search_synonyms").delete().eq("id", id);
    if (error) {
      toast({ title: "Error al borrar", description: error.message, variant: "destructive" });
      return;
    }
    void load();
  }

  async function toggle(id: string, is_active: boolean) {
    const { error } = await supabase.from("search_synonyms").update({ is_active }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    void load();
  }

  function editRow(r: Synonym) {
    setDraft({
      term: r.term,
      synonyms: r.synonyms ?? [],
      boost_product_ids: r.boost_product_ids ?? [],
      related_intent_slug: r.related_intent_slug,
      related_category_slug: r.related_category_slug,
      notes: r.notes,
      is_active: r.is_active,
    });
    setSynonymsInput((r.synonyms ?? []).join(", "));
    setBoostInput((r.boost_product_ids ?? []).join(", "));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function promoteToSynonym(query: string) {
    setDraft({ ...emptyDraft(), term: query });
    setSynonymsInput("");
    setBoostInput("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Optimizador de búsqueda</h1>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 60, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={windowDays === d ? "default" : "outline"}
              onClick={() => setWindowDays(d)}
            >
              {d}d
            </Button>
          ))}
        </div>
      </header>

      <Card className="p-4 space-y-3">
        <h2 className="font-semibold text-sm">
          {draft.term && rows.some((r) => r.term === norm(draft.term))
            ? `Editar sinónimo: ${draft.term}`
            : "Nuevo sinónimo / boost"}
        </h2>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Término principal</label>
            <Input
              value={draft.term}
              onChange={(e) => setDraft({ ...draft, term: e.target.value })}
              placeholder="ej. proteína"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Variantes (separadas por coma)</label>
            <Input
              value={synonymsInput}
              onChange={(e) => setSynonymsInput(e.target.value)}
              placeholder="protein, proteinas, whey, suero"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Intención asociada</label>
            <select
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              value={draft.related_intent_slug ?? ""}
              onChange={(e) => setDraft({ ...draft, related_intent_slug: e.target.value || null })}
            >
              <option value="">— ninguna —</option>
              {intents.map((i) => (
                <option key={i.slug} value={i.slug}>
                  {i.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Categoría asociada</label>
            <select
              className="w-full h-9 rounded-md border bg-background px-2 text-sm"
              value={draft.related_category_slug ?? ""}
              onChange={(e) => setDraft({ ...draft, related_category_slug: e.target.value || null })}
            >
              <option value="">— ninguna —</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">
              IDs de productos a priorizar (separados por coma)
            </label>
            <Input
              value={boostInput}
              onChange={(e) => setBoostInput(e.target.value)}
              placeholder="uuid-producto-1, uuid-producto-2"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Tip: copia el ID desde /admin/productos. {products.length} productos disponibles.
            </p>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground">Notas internas</label>
            <Textarea
              rows={2}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
            />
            <span className="text-sm">Activo</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDraft(emptyDraft());
                setSynonymsInput("");
                setBoostInput("");
              }}
            >
              Limpiar
            </Button>
            <Button onClick={save}>
              <Save className="h-4 w-4 mr-1" /> Guardar
            </Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="top">
        <TabsList>
          <TabsTrigger value="top">Top búsquedas ({topSearches.length})</TabsTrigger>
          <TabsTrigger value="none">Sin resultado ({noResultSearches.length})</TabsTrigger>
          <TabsTrigger value="syn">Sinónimos ({rows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="top">
          <Card>
            {loading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Cargando…
              </div>
            ) : topSearches.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Sin búsquedas en la ventana.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Término</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Con resultado</TableHead>
                    <TableHead className="text-right">Sin resultado</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topSearches.slice(0, 50).map((s) => (
                    <TableRow key={s.query}>
                      <TableCell>{s.query}</TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                      <TableCell className="text-right">{s.with_result}</TableCell>
                      <TableCell className="text-right">
                        {s.no_result > 0 ? (
                          <Badge variant="destructive">{s.no_result}</Badge>
                        ) : (
                          s.no_result
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => promoteToSynonym(s.query)}>
                          <Plus className="h-3 w-3 mr-1" /> Crear sinónimo
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="none">
          <Card>
            {noResultSearches.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No hay búsquedas sin resultado 🎉
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Término</TableHead>
                    <TableHead className="text-right">Sin resultado</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noResultSearches.slice(0, 50).map((s) => (
                    <TableRow key={s.query}>
                      <TableCell>{s.query}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="destructive">{s.no_result}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{s.count}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" onClick={() => promoteToSynonym(s.query)}>
                          <Plus className="h-3 w-3 mr-1" /> Mapear ahora
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="syn">
          <Card>
            {rows.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Aún no creaste sinónimos. Usa el formulario arriba o promueve uno desde las pestañas de búsquedas.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Término</TableHead>
                    <TableHead>Variantes</TableHead>
                    <TableHead>Intención</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Boost</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.term}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {(r.synonyms ?? []).join(", ") || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{r.related_intent_slug ?? "—"}</TableCell>
                      <TableCell className="text-xs">{r.related_category_slug ?? "—"}</TableCell>
                      <TableCell className="text-xs">{(r.boost_product_ids ?? []).length}</TableCell>
                      <TableCell>
                        <Switch checked={r.is_active} onCheckedChange={(v) => toggle(r.id, v)} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => editRow(r)}>
                          Editar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
