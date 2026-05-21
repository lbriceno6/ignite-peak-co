import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type LuciaSettings = {
  enabled: boolean;
  show_on_home: boolean;
  show_on_product: boolean;
  show_on_category: boolean;
  show_on_landing: boolean;
  hide_whatsapp_button: boolean;
  provider: string;
  model: string;
  temperature: number;
  max_tokens: number;
  history_size: number;
  save_conversations: boolean;
  whatsapp_number: string;
  proactive_bubble_enabled: boolean;
  proactive_bubble_delay_ms: number;
  assistant_name: string;
  assistant_tagline: string;
};

const DEFAULTS: LuciaSettings = {
  enabled: true,
  show_on_home: true,
  show_on_product: true,
  show_on_category: true,
  show_on_landing: true,
  hide_whatsapp_button: true,
  provider: "gemini",
  model: "google/gemini-2.5-flash",
  temperature: 0.7,
  max_tokens: 800,
  history_size: 10,
  save_conversations: true,
  whatsapp_number: "14155552671",
  proactive_bubble_enabled: true,
  proactive_bubble_delay_ms: 8000,
  assistant_name: "Lucía",
  assistant_tagline: "Tu asesora Nutri",
};

export function useLuciaSettings() {
  const [settings, setSettings] = useState<LuciaSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.from("chat_ai_settings" as any).select("*").eq("id", 1).maybeSingle();
      if (!alive) return;
      if (data) setSettings({ ...DEFAULTS, ...(data as any) });
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { settings, loading };
}
