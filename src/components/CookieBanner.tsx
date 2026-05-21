import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { acceptAll, getConsent, rejectAll, openCookiePreferences } from "@/lib/consent";

export const CookieBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const c = getConsent();
    setShow(!c.decided);
    const onChange = () => setShow(!getConsent().decided);
    window.addEventListener("consent:changed", onChange);
    return () => window.removeEventListener("consent:changed", onChange);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background/95 p-4 shadow-elevated backdrop-blur md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-2xl md:border">
      <div className="mb-3 text-sm">
        Usamos cookies para mejorar tu experiencia, recordar tu conversación con Lucía y analizar el
        rendimiento de la tienda. Puedes aceptar o configurar tus preferencias.{" "}
        <Link to="/politica-de-cookies" className="underline">
          Más información
        </Link>
        .
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => acceptAll()}>Aceptar todo</Button>
        <Button size="sm" variant="outline" onClick={() => rejectAll()}>Rechazar</Button>
        <Button size="sm" variant="ghost" onClick={() => openCookiePreferences()}>Configurar</Button>
      </div>
    </div>
  );
};
