import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Send, Wrench, Paperclip, X, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  actions?: AgentAction[];
  meta?: { provider?: string; model?: string; latency_ms?: number; tokens?: { input?: number; output?: number } };
};

type AgentAction = {
  action: "create" | "update" | "set_active" | "set_main_image" | "add_gallery" | "remove_gallery" | "enhance_main_image";
  product_id: string;
  name?: string;
  changed?: string[];
  is_active?: boolean;
  added?: number;
  background?: string;
};

const SESSION_ID = "admin-agent-" + Math.random().toString(36).slice(2, 10);

/** Extrae el mensaje real del cuerpo de un error de edge function (non-2xx). */
async function edgeErrorMessage(e: any): Promise<string> {
  try {
    if (e?.context && typeof e.context.json === "function") {
      const body = await e.context.json();
      if (body?.error) return body.error;
    }
  } catch { /* ignore */ }
  return e?.message ?? String(e);
}

const SUGGESTIONS = [
  "Lista los 5 productos con menos stock",
  "Sube el precio de la proteína whey a S/ 129.90",
  "Crea un borrador de producto: Creatina 300g a S/ 89.90",
  "Mejora con IA la foto de la creatina (fondo blanco ecommerce)",
];

const actionLabel = (a: AgentAction): string => {
  const name = a.name ? `“${a.name}”` : "producto";
  if (a.action === "create") return `Creó ${name}`;
  if (a.action === "set_active") return `${a.is_active ? "Activó" : "Desactivó"} ${name}`;
  if (a.action === "update") return `Editó ${name}${a.changed?.length ? ` (${a.changed.join(", ")})` : ""}`;
  if (a.action === "set_main_image") return `Cambió la imagen principal de ${name}`;
  if (a.action === "add_gallery") return `Agregó ${a.added ?? 1} imagen(es) a la galería de ${name}`;
  if (a.action === "remove_gallery") return `Quitó una imagen de la galería de ${name}`;
  if (a.action === "enhance_main_image") return `Mejoró con IA la imagen de ${name}`;
  return `Acción sobre ${name}`;
};

const AdminAgent = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "¡Hola! Soy tu agente de catálogo. Puedo buscar, crear, editar y activar/desactivar productos. " +
        "Dime qué necesitas, por ejemplo: «sube el precio de la creatina a S/ 89.90».",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attached, setAttached] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const uploadImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Archivo inválido", description: "Selecciona una imagen.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `agent-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("blog-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const url = supabase.storage.from("blog-images").getPublicUrl(path).data.publicUrl;
      setAttached({ url, name: file.name });
    } catch (e: any) {
      toast({ title: "Error al subir", description: e.message ?? String(e), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if ((!content && !attached) || sending) return;
    setInput("");
    const img = attached;
    setAttached(null);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    const msg = content || (img ? "(imagen adjunta)" : "");
    setMessages((prev) => [...prev, { role: "user", content: msg, imageUrl: img?.url }]);
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-agent", {
        body: { message: msg, history, session_id: SESSION_ID, image_url: img?.url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply ?? "(sin respuesta)",
          actions: data.actions ?? [],
          meta: { provider: data.provider, model: data.model, latency_ms: data.latency_ms, tokens: data.tokens },
        },
      ]);
    } catch (e: any) {
      const detail = await edgeErrorMessage(e);
      toast({ title: "Error", description: detail, variant: "destructive" });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ No pude procesar eso: " + detail },
      ]);
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Sparkles className="h-6 w-6 text-accent" /> Agente IA · Catálogo
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestiona el catálogo conversando. El agente busca, crea y edita productos (incluidas imágenes) por ti. Adjunta una foto con el clip 📎. Cada acción queda registrada.
        </p>
      </div>

      <Card className="flex h-[68vh] flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === "user" ? "bg-foreground text-background" : "bg-muted"
                }`}
              >
                {m.imageUrl && (
                  <img
                    src={m.imageUrl}
                    alt="adjunto"
                    className="mb-2 max-h-40 w-auto rounded-lg border border-border/40 object-cover"
                  />
                )}
                <div className="whitespace-pre-wrap">{m.content}</div>

                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 space-y-1 border-t border-border/50 pt-2">
                    {m.actions.map((a, j) => (
                      <div key={j} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Wrench className="h-3 w-3" />
                        <span>{actionLabel(a)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {m.meta?.provider && (
                  <div className="mt-1 text-[10px] opacity-60">
                    {m.meta.provider}/{m.meta.model} · {m.meta.tokens?.input ?? "-"}/{m.meta.tokens?.output ?? "-"} tokens
                    {m.meta.latency_ms != null ? ` · ${m.meta.latency_ms}ms` : ""}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">Pensando…</div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 border-t px-4 py-3">
            {SUGGESTIONS.map((s) => (
              <Badge
                key={s}
                variant="secondary"
                className="cursor-pointer hover:bg-secondary/70"
                onClick={() => send(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-2 border-t p-3">
          {attached && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-xs">
              <img src={attached.url} alt="adjunto" className="h-10 w-10 rounded object-cover" />
              <span className="flex-1 truncate text-muted-foreground">{attached.name}</span>
              <button onClick={() => setAttached(null)} className="text-muted-foreground hover:text-foreground" title="Quitar">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadImage(e.target.files?.[0])}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileRef.current?.click()}
              disabled={sending || uploading}
              title="Adjuntar imagen"
              className="shrink-0"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </Button>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe una instrucción… (Enter para enviar, Shift+Enter para salto de línea)"
              rows={2}
              className="resize-none"
              disabled={sending}
            />
            <Button onClick={() => send()} disabled={sending || (!input.trim() && !attached)} className="gap-1.5">
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AdminAgent;
