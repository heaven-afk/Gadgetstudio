import { storefront } from '@/lib/storefront';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export function GET() {
  return storefront();
}
