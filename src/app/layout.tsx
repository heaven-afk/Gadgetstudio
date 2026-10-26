import { ClerkProvider } from '@clerk/nextjs';
import { configured } from '@/lib/config';
import type { Metadata } from 'next';
import './platform.css';
import { SessionSecurity } from '@/components/session-security';
export const metadata: Metadata = {
  title: {
    default: 'Heaven — A better way to sell gadgets',
    template: '%s · Heaven',
  },
  description:
    'Your own gadget storefront. Clear inventory, device swaps and orders sent to your WhatsApp.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        {configured() ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            signInFallbackRedirectUrl="/dashboard"
            signUpFallbackRedirectUrl="/dashboard"
          >
            <SessionSecurity>{children}</SessionSecurity>
          </ClerkProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
