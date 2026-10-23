import Link from 'next/link';
import { ClerkAccount } from './clerk-account';
import { configured } from '@/lib/config';
export function AuthPage({
  mode,
}: {
  mode: 'sign-in' | 'sign-up' | 'forgot-password' | 'update-password';
}) {
  return (
    <main className="auth-shell">
      <Link className="logo" href="/">
        heaven<span>.</span>
      </Link>
      <div className="auth-layout">
        <div className="auth-brand">
          <span className="eyebrow">A LITTLE TECH. YOUR OWN BUSINESS.</span>
          <h2>
            <span className="auth-headline-intro">
              More than
              <br />a catalogue.
            </span>
            <em className="auth-headline-chapter">
              Your next
              <br />
              chapter.
            </em>
          </h2>
          <img src="/assets/hero.png" alt="Floating gadget collection" />
          <Link href="/">Back to the homepage ↗</Link>
        </div>
        <ClerkAccount mode={mode} ready={configured()} />
      </div>
      <footer>
        Customer? Open your seller’s store link to shop. No account needed.
      </footer>
    </main>
  );
}
