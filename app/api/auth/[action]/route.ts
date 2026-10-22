import {sameOrigin} from '@/lib/request-security';
import {authClient} from '@/lib/supabase/server';
import {configured,siteUrl} from '@/lib/config';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{action:string}>}){
 if(!sameOrigin(request))return Response.json({error:'Submit this form from this website.'},{status:403});
 if(!configured())return Response.json({error:'Seller accounts are not connected yet.'},{status:503});
 const {action}=await params;
 try{
  const client=await authClient();
  if(action==='signout'){const {error}=await client.auth.signOut();if(error)throw error;return Response.json({redirect:'/sign-in'});}
  if(Number(request.headers.get('content-length')||0)>8192)return Response.json({error:'Invalid form.'},{status:413});
  const raw=await request.text();if(raw.length>8192)return Response.json({error:'Invalid form.'},{status:413});
  const value=JSON.parse(raw);const email=typeof value.email==='string'?value.email.trim().toLowerCase():'';
  const password=typeof value.password==='string'?value.password:'';
  if(action!=='update-password'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254))return Response.json({error:'Enter a valid email address.'},{status:400});
  if(action!=='forgot-password'&&(password.length>(128)||password.length<(action==='sign-in'?1:12)))return Response.json({error:'Use a password of 12–128 characters.'},{status:400});
  if(action==='sign-in'){const {error}=await client.auth.signInWithPassword({email,password});if(error)return Response.json({error:'Could not sign in. Check your email and password, and confirm your email first.'},{status:400});return Response.json({redirect:'/dashboard'});}
  if(action==='sign-up'){
   const name=typeof value.name==='string'?value.name.trim():'';if(!name||name.length>100)return Response.json({error:'Enter your name.'},{status:400});
   const {error}=await client.auth.signUp({email,password,options:{data:{full_name:name},emailRedirectTo:siteUrl()+'/auth/callback'}});
   if(error)return Response.json({error:'Registration could not be completed. Check the details or try again later.'},{status:400});
   return Response.json({message:'Check your email for a confirmation link. If you already have an account, sign in or reset your password.'});
  }
  if(action==='forgot-password'){
   const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:siteUrl()+'/auth/callback?next=/update-password'});
   if(error)return Response.json({error:'Recovery is temporarily unavailable. Please try again later.'},{status:429});
   return Response.json({message:'If an account exists, a recovery link will be sent. Check your inbox and spam folder.'});
  }
  if(action==='update-password'){
   const {data:{user},error:identityError}=await client.auth.getUser();if(identityError||!user)return Response.json({error:'Open a valid recovery link or sign in before changing your password.'},{status:401});
   const {error}=await client.auth.updateUser({password});if(error)return Response.json({error:'The password could not be updated. Try a different password or a new recovery link.'},{status:400});
   return Response.json({redirect:'/dashboard'});
  }
  return Response.json({error:'Unknown action.'},{status:404});
 }catch{return Response.json({error:'Account services are unavailable. Please try again later.'},{status:503});}
}
