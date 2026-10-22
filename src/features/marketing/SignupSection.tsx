import Link from 'next/link';
export function SignupSection() {
  return (
    <section className="closing-cta">
      <span className="eyebrow">SMALL BUSINESS. ROOM TO GROW.</span>
      <h2>
        Your gadgets deserve
        <br />a great <em>first impression.</em>
      </h2>
      <Link href="/sign-up" className="btn btn-orange">
        Create your store ↗
      </Link>
      <p>
        No customer accounts needed. Just your link, their picks, and a
        conversation.
      </p>
    </section>
  );
}
