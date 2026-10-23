import Link from 'next/link';
export function HowItWorks() {
  return (
    <section className="platform-section" id="how">
      <div className="section-intro">
        <div>
          <span className="eyebrow">
            FROM YOUR CATALOGUE TO THEIR CONVERSATION
          </span>
          <h2>
            A little less admin.
            <br />A lot more <em>possibility.</em>
          </h2>
        </div>
        <p>
          One platform behind the scenes.
          <br />A distinct storefront for every seller.
        </p>
      </div>
      <div className="feature-grid">
        <article>
          <span>01 / YOUR OWN SPACE</span>
          <h3>Make the store yours.</h3>
          <p>
            Add your business details, upload your gadgets and set prices. Share
            a link that shows only your collection.
          </p>
          <Link href="/sign-up">Set up your storefront ↗</Link>
        </article>
        <article>
          <span>02 / EVERYTHING ACCOUNTED FOR</span>
          <h3>Keep stock in step.</h3>
          <p>
            Manage new and used devices, record in-store sales, and keep a
            history of inventory changes.
          </p>
        </article>
        <article>
          <span>03 / KEEP IT HUMAN</span>
          <h3>Let the chat do its thing.</h3>
          <p>
            Customers prepare an order or swap request. You confirm the details
            and agree next steps on WhatsApp.
          </p>
        </article>
      </div>
    </section>
  );
}
