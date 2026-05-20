import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw } from "lucide-react";
import { scanSensitiveClaims, type ClaimHit } from "@/lib/sensitiveClaims";

type Row = { entity: string; id: string; title: string; field: string; hits: ClaimHit[] };

export function ClaimsScannerTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const found: Row[] = [];
    const [{ data: products }, { data: landings }, { data: posts }, { data: cats }] = await Promise.all([
      supabase.from("products").select("id, name, description, short_description"),
      supabase.from("seo_landing_pages" as any).select("id, title, intro, long_description"),
      supabase.from("blog_posts").select("id, title, content, excerpt"),
      supabase.from("categories").select("id, name, description"),
    ]);
    const scan = (entity: string, id: string, title: string, field: string, text?: string | null) => {
      if (!text) return;
      const hits = scanSensitiveClaims(text);
      if (hits.length) found.push({ entity, id, title, field, hits });
    };
    (products ?? []).forEach((p: any) => {
      scan("product", p.id, p.name, "description", p.description);
      scan("product", p.id, p.name, "short_description", p.short_description);
    });
    ((landings as any[]) ?? []).forEach((l: any) => {
      scan("landing", l.id, l.title, "intro", l.intro);
      scan("landing", l.id, l.title, "long_description", l.long_description);
    });
    (posts ?? []).forEach((b: any) => {
      scan("blog", b.id, b.title, "content", b.content);
      scan("blog", b.id, b.title, "excerpt", b.excerpt);
    });
    (cats ?? []).forEach((c: any) => scan("category", c.id, c.name, "description", c.description));
    setRows(found);
    setRunning(false);
  };

  return (
    <div className="space-y-4">
      <Button variant="dark" onClick={run} disabled={running}>
        {running ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Escanear contenido
      </Button>
      <div className="rounded-lg border bg-background">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="p-3">Entidad</th><th className="p-3">Título</th><th className="p-3">Campo</th><th className="p-3">Hallazgos</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t align-top">
                <td className="p-3"><Badge variant="outline">{r.entity}</Badge></td>
                <td className="p-3 font-medium">{r.title}</td>
                <td className="p-3 text-xs text-muted-foreground">{r.field}</td>
                <td className="p-3 space-y-1">
                  {r.hits.map((h, j) => (
                    <div key={j} className="text-xs">
                      <Badge variant="destructive" className="mr-1">{h.match}</Badge>
                      → <span className="text-emerald-700">{h.rule.suggestion}</span>
                    </div>
                  ))}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !running && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Sin hallazgos</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
