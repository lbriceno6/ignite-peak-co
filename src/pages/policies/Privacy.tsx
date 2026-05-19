import { PolicyPage } from "./PolicyPage";

export default function Privacy() {
  return (
    <PolicyPage title="Política de privacidad">
      <p>Respetamos tu privacidad y nos comprometemos a proteger tus datos personales.</p>
      <h2>Qué recopilamos</h2>
      <ul>
        <li>Datos de cuenta: nombre, correo, teléfono, dirección de envío.</li>
        <li>Historial de pedidos y metadatos de pago (nunca almacenamos números completos de tarjeta).</li>
      </ul>
      <h2>Cómo lo usamos</h2>
      <p>Para procesar pedidos, brindar soporte, enviar actualizaciones transaccionales y mejorar tu experiencia de compra.</p>
      <h2>Tus derechos</h2>
      <p>Puedes acceder, actualizar o eliminar tus datos personales en cualquier momento desde tu perfil o contactando a nuestro equipo de soporte.</p>
    </PolicyPage>
  );
}
