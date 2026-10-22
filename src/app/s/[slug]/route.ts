import { storefront } from '@/lib/storefront';
import { database } from '@/lib/database-server';
import { handleApi } from '@/server/api/index.mjs';
import { verifiedUser } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const url = new URL('/api/store/' + encodeURIComponent(slug), request.url);
    const result = await handleApi(
      new Request(url),
      database(),
      null,
      await verifiedUser(),
    );
    if (!result) throw new Error('Store response unavailable');
    if (!result.ok)
      return new Response(
        result.status === 404
          ? 'Store not found.'
          : 'This store is temporarily unavailable.',
        { status: result.status, headers: { 'Cache-Control': 'no-store' } },
      );
    return storefront(await result.json());
  } catch {
    return new Response(
      'This store is not connected yet. Please try again later.',
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
