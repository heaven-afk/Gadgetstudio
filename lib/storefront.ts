import {readFile} from 'node:fs/promises';
import path from 'node:path';
export async function storefront(initial?:unknown){let html=await readFile(path.join(process.cwd(),'app/storefront.html'),'utf8');if(initial){const safe=JSON.stringify(initial).replace(/</g,'\\u003c');html=html.replace('<script src="/app.js"',`<script>window.__INITIAL_STORE__=${safe};</script><script src="/app.js"`);}return new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}
