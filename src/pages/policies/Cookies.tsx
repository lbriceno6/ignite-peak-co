import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { openCookiePreferences } from "@/lib/consent";
import { SEO } from "@/components/SEO";

const Cookies = () => (
  <Layout>
    <SEO title="Política de cookies" description="Cómo usamos cookies en Nutribatidos y cómo configurarlas." />
    <div className="container-x prose prose-neutral max-w-3xl py-10">
      <h1>Política de cookies</h1>
      <p>
        Usamos cookies para que la web funcione correctamente, recordar tu conversación con Lucía,
        analizar el rendimiento de la tienda y medir nuestras campañas. A continuación explicamos
        qué tipos de cookies usamos y para qué.
      </p>

      <h2>Tipos de cookies</h2>
      <ul>
        <li><strong>Necesarias.</strong> Indispensables para el carrito, la sesión y la navegación. Siempre activas.</li>
        <li><strong>Analíticas.</strong> Nos ayudan a entender qué páginas se visitan y mejorar la experiencia.</li>
        <li><strong>Marketing.</strong> Permiten medir campañas en Meta, Google, TikTok y otros canales.</li>
        <li><strong>Personalización.</strong> Recuerdan tu conversación con Lucía y mejoran recomendaciones.</li>
      </ul>

      <h2>¿Qué datos guarda Lucía?</h2>
      <p>
        Lucía guarda los mensajes de la conversación, la página desde donde se abrió, el producto
        consultado, una ubicación aproximada por país y datos básicos de dispositivo (móvil, tablet
        o desktop). Nunca guardamos tu ubicación GPS exacta, ni información sensible innecesaria.
        Tu dirección IP solo se procesa del lado servidor para detectar país y nunca se muestra en
        el panel de administración.
      </p>

      <h2>Cómo cambiar tus preferencias</h2>
      <p>
        Puedes cambiar tus preferencias en cualquier momento haciendo clic en el botón siguiente o
        en el enlace "Configurar cookies" del pie de página.
      </p>
      <Button onClick={() => openCookiePreferences()}>Configurar cookies</Button>

      <h2>Derechos</h2>
      <p>
        Puedes solicitar la eliminación de tus datos enviándonos un correo desde la página de
        contacto.
      </p>
    </div>
  </Layout>
);

export default Cookies;
