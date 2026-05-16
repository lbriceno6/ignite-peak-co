import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Field = { key: string; label: string; help?: string; multiline?: boolean };

const GUIDES_FIELDS: Field[] = [
  { key: "home.guides.eyebrow", label: "Eyebrow (small label above title)", help: "Ej: Knowledge" },
  { key: "home.guides.title", label: "Section title", help: "Ej: Guides & Insights" },
  { key: "home.guides.subtitle", label: "Subtitle (optional)", multiline: true },
  { key: "home.guides.cta_label", label: "Link label", help: "Ej: All articles" },
  { key: "home.guides.cta_href", label: "Link URL", help: "Ej: /blog" },
];

export default function AdminHome() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("site_content").select("key,value");
    const m: Record<string, string> = {};
    (data ?? []).forEach((r: any) => { m[r.key] = r.value ?? ""; });
    setValues(m);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const saveAll = async (fields: Field[]) => {
    setSaving(true);
    try {
      const rows = fields.map((f) => ({ key: f.key, value: values[f.key] ?? "" }));
      const { error } = await supabase.from("site_content").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Saved");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl">Home content</h1>
        <p className="text-muted-foreground">Edit the texts that appear on the home page.</p>
      </div>

      <section className="rounded-lg border bg-background p-6">
        <header className="mb-4">
          <h2 className="font-display text-xl">Guides &amp; insights section</h2>
          <p className="text-sm text-muted-foreground">Appears near the bottom of the home page.</p>
        </header>

        {loading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid gap-4">
            {GUIDES_FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}</Label>
                {f.multiline ? (
                  <Textarea rows={2} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                ) : (
                  <Input value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
                )}
                {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <Button variant="dark" onClick={() => saveAll(GUIDES_FIELDS)} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          <strong className="text-foreground">Tip:</strong> to choose <em>which</em> 3 articles appear in this
          section and in which order, go to <a className="underline" href="/admin/blog">Blog posts</a> and toggle
          “Featured on home” on the posts you want.
        </div>
      </section>
    </div>
  );
}
