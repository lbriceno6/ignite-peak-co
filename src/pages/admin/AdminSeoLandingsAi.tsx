// Fase 20 — Admin UI: generate SEO landing pages from a keyword + intent.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Sparkles, ExternalLink, Trash2, Pencil, Copy } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { KIND_LABEL, LANDING_KINDS, landingPath, type LandingKind } from "@/lib/seoLanding";

type Filter = "all" | "draft" | "published";

export default function AdminSeoLandingsAi() {
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState<LandingKind>("objetivo");
  const [category, setCategory] = useState("");
  const [publish, setPublish] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [filter, setFilter] = useState<Filter>("all");

  const load = async () => {
    const [{ data: lp }, { data: js }] = await Promise.all([
      (supabase as any).from("seo_landing_pages").select("*").order("updated_at", { ascending: false }).limit(100),
      (supabase as any).from("ai_seo_landing_jobs").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setPages(lp ?? []);
    setJobs(js ?? []);
  };
  useEffect(() => { load(); }, []);

  const visiblePages = useMemo(
    () => pages.filter((p) => filter === "all" || (filter === "published" ? !!p.is_published : !p.is_published)),
    [pages, filter],
  );

  const generate = async () => {
    if (!keyword.trim()) { toast.error("Ingresa una palabra clave"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-landing-generate", {
        body: { keyword: keyword.trim(), kind, publish, category: category.trim() || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Landing creada como ${publish ? "publicada" : "borrador"}: ${landingPath(kind, (data as any)?.landing?.slug)}`);
      setKeyword("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Error al generar");
    } finally { setLoading(false); }
  };

  const togglePublish = async (id: string, v: boolean) => {
    const { error } = await (supabase as any).from("seo_landing_pages").update({ is_published: v, status: v ? "published" : "draft" }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(v ? "Publicada" : "Despublicada"); load(); }
  };

  const duplicate = async (p: any) => {
    const { id, created_at, updated_at, ...rest } = p;
    const copy = { ...rest, slug: `${p.slug}-copia`, title: `${p.title} (copia)`, is_published: false, status: "draft" };
    const { error } = await (supabase as any).from("seo_landing_pages").insert(copy);
    if (error) toast.error(error.message); else { toast.success("Landing duplicada como borrador"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar landing?")) return;
    const { error } = await (supabase as any).from("seo_landing_pages").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Eliminada"); load(); }
  };


  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary" />
        <h1 className="font-display text-3xl">Landings SEO con IA</h1>
      </div>
      <p className="text-muted-foreground">
        Genera landings optimizadas para buscadores a partir de una palabra clave. La IA crea título, meta, contenido y FAQs con schema.org.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Nueva landing</CardTitle>
          <CardDescription>Indica una palabra clave de búsqueda (ej. "proteína vegana", "ganar masa muscular", "creatina monohidratada").</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-[2fr,1fr,1fr,auto,auto]">
          <div>
            <Label>Palabra clave</Label>
            <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="ej. dolor de espalda" />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as LandingKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANDING_KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Categoría (opcional)</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ej. Columna y espalda" />
          </div>
          <div className="flex flex-col items-start gap-1">
            <Label>Publicar</Label>
            <Switch checked={publish} onCheckedChange={setPublish} />
          </div>
          <div className="flex items-end">
            <Button onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Generar con IA
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Landings</CardTitle>
          <CardDescription>{pages.length} páginas publicadas o en borrador.</CardDescription>
          <div className="flex gap-2 pt-2">
            {([["all", "Todos"], ["draft", "Borradores"], ["published", "Publicados"]] as [Filter, string][]).map(([v, l]) => (
              <Button key={v} size="sm" variant={filter === v ? "default" : "outline"} onClick={() => setFilter(v)}>{l}</Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {visiblePages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay landings.</p>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Actualizada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visiblePages.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[240px] truncate font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">{landingPath(p.kind, p.slug)}</TableCell>
                    <TableCell><Badge variant="outline">{KIND_LABEL[p.kind] ?? p.kind}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={p.source === "ai" ? "default" : "secondary"}>{p.source ?? "manual"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch checked={!!p.is_published} onCheckedChange={(v) => togglePublish(p.id, v)} />
                        <span className="text-xs text-muted-foreground">{p.is_published ? "Publicado" : "Borrador"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button asChild size="sm" variant="ghost" title="Editar">
                        <Link to={`/admin/ia-landings/${p.id}`}><Pencil size={14} /></Link>
                      </Button>
                      <Button asChild size="sm" variant="ghost" title="Ver">
                        <Link to={landingPath(p.kind, p.slug)} target="_blank"><ExternalLink size={14} /></Link>
                      </Button>
                      <Button size="sm" variant="ghost" title="Duplicar" onClick={() => duplicate(p)}>
                        <Copy size={14} />
                      </Button>
                      <Button size="sm" variant="ghost" title="Eliminar" onClick={() => remove(p.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>

      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de generaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin generaciones recientes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Palabra clave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Cuándo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="font-medium">{j.keyword}</TableCell>
                    <TableCell>{j.kind}</TableCell>
                    <TableCell>
                      <Badge variant={j.status === "done" ? "default" : j.status === "error" ? "destructive" : "secondary"}>
                        {j.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{j.model}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
