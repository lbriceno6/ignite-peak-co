import { PolicyPage } from "./PolicyPage";

export default function Returns() {
  return (
    <PolicyPage title="Política de devoluciones">
      <p>Tu satisfacción importa. Aceptamos devoluciones solo cuando el producto llega dañado, incompleto o incorrecto.</p>
      <h2>Cómo reportar</h2>
      <ul>
        <li>Notifica a nuestro equipo dentro de las 48 horas de recibir tu pedido.</li>
        <li>Incluye el código de tu pedido y fotos del problema.</li>
      </ul>
      <h2>No elegible para devolución</h2>
      <p>Los productos abiertos o manipulados no pueden devolverse, salvo en casos de error verificado en el envío.</p>
      <h2>Reembolsos</h2>
      <p>Una vez aprobados, los reembolsos se procesan en 5–10 días hábiles al método de pago original.</p>
    </PolicyPage>
  );
}
