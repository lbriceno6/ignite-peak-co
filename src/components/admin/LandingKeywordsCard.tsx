// Palabra clave principal + secundarias, con sugerencias de IA.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

type Props = {
  landingId?: string;
  keyword: string;
  secondary: string[];
  onChange: (patch: { keyword?: string; keyword_secondary?: string[]; meta_title?: string; meta_description?: string }) => void;
};

export default function LandingKeywordsCard({ landingId, keyword, secondary, onChange }: Props) {
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [sug, setSug] = useState<any>(null);

  const addKw = (v: string) => {
    const k = v.trim().toLowerCase();
    if (!k || secondary.includes(k)) return;
    onChange({ keyword_secondary: [...secondary, k] });
    setDraft("");
  };

  const suggest = async () => {
    if (!landingId) { toast.error("Guarda la landing antes de pedir sugerencias"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-landing-generate", {
        body: { action: "suggest_keywords", landing_id: landingId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSug((data as any).suggestion ?? {});
      toast.success("Sugerencias listas");
    } catch (e: any) { toast.error(e?.message ?? "Error"); } finally { setLoading(false); }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base"><KeyRound size={16} className="text-primary" /> Palabras clave</CardTitle>
          <CardDescription>Una principal y varias secundarias. Sin repetirlas de forma forzada en el texto.</CardDescription>
        </div>
        <Button size="sm" variant="outline" onClick={suggest} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />} Sugerir con IA
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Palabra clave principal</Label>
          <Input value={keyword} onChange={(e) => onChange({ keyword: e.target.value })} placeholder="ej. vitaminas para el cansancio" />
        </div>

        <div className="space-y-2">
          <Label>Palabras clave secundarias</Label>
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKw(draft); } }}
              placeholder="Escribe y pulsa Enter"
            />
            <Button type="button" variant="secondary" onClick={() => addKw(draft)}>Añadir</Button>
          </div>
          {secondary.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {secondary.map((k) => (
                <Badge key={k} variant="secondary" className="gap-1">
                  {k}
                  <button type="button" onClick={() => onChange({ keyword_secondary: secondary.filter((x) => x !== k) })} aria-label={`Quitar ${k}`}>
                    <X size={12} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {sug && (
          <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
            {sug.primary && (
              <div className="flex items-center justify-between gap-2">
                <span>Principal sugerida: <strong>{sug.primary}</strong></span>
                <Button size="sm" variant="ghost" onClick={() => onChange({ keyword: sug.primary })}>Usar</Button>
              </div>
            )}
            {Array.isArray(sug.secondary) && sug.secondary.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {sug.secondary.map((k: string) => (
                  <Badge key={k} variant="outline" className="cursor-pointer" onClick={() => addKw(k)}>+ {k}</Badge>
                ))}
              </div>
            )}
            {(sug.meta_title || sug.meta_description) && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { onChange({ meta_title: sug.meta_title, meta_description: sug.meta_description }); toast.success("Meta aplicada"); }}
              >
                Aplicar meta title y description sugeridos
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
