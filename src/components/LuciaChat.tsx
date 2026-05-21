import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Send, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import { useLuciaSettings } from "@/hooks/useLuciaSettings";
import { useLuciaContext } from "@/hooks/useLuciaContext";
import {
  QUICK_HOME,
  QUICK_PRODUCT,
  buildWhatsAppMessage,
  getOrCreateSessionId,
  pageShowsLucia,
  whatsappUrl,
} from "@/lib/lucia";
import { LuciaProductCard } from "./LuciaProductCard";

type Msg = {
  role: "user" | "assistant";
  content: string;
  products?: any[];
};

const greetingFor = (productName?: string | null) =>
  productName
    ? `Hola 😊 Soy Lucía. ¿Quieres que te ayude con **${productName}**? Puedo contarte beneficios, ingredientes, precio, stock o cómo comprarlo.`
    : "Hola 😊 Soy Lucía, tu asesora de Nutribatidos. Cuéntame qué estás buscando y te ayudo a elegir el producto más adecuado para ti.";

const proactiveFor = (productName?: string | null) =>
  productName ? "¿Tienes dudas sobre este producto? Te ayudo 😊" : "¿No sabes qué producto elegir? Yo te ayudo 😊";

export const LuciaChat = () => {
  const { settings, loading } = useLuciaSettings();
  const ctx = useLuciaContext();
  const [open, setOpen] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useMemo(() => getOrCreateSessionId(), []);

  const visible = !loading && settings.enabled && pageShowsLucia(ctx.page, settings);

  // Initial greeting per context
  useEffect(() => {
    setMessages([{ role: "assistant", content: greetingFor(ctx.productName) }]);
  }, [ctx.productName, ctx.page]);

  // Proactive bubble
  useEffect(() => {
    if (!visible || !settings.proactive_bubble_enabled || open) return;
    const t = setTimeout(() => setShowBubble(true), settings.proactive_bubble_delay_ms);
    return () => clearTimeout(t);
  }, [visible, settings.proactive_bubble_enabled, settings.proactive_bubble_delay_ms, open]);

  useEffect(() => {
    if (open) {
      setShowBubble(false);
      track("lucia_chat_open" as any, { page: ctx.page });
    }
  }, [open, ctx.page]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  if (!visible) return null;

  const quick = ctx.productSlug ? QUICK_PRODUCT : QUICK_HOME;

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    track("lucia_chat_message" as any, { page: ctx.page });

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          session_id: sessionId,
          message: content,
          context: {
            page: ctx.page,
            productSlug: ctx.productSlug,
            productId: ctx.productId,
            category: ctx.category,
            landing: ctx.landing,
          },
          history,
        },
      });
      if (error) throw error;
      const reply = (data as any)?.reply ?? "Lo siento, hubo un problema. Intenta de nuevo.";
      const products = (data as any)?.products ?? [];
      setMessages((m) => [...m, { role: "assistant", content: reply, products }]);
      if (products?.length) {
        track("lucia_product_recommendation" as any, { count: products.length });
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Tuvimos un inconveniente. ¿Quieres que te atienda por WhatsApp? Toca el botón abajo y te respondemos al toque 😊",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  const waHref = whatsappUrl(settings.whatsapp_number, buildWhatsAppMessage(ctx));

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
          {showBubble && (
            <button
              onClick={() => setOpen(true)}
              className="max-w-[240px] animate-in fade-in slide-in-from-bottom-2 rounded-2xl rounded-br-sm bg-background px-3 py-2 text-left text-sm shadow-elevated border"
            >
              {proactiveFor(ctx.productName)}
            </button>
          )}
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir chat con Lucía"
            className="group flex items-center gap-2 rounded-full bg-foreground py-1.5 pl-1.5 pr-4 shadow-elevated transition hover:scale-[1.02]"
          >
            <span className="relative grid h-12 w-12 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-rose-200 to-amber-200">
              <Sparkles size={22} className="text-rose-700" />
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-foreground bg-success" />
            </span>
            <span className="flex flex-col text-left text-background">
              <span className="text-sm font-bold leading-none">{settings.assistant_name}</span>
              <span className="text-[10px] leading-tight opacity-80">{settings.assistant_tagline}</span>
            </span>
          </button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed inset-x-2 bottom-2 z-50 flex flex-col rounded-2xl border bg-background shadow-elevated md:inset-auto md:bottom-5 md:right-5 md:w-[380px] h-[min(620px,calc(100dvh-1rem))]">
          {/* Header */}
          <div className="flex items-center gap-3 rounded-t-2xl bg-foreground p-3 text-background">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-rose-200 to-amber-200">
              <Sparkles size={18} className="text-rose-700" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-foreground bg-success" />
            </span>
            <div className="flex-1">
              <div className="text-sm font-bold leading-none">{settings.assistant_name}</div>
              <div className="text-[11px] opacity-80">En línea · {settings.assistant_tagline}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-background/10"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex flex-col gap-2", m.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm",
                    m.role === "user"
                      ? "rounded-br-sm bg-foreground text-background"
                      : "rounded-bl-sm bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
                {m.products?.map((p) => (
                  <LuciaProductCard key={p.slug} product={p} whatsappNumber={settings.whatsapp_number} />
                ))}
              </div>
            ))}
            {sending && (
              <div className="flex items-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Lucía está escribiendo…
                </div>
              </div>
            )}
          </div>

          {/* Quick replies */}
          <div className="flex flex-wrap gap-1.5 border-t bg-muted/30 px-3 py-2">
            {quick.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                disabled={sending}
                className="rounded-full border bg-background px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-50"
              >
                {q}
              </button>
            ))}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("lucia_whatsapp_click" as any, { source: "quick_reply", page: ctx.page })}
              className="inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-xs font-medium text-background hover:bg-success/90"
            >
              <MessageCircle size={12} /> WhatsApp
            </a>
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t p-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe a Lucía…"
              disabled={sending}
              className="h-9"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} className="h-9 w-9 shrink-0">
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
};
