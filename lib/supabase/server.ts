import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export async function authClient(){const jar=await cookies();return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{getAll(){return jar.getAll();},setAll(values){try{values.forEach(({name,value,options})=>jar.set(name,value,options));}catch{/* Server Components rely on proxy refresh. */}}}});}
export async function verifiedUser(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return null;const client=await authClient();const {data:{user},error}=await client.auth.getUser();if(error||!user?.email_confirmed_at)return null;return {userId:user.id,displayName:user.user_metadata?.full_name||user.email||'Seller'};}
