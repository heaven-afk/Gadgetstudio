import { auth, clerkClient } from '@clerk/nextjs/server';
import { sameOrigin } from '@/lib/request-security';
import { configured } from '@/lib/config';
export const dynamic = 'force-dynamic';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ action: string }> },
) {
  if (!sameOrigin(request))
    return Response.json(
      { error: 'Submit this action from this website.' },
      { status: 403 },
    );
  const { action } = await params;
  if (action !== 'signout')
    return Response.json(
      { error: 'Account forms are handled by Clerk. Open the sign-in page.' },
      { status: 404 },
    );
  if (!configured())
    return Response.json(
      { error: 'Seller accounts are not connected yet.' },
      { status: 503 },
    );
  try {
    const { sessionId } = await auth();
    if (sessionId)
      await (await clerkClient()).sessions.revokeSession(sessionId);
    return Response.json(
      { redirect: '/sign-in' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { error: 'Could not sign out. Please try again.' },
      { status: 503 },
    );
  }
}
