import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';
import { configured } from './config';
export async function verifiedUser() {
  if (!configured()) return null;
  const session = await auth();
  if (!session.userId) return null;
  const user = await currentUser();
  if (
    !user ||
    !user.emailAddresses.some(
      (email) => email.verification?.status === 'verified',
    )
  )
    return null;
  return {
    userId: user.id,
    displayName: user.fullName || user.username || 'Seller',
  };
}
