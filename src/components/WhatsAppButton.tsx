import { MessageCircle } from "lucide-react";
import { track } from "@/lib/analytics";

export const WhatsAppButton = () => (
  <a
    href="https://wa.me/51999999999?text=%C2%A1Hola%20Nutribatidos!%20Quiero%20informaci%C3%B3n"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chatear por WhatsApp"
    onClick={() => track("whatsapp_click", { source: "floating_button" })}
    className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-success text-background shadow-elevated animate-pulse-glow hover:scale-110 transition-smooth"
  >
    <MessageCircle size={26} />
  </a>
);
