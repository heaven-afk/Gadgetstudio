import 'server-only';
import { auth, currentUser, clerkClient } from '@clerk/nextjs/server';
import { configured } from './config';
import { database } from './database-server';
import {
  checkSellerSession,
  IdleSessionExpired,
} from '@/server/seller-session.mjs';
export async function verifiedUser({ touch = false } = {}) {
  if (!configured()) return null;
  const session = await auth();
  if (!session.userId || !session.sessionId) return null;
  const user = await currentUser();
  if (
    !user ||
    !user.emailAddresses.some(
      (email) => email.verification?.status === 'verified',
    )
  )
    return null;
  const idle = await checkSellerSession(database(), {
    sessionId: session.sessionId,
    userId: user.id,
    touch,
  });
  if (!idle.active) {
    // The local gate stays closed even if Clerk's revocation API is unavailable.
    try {
      await (await clerkClient()).sessions.revokeSession(session.sessionId);
    } catch {
      console.error('Could not revoke an expired seller session at Clerk');
    }
    throw new IdleSessionExpired();
  }
  return {
    userId: user.id,
    displayName: user.fullName || user.username || 'Seller',
    idle,
  };
}
