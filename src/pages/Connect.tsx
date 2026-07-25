import { useState } from "react";
import { Copy, Check, Bot, RefreshCw, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SEO } from "@/components/SEO";
import { Layout } from "@/components/Layout";

const MCP_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/mcp`;

const Connect = () => {
  const [copied, setCopied] = useState(false);

  const copyUrl = async () => {
    await navigator.clipboard.writeText(MCP_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Layout>
      <SEO
        title="Conecta Nutribatidos a tu asistente IA"
        description="Conecta ChatGPT o Claude a tu cuenta de Nutribatidos para consultar productos y pedidos con lenguaje natural."
      />
      <main className="mx-auto max-w-3xl px-4 py-10 md:py-16">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3">
            <Sparkles className="mr-1 h-3 w-3" /> Integración con IA
          </Badge>
          <h1 className="text-3xl font-bold md:text-4xl">
            Conecta Nutribatidos a tu asistente
          </h1>
          <p className="mt-3 text-muted-foreground">
            Usa ChatGPT o Claude para buscar productos y consultar tus pedidos con tu propia cuenta.
          </p>
        </div>

        {/* MCP URL */}
        <Card className="mb-8 p-6">
          <div className="mb-3 text-sm font-medium text-muted-foreground">
            URL del servidor
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-3">
            <code className="flex-1 truncate text-sm">{MCP_URL}</code>
            <Button size="sm" onClick={copyUrl} variant={copied ? "default" : "outline"}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="ml-1.5">{copied ? "Copiado" : "Copiar"}</span>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Cada usuario aprueba el acceso a su cuenta al conectarse. El asistente actuará como tú.
          </p>
        </Card>

        {/* Connect */}
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Bot className="h-5 w-5" /> Cómo conectar
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 font-semibold">ChatGPT</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>
                  Abre{" "}
                  <a
                    className="text-primary underline"
                    href="https://chatgpt.com/#settings/Connectors/Advanced"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Configuración → Conectores → Avanzado
                  </a>{" "}
                  y activa el modo Desarrollador (revisa el aviso de riesgo).
                </li>
                <li>En el menú «+» del chat, activa el modo Desarrollador.</li>
                <li>Toca «Añadir fuentes» y luego «Conectar más».</li>
                <li>Ponle un nombre y pega la URL del servidor de arriba.</li>
                <li>Pídele a ChatGPT que use Nutribatidos.</li>
              </ol>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 font-semibold">Claude</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>
                  Abre{" "}
                  <a
                    className="text-primary underline"
                    href="https://claude.ai/customize/connectors?modal=add-custom-connector"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Conectores personalizados de Claude
                  </a>
                  .
                </li>
                <li>Ponle un nombre y pega la URL del servidor de arriba.</li>
                <li>Activa el conector desde el compositor del chat.</li>
                <li>Pídele a Claude que use Nutribatidos.</li>
              </ol>
            </Card>
          </div>
        </section>

        {/* Refresh */}
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <RefreshCw className="h-5 w-5" /> Actualizar tras cambios en la app
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            El asistente guarda en caché las herramientas disponibles. Si actualizamos la app, refresca la conexión para ver los cambios.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5">
              <h3 className="mb-3 font-semibold">ChatGPT</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Abre las preferencias de apps y selecciona Nutribatidos en «Apps activas».</li>
                <li>Junto a «Información», toca «Actualizar».</li>
                <li>Si la URL cambió, pega la más reciente de arriba.</li>
                <li>Abre un nuevo chat y pídele a ChatGPT que use Nutribatidos.</li>
              </ol>
            </Card>

            <Card className="p-5">
              <h3 className="mb-3 font-semibold">Claude</h3>
              <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                <li>Abre la página de Conectores y selecciona Nutribatidos.</li>
                <li>Actualiza las herramientas del conector.</li>
                <li>Si la URL cambió, pega la más reciente de arriba.</li>
                <li>Pídele a Claude que use Nutribatidos.</li>
              </ol>
            </Card>
          </div>
        </section>
      </main>
    </Layout>
  );
};

export default Connect;
