import {NextResponse} from 'next/server';
import {authClient} from '@/lib/supabase/server';
import {configured,safeNext} from '@/lib/config';
export const dynamic='force-dynamic';
export async function GET(request:Request){const url=new URL(request.url),code=url.searchParams.get('code');if(configured()&&code){const client=await authClient();const {error}=await client.auth.exchangeCodeForSession(code);if(!error)return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')),url.origin));}return NextResponse.redirect(new URL('/sign-in?error=link-expired',url.origin));}
