import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import CategoriesLinksTable from "@/components/admin/CategoriesLinksTable";
import GoalsLinksTable from "@/components/admin/GoalsLinksTable";
import RedirectsManager from "@/components/admin/RedirectsManager";


type Row = {
  id: string;
  group: string;
  source: string; // table
  label: string;
  hrefLabel?: string; // label shown above href input
  href?: string | null;
  labelField: string;
  hrefField?: string;
  // optional second CTA
  label2?: string | null;
  href2?: string | null;
  labelField2?: string;
  hrefField2?: string;
};

const sb = supabase as any;

export default function AdminSiteLinks() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [nav, foot, cats, hero, goals, blocks] = await Promise.all([
      sb.from("nav_links").select("id,label,href,sort_order").order("sort_order"),
      sb.from("footer_links").select("id,label,href,column_index,sort_order").order("column_index").order("sort_order"),
      sb.from("categories").select("id,name,slug,type,sort_order").order("type").order("sort_order"),
      sb.from("hero_slides").select("id,title,primary_label,primary_href,secondary_label,secondary_href,sort_order").order("sort_order"),
      sb.from("goal_cards").select("id,name,cta_label,cta_href,sort_order").order("sort_order"),
      sb.from("home_blocks").select("id,block_key,block_type,title,cta_label,cta_href,cta2_label,cta2_href,sort_order").order("sort_order"),
    ]);

    const out: Row[] = [];

    (nav.data ?? []).forEach((r: any) =>
      out.push({ id: `nav:${r.id}`, group: "Top navigation", source: "nav_links", label: r.label ?? "", href: r.href ?? "", labelField: "label", hrefField: "href" }),
    );
    (foot.data ?? []).forEach((r: any) =>
      out.push({ id: `footer:${r.id}`, group: `Footer · column ${r.column_index}`, source: "footer_links", label: r.label ?? "", href: r.href ?? "", labelField: "label", hrefField: "href" }),
    );
    (cats.data ?? []).forEach((r: any) =>
      out.push({ id: `cat:${r.id}`, group: `Categories (${r.type})`, source: "categories", label: r.name ?? "", href: r.slug ?? "", hrefLabel: "Slug", labelField: "name", hrefField: "slug" }),
    );
    (hero.data ?? []).forEach((r: any) =>
      out.push({
        id: `hero:${r.id}`, group: `Hero slide · ${r.title || "(untitled)"}`, source: "hero_slides",
        label: r.primary_label ?? "", href: r.primary_href ?? "", labelField: "primary_label", hrefField: "primary_href",
        label2: r.secondary_label ?? "", href2: r.secondary_href ?? "", labelField2: "secondary_label", hrefField2: "secondary_href",
      }),
    );
    (goals.data ?? []).forEach((r: any) =>
      out.push({
        id: `goal:${r.id}`, group: `Goal card · ${r.name || "(untitled)"}`, source: "goal_cards",
        label: r.cta_label ?? "", href: r.cta_href ?? "", labelField: "cta_label", hrefField: "cta_href",
      }),
    );
    (blocks.data ?? []).forEach((r: any) => {
      if (r.cta_label !== null || r.cta_href !== null || r.cta2_label !== null || r.cta2_href !== null) {
        out.push({
          id: `block:${r.id}`, group: `Home section · ${r.title || r.block_type}`, source: "home_blocks",
          label: r.cta_label ?? "", href: r.cta_href ?? "", labelField: "cta_label", hrefField: "cta_href",
          label2: r.cta2_label ?? "", href2: r.cta2_href ?? "", labelField2: "cta2_label", hrefField2: "cta2_href",
        });
      }
    });

    setRows(out);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const save = async (r: Row) => {
    setSavingId(r.id);
    const rawId = r.id.split(":")[1];
    const payload: Record<string, any> = { [r.labelField]: r.label };
    if (r.hrefField) payload[r.hrefField] = r.href;
    if (r.labelField2) payload[r.labelField2] = r.label2;
    if (r.hrefField2) payload[r.hrefField2] = r.href2;
    const { error } = await sb.from(r.source).update(payload).eq("id", rawId);
    setSavingId(null);
    if (error) return toast.error(error.message);
    toast.success("Saved");
  };

  const grouped = rows.reduce<Record<string, Row[]>>((acc, r) => {
    (acc[r.group] ||= []).push(r);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Site links</h1>
        <p className="text-sm text-muted-foreground">
          Edit the label and destination of every reusable link across the site in one place.
        </p>
      </div>

      <CategoriesLinksTable />
      <GoalsLinksTable />
      <RedirectsManager />



      {Object.entries(grouped).map(([group, items]) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-base">{group}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((r) => (
              <div key={r.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                <div>
                  <Label className="text-xs">Label</Label>
                  <Input value={r.label} onChange={(e) => update(r.id, { label: e.target.value })} />
                </div>
                {r.hrefField && (
                  <div>
                    <Label className="text-xs">{r.hrefLabel ?? "Link / URL"}</Label>
                    <Input value={r.href ?? ""} onChange={(e) => update(r.id, { href: e.target.value })} />
                  </div>
                )}
                <Button onClick={() => save(r)} disabled={savingId === r.id} className="md:self-end">
                  {savingId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  <span className="ml-1">Save</span>
                </Button>

                {(r.labelField2 || r.hrefField2) && (
                  <>
                    <div>
                      <Label className="text-xs">Secondary label</Label>
                      <Input value={r.label2 ?? ""} onChange={(e) => update(r.id, { label2: e.target.value })} />
                    </div>
                    {r.hrefField2 && (
                      <div>
                        <Label className="text-xs">Secondary URL</Label>
                        <Input value={r.href2 ?? ""} onChange={(e) => update(r.id, { href2: e.target.value })} />
                      </div>
                    )}
                    <div />
                  </>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
