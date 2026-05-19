import { PolicyPage } from "./PolicyPage";

export default function Shipping() {
  return (
    <PolicyPage title="Política de envío">
      <p>Hacemos entregas en Lima y provincias, trabajando con transportistas de confianza para mantener tus suplementos frescos y protegidos.</p>
      <h2>Tiempos de entrega</h2>
      <ul>
        <li>Lima Metropolitana: 1–3 días hábiles.</li>
        <li>Provincias: 3–7 días hábiles según la ciudad.</li>
      </ul>
      <h2>Responsabilidad del cliente</h2>
      <p>El cliente debe ingresar información de envío precisa al pagar. Voltra no se responsabiliza por retrasos causados por direcciones incorrectas o datos de contacto inaccesibles.</p>
      <h2>Confirmación</h2>
      <p>La confirmación del pedido y las actualizaciones de seguimiento se envían por WhatsApp o correo.</p>
    </PolicyPage>
  );
}
