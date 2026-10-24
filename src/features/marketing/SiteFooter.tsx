import Link from 'next/link';
export function SiteFooter() {
  return (
    <footer className="platform-footer">
      <Link href="/" className="logo">
        heaven<span>.</span>
      </Link>
      <span>Built for the way gadget businesses sell.</span>
      <Link href="/sign-in">Seller sign in</Link>
    </footer>
  );
}
