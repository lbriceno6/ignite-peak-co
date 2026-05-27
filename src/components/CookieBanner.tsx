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
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t bg-background/95 p-3 shadow-elevated backdrop-blur md:bottom-4 md:left-4 md:right-auto md:max-w-md md:rounded-2xl md:border md:p-4">
      <div className="mb-2 text-xs leading-snug sm:text-sm md:mb-3">
        Usamos cookies para mejorar tu experiencia, recordar tu conversación con Lucía y analizar el
        rendimiento de la tienda.{" "}
        <Link to="/politica-de-cookies" className="underline">
          Más información
        </Link>
        .
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <Button size="sm" onClick={() => acceptAll()} className="w-full sm:w-auto">Aceptar todo</Button>
        <Button size="sm" variant="outline" onClick={() => rejectAll()} className="w-full sm:w-auto">Rechazar</Button>
        <Button size="sm" variant="ghost" onClick={() => openCookiePreferences()} className="w-full sm:w-auto">Configurar</Button>
      </div>
    </div>
  );
};
