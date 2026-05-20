// Client-side redirect gate: looks up the current path in seo_redirects and navigates if a match exists.
// True 301 status codes are not possible from SPA hosting; this provides an equivalent UX redirect.
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

type Redirect = { from_path: string; to_path: string };

export const RedirectGate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const mapRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("seo_redirects" as any)
        .select("from_path,to_path")
        .eq("active", true);
      if (!alive) return;
      const m = new Map<string, string>();
      ((data as any[]) ?? []).forEach((r: Redirect) => m.set(r.from_path, r.to_path));
      mapRef.current = m;
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const to = m.get(location.pathname);
    if (to && to !== location.pathname) navigate(to + location.search + location.hash, { replace: true });
  }, [location, navigate]);

  return null;
};
