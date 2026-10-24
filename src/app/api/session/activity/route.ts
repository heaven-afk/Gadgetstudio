import { verifiedUser } from '@/lib/auth';
import { sameOrigin } from '@/lib/request-security';
import { IdleSessionExpired } from '@/server/seller-session.mjs';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function handle(request: Request) {
  if (request.method === 'POST' && !sameOrigin(request))
    return Response.json(
      { error: 'Submit this action from this website.' },
      { status: 403 },
    );
  const headers = { 'Cache-Control': 'no-store' };
  try {
    const user = await verifiedUser({ touch: request.method === 'POST' });
    if (!user)
      return Response.json(
        { error: 'Sign in to continue.' },
        { status: 401, headers },
      );
    return Response.json(user.idle, { headers });
  } catch (error) {
    if (error instanceof IdleSessionExpired)
      return Response.json(
        { error: error.message, code: 'SESSION_IDLE_EXPIRED' },
        { status: 401, headers },
      );
    return Response.json(
      { error: 'Could not check your session. Please try again.' },
      { status: 503, headers },
    );
  }
}
export { handle as GET, handle as POST };
