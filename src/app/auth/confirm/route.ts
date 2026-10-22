import { NextResponse } from 'next/server';
import { authClient } from '@/lib/supabase/server';
import { configured, safeNext } from '@/lib/config';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const url = new URL(request.url),
    token = url.searchParams.get('token_hash'),
    type = url.searchParams.get('type');
  if (
    configured() &&
    token &&
    ['signup', 'email', 'recovery'].includes(type || '')
  ) {
    const client = await authClient();
    const { error } = await client.auth.verifyOtp({
      token_hash: token,
      type: type as 'signup' | 'email' | 'recovery',
    });
    if (!error)
      return NextResponse.redirect(
        new URL(
          type === 'recovery'
            ? '/update-password'
            : safeNext(url.searchParams.get('next')),
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL('/sign-in?error=link-expired', url.origin),
  );
}
