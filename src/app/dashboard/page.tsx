import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { UserButton } from '@clerk/nextjs';
import { verifiedUser } from '@/lib/auth';
import { configured } from '@/lib/config';
import { SessionRecovery } from '@/components/session-recovery';
import { IdleSessionExpired } from '@/server/seller-session.mjs';
import { ExpiredSession } from '@/components/expired-session';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  if (!configured()) redirect('/sign-in');
  let user;
  try {
    user = await verifiedUser();
  } catch (error) {
    if (error instanceof IdleSessionExpired) return <ExpiredSession />;
    throw error;
  }
  if (!user) {
    const reason = (await headers()).get('x-clerk-auth-reason');
    return (
      <SessionRecovery
        clockProblem={
          reason === 'session-token-nbf' ||
          reason === 'session-token-iat-in-the-future'
        }
      />
    );
  }
  return (
    <main className="seller-dashboard">
      <header>
        <a href="/">Heaven Gadget Studio</a>
        <UserButton />
        <a href="/dashboard/workspace" target="_blank" rel="noopener">
          Open workspace in a new tab
        </a>
      </header>
      <iframe title="Seller workspace" src="/dashboard/workspace" />
      <noscript>JavaScript is required to manage your store.</noscript>
    </main>
  );
}
