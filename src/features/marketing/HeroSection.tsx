import Link from 'next/link';
import './device-visuals.css';
export function HeroSection() {
  return (
    <section className="platform-hero">
      <div className="hero-text">
        <h1>
          Your store.
          <br />
          Their next
          <br />
          <em>upgrade.</em>
        </h1>
        <p>
          Give your gadgets a home of their own.
          <br />A beautiful storefront, organised stock, and orders
          <br className="wide" /> that come straight to your WhatsApp.
        </p>
        <div className="cta-row">
          <Link className="btn btn-orange" href="/sign-up">
            Let’s build your store
          </Link>
          <Link className="quiet-link" href="/sign-up">
            Create your account
          </Link>
        </div>
        <div className="hero-notes">
          <span>✓ Your own store link</span>
          <span>✓ New, used & refurbished</span>
        </div>
      </div>
      <div className="store-preview">
        <div className="preview-browser">
          <span className="preview-light light-coral" />
          <span className="preview-light light-amber" />
          <span className="preview-light light-green" />
          <small>your-store / your-world</small>
        </div>
        <div className="preview-store">
          <div className="mini-nav">
            <strong>
              heaven<span>.</span>
            </strong>
            <small>Your storefront. Your brand.</small>
            <span>♧</span>
          </div>
          <div className="mini-hero">
            <div>
              <span>GOOD TECH. YOUR WAY.</span>
              <h2>
                Find your
                <br />
                next <em>favourite.</em>
              </h2>
              <Link href="/sign-up">Create your collection</Link>
            </div>
            <img
              src="/assets/hero.png"
              alt="Premium phones, headphones and earbuds"
            />
          </div>
          <div className="mini-products">
            <div>
              <img src="/assets/phone.jpg" alt="Illustrative smartphone" />
              <span>New & pre-loved phones</span>
            </div>
            <div>
              <img src="/assets/headphones.jpg" alt="Illustrative headphones" />
              <span>Everyday essentials</span>
            </div>
          </div>
          <div className="mini-footer">
            <span className="green-dot" /> Your customer chooses. You take it
            from here.
          </div>
        </div>
        <div className="floating-note">
          <div>
            Your brand. Your link.
            <small>Your customer relationships.</small>
          </div>
        </div>
      </div>
    </section>
  );
}
