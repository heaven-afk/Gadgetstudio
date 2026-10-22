// Compare the browser's Origin with the actual HTTP Host, rather than Next.js'
// internal URL hostname. Browser callers cannot set the Host header themselves.
export function sameOrigin(request:Request){
 try{
  const raw=request.headers.get('origin'),host=request.headers.get('host');if(!raw)return false;
  const origin=new URL(raw);if(!['http:','https:'].includes(origin.protocol))return false;
  const target=host?new URL(origin.protocol+'//'+host):new URL(request.url);
  if(target.origin!==origin.origin)return false;
  if(origin.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(origin.hostname))return false;
  if(process.env.NODE_ENV==='production'&&process.env.NEXT_PUBLIC_SITE_URL&&origin.origin!==new URL(process.env.NEXT_PUBLIC_SITE_URL).origin)return false;
  return true;
 }catch{return false;}
}
export function externalRequest(request:Request){
 const url=new URL(request.url);if(request.headers.get('host'))url.host=request.headers.get('host')!;
 if(request.method!=='GET'&&sameOrigin(request)){const origin=new URL(request.headers.get('origin')!);url.protocol=origin.protocol;url.host=origin.host;}
 return new Request(url,request);
}
