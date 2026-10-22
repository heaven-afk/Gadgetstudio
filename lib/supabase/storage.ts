import 'server-only';
import {createClient} from '@supabase/supabase-js';
export function objectStorage(){
 if(!process.env.SUPABASE_SECRET_KEY)throw new Error('Image storage configuration is missing.');
 const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const location=(key:string)=>({bucket:key.startsWith('products/')?'product-assets':'swap-photos',path:key});
 return {async put(key:string,bytes:Uint8Array,meta:{httpMetadata:{contentType:string}}){const l=location(key);const {error}=await client.storage.from(l.bucket).upload(l.path,bytes,{contentType:meta.httpMetadata.contentType,upsert:false});if(error)throw new Error('Photo upload failed.');},async get(key:string){const l=location(key);const {data,error}=await client.storage.from(l.bucket).download(l.path);if(error||!data)return null;return {body:new Uint8Array(await data.arrayBuffer()),httpMetadata:{contentType:data.type}};},async delete(key:string){const l=location(key);const {error}=await client.storage.from(l.bucket).remove([l.path]);if(error)throw new Error('Photo cleanup failed.');}};
}
