import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { PROVIDER_MODELS } from "@/lib/lucia";
import { VisitorsTab, AttributionTab } from "./AdminLuciaTracking";

type Settings = any;
type Prompt = any;
type Session = any;
type Message = any;

const PROVIDERS = [
  { value: "gemini", label: "Gemini (Lovable AI)" },
  { value: "openai", label: "OpenAI (Lovable AI)" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "claude", label: "Claude (Anthropic)" },
];

// ---------- Settings Tab ----------
const SettingsTab = () => {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("chat_ai_settings" as any)
      .select("*")
      .eq("id", 1)
      .maybeSingle()
      .then(({ data }) => setS(data));
  }, []);

  if (!s) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const update = (patch: Partial<Settings>) => setS({ ...s, ...patch });

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("chat_ai_settings" as any)
      .update({ ...s, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Guardado" });
  };

  const models = PROVIDER_MODELS[s.provider] || [];

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Activación</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Toggle label="Lucía activa" v={s.enabled} on={(v) => update({ enabled: v })} />
          <Toggle label="Mostrar en Home" v={s.show_on_home} on={(v) => update({ show_on_home: v })} />
          <Toggle label="Mostrar en productos" v={s.show_on_product} on={(v) => update({ show_on_product: v })} />
          <Toggle label="Mostrar en categorías" v={s.show_on_category} on={(v) => update({ show_on_category: v })} />
          <Toggle label="Mostrar en landings SEO" v={s.show_on_landing} on={(v) => update({ show_on_landing: v })} />
          <Toggle
            label="Ocultar botón flotante de WhatsApp donde Lucía esté activa"
            v={s.hide_whatsapp_button}
            on={(v) => update({ hide_whatsapp_button: v })}
          />
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">Proveedor IA</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Proveedor">
            <Select value={s.provider} onValueChange={(v) => update({ provider: v, model: PROVIDER_MODELS[v]?.[0]?.value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Modelo">
            <Select value={s.model} onValueChange={(v) => update({ model: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {models.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label={`Temperatura: ${s.temperature}`}>
            <Slider min={0} max={1} step={0.1} value={[s.temperature]} onValueChange={(v) => update({ temperature: v[0] })} />
          </Field>
          <Field label={`Máx tokens: ${s.max_tokens}`}>
            <Slider min={200} max={2000} step={50} value={[s.max_tokens]} onValueChange={(v) => update({ max_tokens: v[0] })} />
          </Field>
          <Field label={`Mensajes de historial: ${s.history_size}`}>
            <Slider min={2} max={30} step={1} value={[s.history_size]} onValueChange={(v) => update({ history_size: v[0] })} />
          </Field>
          <Toggle label="Guardar conversaciones" v={s.save_conversations} on={(v) => update({ save_conversations: v })} />
        </div>
        {(s.provider === "deepseek" || s.provider === "claude") && (
          <p className="text-xs text-muted-foreground">
            ⚠️ Asegúrate de tener configurada la clave{" "}
            <code>{s.provider === "deepseek" ? "DEEPSEEK_API_KEY" : "CLAUDE_API_KEY"}</code> en los secretos del proyecto.
          </p>
        )}
      </Card>

      <Card className="p-5 space-y-4">
        <h3 className="font-semibold">WhatsApp y burbuja proactiva</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Número WhatsApp (solo dígitos, con código país)">
            <Input value={s.whatsapp_number} onChange={(e) => update({ whatsapp_number: e.target.value })} />
          </Field>
          <Field label={`Delay burbuja proactiva (ms): ${s.proactive_bubble_delay_ms}`}>
            <Slider min={2000} max={30000} step={1000} value={[s.proactive_bubble_delay_ms]} onValueChange={(v) => update({ proactive_bubble_delay_ms: v[0] })} />
          </Field>
          <Toggle label="Activar burbuja proactiva" v={s.proactive_bubble_enabled} on={(v) => update({ proactive_bubble_enabled: v })} />
          <Field label="Nombre comercial">
            <Input value={s.assistant_name} onChange={(e) => update({ assistant_name: e.target.value })} />
          </Field>
          <Field label="Subtexto">
            <Input value={s.assistant_tagline} onChange={(e) => update({ assistant_tagline: e.target.value })} />
          </Field>
        </div>
      </Card>

      <Button onClick={save} disabled={saving}>{saving ? "Guardando…" : "Guardar configuración"}</Button>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

const Toggle = ({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) => (
  <label className="flex items-center justify-between rounded-md border p-3">
    <span className="text-sm">{label}</span>
    <Switch checked={v} onCheckedChange={on} />
  </label>
);

// ---------- Prompts Tab ----------
const PromptsTab = () => {
  const [list, setList] = useState<Prompt[]>([]);
  const [selected, setSelected] = useState<Prompt | null>(null);
  const [testInput, setTestInput] = useState("Quiero más energía para entrenar");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("chat_ai_prompts" as any).select("*").order("version", { ascending: false });
    setList((data ?? []) as any);
    if (!selected && data?.[0]) setSelected(data[0] as any);
  };
  useEffect(() => { load(); }, []);

  if (!selected) return <p className="text-sm text-muted-foreground">Cargando…</p>;

  const update = (patch: Partial<Prompt>) => setSelected({ ...selected, ...patch });

  const saveNewVersion = async () => {
    const maxV = Math.max(...list.map((p) => p.version), 0);
    const { error } = await supabase.from("chat_ai_prompts" as any).insert({
      name: selected.name,
      version: maxV + 1,
      is_active: false,
      system_prompt: selected.system_prompt,
      business_rules: selected.business_rules,
      safety_rules: selected.safety_rules,
      sales_rules: selected.sales_rules,
      fallback_rules: selected.fallback_rules,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Nueva versión guardada" }); load(); }
  };

  const activate = async () => {
    await supabase.from("chat_ai_prompts" as any).update({ is_active: false }).neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("chat_ai_prompts" as any).update({ is_active: true }).eq("id", selected.id);
    toast({ title: "Activado" });
    load();
  };

  const duplicate = async () => {
    const maxV = Math.max(...list.map((p) => p.version), 0);
    await supabase.from("chat_ai_prompts" as any).insert({
      ...selected,
      id: undefined,
      version: maxV + 1,
      is_active: false,
      created_at: undefined,
      updated_at: undefined,
    });
    toast({ title: "Duplicado" });
    load();
  };

  const updateInline = async () => {
    const { error } = await supabase.from("chat_ai_prompts" as any).update({
      system_prompt: selected.system_prompt,
      business_rules: selected.business_rules,
      safety_rules: selected.safety_rules,
      sales_rules: selected.sales_rules,
      fallback_rules: selected.fallback_rules,
      updated_at: new Date().toISOString(),
    }).eq("id", selected.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Actualizado" });
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: {
          session_id: "admin-test-" + Date.now(),
          message: testInput,
          context: { page: "/admin/chat-ia" },
          history: [],
          test_mode: true,
          override_prompt: selected,
        },
      });
      if (error) throw error;
      setTestResult(data);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setTesting(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">Versiones</h4>
          <Button size="sm" variant="outline" onClick={saveNewVersion}>+ Nueva</Button>
        </div>
        <div className="space-y-1">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`w-full rounded-md border p-2 text-left text-sm ${selected.id === p.id ? "bg-muted" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span>v{p.version}</span>
                {p.is_active && <Badge variant="default" className="text-[10px]">Activo</Badge>}
              </div>
              <div className="text-[11px] text-muted-foreground">{new Date(p.updated_at).toLocaleString()}</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={updateInline}>Guardar cambios</Button>
            <Button variant="outline" onClick={duplicate}>Duplicar versión</Button>
            <Button variant="outline" onClick={activate} disabled={selected.is_active}>Activar esta versión</Button>
          </div>

          <Tabs defaultValue="system">
            <TabsList>
              <TabsTrigger value="system">Personalidad</TabsTrigger>
              <TabsTrigger value="business">Negocio</TabsTrigger>
              <TabsTrigger value="safety">Seguridad</TabsTrigger>
              <TabsTrigger value="sales">Ventas</TabsTrigger>
              <TabsTrigger value="fallback">Fallback</TabsTrigger>
            </TabsList>
            <TabsContent value="system">
              <Textarea rows={12} value={selected.system_prompt} onChange={(e) => update({ system_prompt: e.target.value })} />
            </TabsContent>
            <TabsContent value="business">
              <Textarea rows={10} value={selected.business_rules} onChange={(e) => update({ business_rules: e.target.value })} />
            </TabsContent>
            <TabsContent value="safety">
              <Textarea rows={10} value={selected.safety_rules} onChange={(e) => update({ safety_rules: e.target.value })} />
            </TabsContent>
            <TabsContent value="sales">
              <Textarea rows={10} value={selected.sales_rules} onChange={(e) => update({ sales_rules: e.target.value })} />
            </TabsContent>
            <TabsContent value="fallback">
              <Textarea rows={6} value={selected.fallback_rules} onChange={(e) => update({ fallback_rules: e.target.value })} />
            </TabsContent>
          </Tabs>
        </Card>

        <Card className="p-4 space-y-3">
          <h4 className="font-semibold">Probar prompt</h4>
          <Textarea rows={2} value={testInput} onChange={(e) => setTestInput(e.target.value)} placeholder="Mensaje de prueba…" />
          <Button onClick={test} disabled={testing}>{testing ? "Probando…" : "Probar"}</Button>
          {testResult && (
            <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
              <div className="whitespace-pre-wrap">{testResult.reply}</div>
              <div className="text-xs text-muted-foreground">
                Proveedor: {testResult.provider} · Modelo: {testResult.model} · Tokens in/out: {testResult.tokens?.input ?? "-"}/{testResult.tokens?.output ?? "-"} · {testResult.latency_ms}ms
              </div>
              {testResult.products?.length > 0 && (
                <div className="text-xs"><strong>Productos:</strong> {testResult.products.map((p: any) => p.name).join(", ")}</div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

// ---------- Conversations Tab ----------
const ConversationsTab = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [open, setOpen] = useState<Session | null>(null);
  const [thread, setThread] = useState<Message[]>([]);
  const [filter, setFilter] = useState({ provider: "all", productSlug: "" });

  useEffect(() => {
    supabase
      .from("chat_ai_sessions" as any)
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(200)
      .then(({ data }) => setSessions((data ?? []) as any));
  }, []);

  useEffect(() => {
    if (!open) return;
    supabase
      .from("chat_ai_messages" as any)
      .select("*")
      .eq("session_id", open.session_id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setThread((data ?? []) as any));
  }, [open]);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filter.productSlug && !(s.current_product_id || "").includes(filter.productSlug)) return false;
      return true;
    });
  }, [sessions, filter]);

  const deleteSession = async (s: Session) => {
    if (!confirm("¿Eliminar esta conversación y todos sus mensajes?")) return;
    const { error: e1 } = await supabase.from("chat_ai_messages" as any).delete().eq("session_id", s.session_id);
    const { error: e2 } = await supabase.from("chat_ai_sessions" as any).delete().eq("id", s.id);
    if (e1 || e2) {
      toast({ title: "Error", description: (e1 || e2)?.message, variant: "destructive" });
      return;
    }
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
    if (open?.id === s.id) setOpen(null);
    toast({ title: "Conversación eliminada" });
  };

  const downloadSession = (s: Session, msgs: Message[]) => {
    const payload = {
      session: s,
      messages: msgs.map((m) => ({
        role: m.role,
        content: m.content,
        provider: m.provider,
        model: m.model,
        tokens_input: m.tokens_input,
        tokens_output: m.tokens_output,
        latency_ms: m.latency_ms,
        created_at: m.created_at,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lucia-${s.session_id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="grid gap-3 md:grid-cols-3">
          <Input
            placeholder="Filtrar por producto (id)…"
            value={filter.productSlug}
            onChange={(e) => setFilter({ ...filter, productSlug: e.target.value })}
          />
        </div>
      </Card>
      <div className="grid gap-2">
        {filtered.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-2 rounded-md border bg-card p-3 text-sm hover:bg-muted/50"
          >
            <button onClick={() => setOpen(s)} className="flex-1 text-left">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs">{s.session_id.slice(0, 8)}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.updated_at).toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {s.last_page} · {s.customer_name ?? "anónimo"}
              </div>
            </button>
            <Button
              size="icon"
              variant="ghost"
              onClick={async (e) => {
                e.stopPropagation();
                const { data } = await supabase
                  .from("chat_ai_messages" as any)
                  .select("*")
                  .eq("session_id", s.session_id)
                  .order("created_at", { ascending: true });
                downloadSession(s, (data ?? []) as any);
              }}
              title="Descargar"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); deleteSession(s); }}
              title="Eliminar"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-muted-foreground">No hay conversaciones todavía.</p>}
      </div>

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Conversación</DialogTitle></DialogHeader>
          {open && (
            <div className="flex flex-wrap items-center gap-2 border-b pb-3 text-xs text-muted-foreground">
              <span className="font-mono">{open.session_id.slice(0, 12)}</span>
              <span>·</span>
              <span>{open.last_page}</span>
              <span>·</span>
              <span>{open.customer_name ?? "anónimo"}</span>
              <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadSession(open, thread)}>
                  <Download className="mr-1 h-3 w-3" /> Descargar
                </Button>
                <Button size="sm" variant="outline" onClick={() => deleteSession(open)}>
                  <Trash2 className="mr-1 h-3 w-3 text-destructive" /> Eliminar
                </Button>
              </div>
            </div>
          )}
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {thread.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Sin mensajes en esta conversación.</p>
            )}
            {thread.map((m) => (
              <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-foreground text-background" : "bg-muted"}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.role === "assistant" && (
                    <div className="mt-1 text-[10px] opacity-70">
                      {m.provider}/{m.model} · {m.tokens_input ?? "-"}/{m.tokens_output ?? "-"} tokens · {m.latency_ms}ms
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ---------- Page ----------
const AdminChatAI = () => (
  <div className="space-y-4">
    <div>
      <h1 className="text-2xl font-bold">Chat IA · Lucía</h1>
      <p className="text-sm text-muted-foreground">Asesora virtual de Nutribatidos. Configura el proveedor IA, el prompt y revisa las conversaciones.</p>
    </div>
    <Tabs defaultValue="settings">
      <TabsList>
        <TabsTrigger value="settings">Configuración</TabsTrigger>
        <TabsTrigger value="prompts">Prompt</TabsTrigger>
        <TabsTrigger value="conversations">Conversaciones</TabsTrigger>
        <TabsTrigger value="visitors">Visitantes y origen</TabsTrigger>
        <TabsTrigger value="attribution">Atribución</TabsTrigger>
      </TabsList>
      <TabsContent value="settings"><SettingsTab /></TabsContent>
      <TabsContent value="prompts"><PromptsTab /></TabsContent>
      <TabsContent value="conversations"><ConversationsTab /></TabsContent>
      <TabsContent value="visitors"><VisitorsTab /></TabsContent>
      <TabsContent value="attribution"><AttributionTab /></TabsContent>
    </Tabs>
  </div>
);

export default AdminChatAI;
