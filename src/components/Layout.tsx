import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useSiteContent } from "@/hooks/useSiteContent";
import { useLuciaSettings } from "@/hooks/useLuciaSettings";
import { pageShowsLucia } from "@/lib/lucia";
import { AnnouncementBar } from "./AnnouncementBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";
import { CartDrawer } from "./CartDrawer";
import { LuciaChat } from "./LuciaChat";

function FaviconUpdater() {
  const { content } = useSiteContent(["favicon_url"]);

  useEffect(() => {
    const url = content.favicon_url;
    if (!url) return;
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [content.favicon_url]);

  return null;
}

function FloatingAssistant() {
  const { settings, loading } = useLuciaSettings();
  const { pathname } = useLocation();
  if (loading) return null;
  const luciaHere = settings.enabled && pageShowsLucia(pathname, settings);
  if (luciaHere) return <LuciaChat />;
  if (luciaHere && settings.hide_whatsapp_button) return <LuciaChat />;
  // Lucía no aplica en esta ruta → muestra WhatsApp tradicional
  return <WhatsAppButton />;
}

export const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <FaviconUpdater />
    <AnnouncementBar />
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
    <FloatingAssistant />
    <CartDrawer />
  </div>
);
