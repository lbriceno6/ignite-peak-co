import { useEffect } from "react";
import { useSiteContent } from "@/hooks/useSiteContent";
import { AnnouncementBar } from "./AnnouncementBar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";
import { CartDrawer } from "./CartDrawer";

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

export const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen flex-col">
    <FaviconUpdater />
    <AnnouncementBar />
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
    <WhatsAppButton />
    <CartDrawer />
  </div>
);
