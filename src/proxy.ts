import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { configured } from './lib/config';
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!configured()) return response;
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );
  await client.auth.getClaims();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
export const config = {
  matcher: [
    '/dashboard',
    '/s/:path*',
    '/api/:path*',
    '/auth/:path*',
    '/update-password',
  ],
};
