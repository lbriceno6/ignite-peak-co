import { PolicyPage } from "./PolicyPage";

export default function Privacy() {
  return (
    <PolicyPage title="Privacy policy">
      <p>We respect your privacy and are committed to protecting your personal data.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email, phone, shipping address.</li>
        <li>Order history and payment metadata (we never store full card numbers).</li>
      </ul>
      <h2>How we use it</h2>
      <p>To process orders, provide customer support, send transactional updates, and improve your shopping experience.</p>
      <h2>Your rights</h2>
      <p>You may access, update, or delete your personal data at any time from your profile or by contacting our support team.</p>
    </PolicyPage>
  );
}
