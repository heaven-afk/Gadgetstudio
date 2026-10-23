import Link from 'next/link';
export function SiteHeader() {
  return (
    <header className="platform-header">
      <Link href="/" className="logo">
        <b>h✳</b>heaven<span>.</span>
      </Link>
      <nav>
        <a href="#how">How it works</a>
        <Link href="/sign-up">Create a storefront ↗</Link>
      </nav>
      <div className="nav-actions">
        <Link href="/sign-in">Sign in</Link>
        <Link className="btn btn-dark" href="/sign-up">
          Create your store ↗
        </Link>
      </div>
    </header>
  );
}
