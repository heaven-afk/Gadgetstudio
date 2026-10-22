import {sameOrigin,externalRequest} from '@/lib/request-security';
import {handleApi} from '@/lib/api.mjs';
import {database} from '@/lib/database-server';
import {objectStorage} from '@/lib/supabase/storage';
import {verifiedUser} from '@/lib/supabase/server';
export const dynamic='force-dynamic';export const runtime='nodejs';export const maxDuration=30;
async function handle(request:Request){
 try{
  if(request.method!=='GET'&&!sameOrigin(request))return Response.json({error:'Submit this action from this website.'},{status:403});
  const user=await verifiedUser();
  if(new URL(request.url).pathname==='/api/me'&&!user)return Response.json({user:null,stores:[]},{headers:{'Cache-Control':'no-store'}});
  const clean=new Headers(request.headers);clean.delete('x-heaven-client-ip');clean.set('x-heaven-client-ip',process.env.VERCEL?request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()||'unknown':'local');
  const secureRequest=new Request(externalRequest(request),{headers:clean});
  const bucket=process.env.SUPABASE_SECRET_KEY?objectStorage():null;
  return await handleApi(secureRequest,database(),bucket,user)??Response.json({error:'The service is unavailable.'},{status:503});
 }catch{console.error('Platform API configuration or service failure');return Response.json({error:'The store service is unavailable. Please try again shortly.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
