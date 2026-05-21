import { PolicyPage } from "./PolicyPage";

export default function Privacy() {
  return (
    <PolicyPage title="Política de privacidad">
      <p>Respetamos tu privacidad y nos comprometemos a proteger tus datos personales de forma transparente y segura.</p>

      <h2>Qué recopilamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, correo, teléfono, dirección de envío.</li>
        <li>Historial de pedidos y metadatos de pago (nunca almacenamos números completos de tarjeta).</li>
        <li>Datos de navegación: páginas visitadas, productos consultados, referrer y parámetros UTM de la campaña que te trajo.</li>
        <li>Datos técnicos del dispositivo: tipo (móvil/escritorio), navegador, sistema operativo e idioma.</li>
        <li>Ubicación aproximada (país/ciudad) derivada de tu dirección IP — nunca tu ubicación GPS exacta.</li>
        <li>Identificadores anónimos (cookies propias) para mantener tu sesión y reconocerte entre visitas.</li>
      </ul>

      <h2>Conversaciones con Lucía (asistente IA)</h2>
      <p>Cuando interactúas con nuestra asistente Lucía, guardamos el contenido del chat, el producto que estabas viendo, el canal por el que llegaste y datos técnicos del dispositivo para mejorar el servicio y darte una mejor recomendación. El proveedor de IA que responde se registra para auditoría interna.</p>

      <h2>Cookies y consentimiento</h2>
      <p>Usamos cookies necesarias para el funcionamiento del sitio y, con tu consentimiento, cookies de analítica, marketing y personalización. Puedes cambiar tu decisión en cualquier momento desde el enlace "Configurar cookies" en el pie de página. Lee también nuestra <a href="/politica-de-cookies">Política de cookies</a>.</p>

      <h2>Cómo lo usamos</h2>
      <p>Para procesar pedidos, brindar soporte, enviar actualizaciones transaccionales, medir el desempeño de campañas y mejorar tu experiencia de compra. No vendemos tus datos a terceros.</p>

      <h2>Tus derechos</h2>
      <p>Puedes acceder, actualizar o eliminar tus datos personales en cualquier momento desde tu perfil o contactando a nuestro equipo de soporte.</p>
    </PolicyPage>
  );
}
