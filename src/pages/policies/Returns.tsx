import { PolicyPage } from "./PolicyPage";

export default function Returns() {
  return (
    <PolicyPage title="Returns policy">
      <p>Your satisfaction matters. We accept returns only when the product arrives damaged, incomplete, or incorrect.</p>
      <h2>How to report</h2>
      <ul>
        <li>Notify our team within 48 hours of receiving your order.</li>
        <li>Include your order code and photos of the issue.</li>
      </ul>
      <h2>Not eligible for return</h2>
      <p>Opened or tampered products cannot be returned, except in cases of verified shipping or fulfillment error.</p>
      <h2>Refunds</h2>
      <p>Once approved, refunds are processed within 5–10 business days to the original payment method.</p>
    </PolicyPage>
  );
}
