import { verifiedUser } from '@/lib/auth';
import { storefront, emptyStudio } from '@/lib/storefront';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() {
  if (!(await verifiedUser()))
    return new Response(
      '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Sign in required</title></head><body><h1>Your workspace session needs refreshing.</h1><p>No store information has been loaded.</p><a href="/sign-in" target="_top">Open sign-in</a></body></html>',
      {
        status: 401,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      },
    );
  return storefront(emptyStudio(), true);
}
