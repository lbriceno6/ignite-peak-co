import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { getConsent, setConsent, type CookieConsent } from "@/lib/consent";

const CATEGORIES = [
  {
    key: "necessary" as const,
    title: "Cookies necesarias",
    desc: "Necesarias para que la web y el carrito funcionen.",
    locked: true,
  },
  {
    key: "analytics" as const,
    title: "Cookies analíticas",
    desc: "Nos ayudan a saber qué páginas se visitan y mejorar la tienda.",
  },
  {
    key: "marketing" as const,
    title: "Cookies de marketing",
    desc: "Medimos campañas de Meta, Google, TikTok u otros canales.",
  },
  {
    key: "personalization" as const,
    title: "Cookies de personalización",
    desc: "Recordamos tu conversación con Lucía y mejoramos recomendaciones.",
  },
];

export const CookiePreferencesModal = () => {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<CookieConsent>(getConsent());

  useEffect(() => {
    const onOpen = () => {
      setState(getConsent());
      setOpen(true);
    };
    window.addEventListener("consent:open", onOpen);
    return () => window.removeEventListener("consent:open", onOpen);
  }, []);

  const save = () => {
    setConsent({
      analytics: state.analytics,
      marketing: state.marketing,
      personalization: state.personalization,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Preferencias de cookies</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div>
                <div className="text-sm font-semibold">{c.title}</div>
                <div className="text-xs text-muted-foreground">{c.desc}</div>
              </div>
              <Switch
                checked={c.locked ? true : (state as any)[c.key]}
                disabled={c.locked}
                onCheckedChange={(v) => setState({ ...state, [c.key]: v } as any)}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={save}>Guardar preferencias</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
