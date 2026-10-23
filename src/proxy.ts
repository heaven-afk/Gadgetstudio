import {
  NextResponse,
  type NextRequest,
  type NextFetchEvent,
} from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import { configured } from './lib/config';
const clerk = clerkMiddleware();
export default async function proxy(
  request: NextRequest,
  event: NextFetchEvent,
) {
  if (!configured()) return NextResponse.next();
  return clerk(request, event);
}
export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
