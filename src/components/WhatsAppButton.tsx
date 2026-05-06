import { MessageCircle } from "lucide-react";

export const WhatsAppButton = () => (
  <a
    href="https://wa.me/14155552671?text=Hi%20Voltra!"
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat on WhatsApp"
    className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-success text-background shadow-elevated animate-pulse-glow hover:scale-110 transition-smooth"
  >
    <MessageCircle size={26} />
  </a>
);
