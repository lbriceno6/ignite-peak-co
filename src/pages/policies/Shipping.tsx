import { PolicyPage } from "./PolicyPage";

export default function Shipping() {
  return (
    <PolicyPage title="Shipping policy">
      <p>We deliver across Lima and provinces, partnering with trusted carriers to keep your supplements fresh and protected in transit.</p>
      <h2>Delivery times</h2>
      <ul>
        <li>Lima Metropolitan: 1–3 business days.</li>
        <li>Provinces: 3–7 business days depending on the city.</li>
      </ul>
      <h2>Customer responsibility</h2>
      <p>The customer must enter accurate shipping information at checkout. Voltra is not responsible for delays caused by incorrect addresses or unreachable contact details.</p>
      <h2>Confirmation</h2>
      <p>Order confirmation and tracking updates are sent via WhatsApp or email.</p>
    </PolicyPage>
  );
}
