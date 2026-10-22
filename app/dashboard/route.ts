import {redirect} from 'next/navigation';
import {verifiedUser} from '@/lib/supabase/server';
import {configured} from '@/lib/config';
import {storefront} from '@/lib/storefront';
export const dynamic='force-dynamic';export const runtime='nodejs';
export async function GET(){if(!configured()||!await verifiedUser())redirect('/sign-in?next=/dashboard');return storefront();}
