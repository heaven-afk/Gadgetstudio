import { NextResponse } from 'next/server';
import { externalRequest } from '@/lib/request-security';
export function GET(request: Request) {
  return NextResponse.redirect(
    new URL('/sign-in?notice=auth-migrated', externalRequest(request).url),
  );
}
