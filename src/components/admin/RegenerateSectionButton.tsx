// Botón "Regenerar sección" reutilizable dentro del editor de landings.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export type LandingSectionKey = "hero" | "body" | "nutrients" | "ingredients" | "faq" | "closing";

type Props = {
  landingId?: string;
  section: LandingSectionKey;
  onResult: (suggestion: any) => void;
  label?: string;
};

export default function RegenerateSectionButton({ landingId, section, onResult, label = "Regenerar sección" }: Props) {
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!landingId) { toast.error("Guarda la landing antes de regenerar"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-seo-landing-generate", {
        body: { action: "regenerate_section", landing_id: landingId, section },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      onResult((data as any).suggestion ?? {});
      toast.success("Sección regenerada (revisa y guarda)");
    } catch (e: any) { toast.error(e?.message ?? "Error"); } finally { setLoading(false); }
  };

  return (
    <Button type="button" size="sm" variant="outline" onClick={run} disabled={loading}>
      {loading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} {label}
    </Button>
  );
}
