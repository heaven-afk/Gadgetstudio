import sampleProducts from './sample-products.json' with { type: 'json' };

class ApiError extends Error { constructor(status,message){super(message);this.status=status;} }
const fail=(status,message)=>{throw new ApiError(status,message);};
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const now=()=>new Date().toISOString();
const uid=()=>crypto.randomUUID();
const text=(value,max=500,required=false)=>{if(typeof value!=='string'||value.trim().length>max||(required&&!value.trim()))fail(400,'Check the required text fields and their lengths.');return value.trim();};
const integer=(value,min=0,max=1e9)=>{if(!Number.isSafeInteger(value)||value<min||value>max)fail(400,'Enter a valid whole-number amount or quantity.');return value;};
const parse=raw=>JSON.parse(raw);
const safeImage=value=>typeof value==='string'&&(/^\/assets\/[a-zA-Z0-9._-]+$/.test(value)||/^\/api\/product-images\/[a-zA-Z0-9-]+$/.test(value)||/^https:\/\//.test(value));
async function limitedBody(request,max){const reader=request.body?.getReader();if(!reader)return new Uint8Array();let size=0;const chunks=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();fail(413,'The request is too large.');}chunks.push(value);}const bytes=new Uint8Array(size);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}return bytes;}
async function body(request){if(!request.headers.get('content-type')?.includes('application/json'))fail(415,'Use JSON for this request.');try{return JSON.parse(new TextDecoder().decode(await limitedBody(request,80000)));}catch(e){if(e instanceof ApiError)throw e;fail(400,'Invalid request data.');}}
async function form(request){const bytes=await limitedBody(request,3.5*1024*1024);try{return await new Response(bytes,{headers:{'content-type':request.headers.get('content-type')||''}}).formData();}catch{fail(400,'Invalid upload.');}}
function requireUser(user){if(!user?.userId)fail(401,'Sign in to manage a store.');return user.userId;}
async function owned(db,id,user){const userId=requireUser(user);const s=await db.prepare('SELECT * FROM stores WHERE id=? AND owner_id=?').bind(id,userId).first();if(!s)fail(403,'You do not have access to this store.');return s;}
const productRow=row=>({...parse(row.data),id:row.id,price:row.price,stock:row.stock,revision:row.revision});
const storeRow=row=>({...parse(row.settings),id:row.id,slug:row.slug,name:row.name,revision:row.revision});
const requestRow=row=>({...parse(row.data),id:row.id,kind:row.kind,status:row.status,total:row.total,credit:row.credit,quotePrice:row.quote_price,topUp:row.credit===null?null:row.quote_price-row.credit,sellerNote:row.seller_note,revision:row.revision,created:row.created});
async function productsFor(db,id){return (await db.prepare('SELECT * FROM products WHERE store_id=? AND active=1 ORDER BY created,id').bind(id).all()).results.map(productRow);}
async function catalogue(db,s,user){return {...storeRow(s),canManage:!!user&&s.owner_id===user.userId,products:await productsFor(db,s.id)};}
async function manage(db,id,user){const s=await owned(db,id,user);return {...await catalogue(db,s,user),requests:(await db.prepare('SELECT * FROM requests WHERE store_id=? ORDER BY created DESC LIMIT 200').bind(id).all()).results.map(requestRow),events:(await db.prepare('SELECT e.*,p.data FROM inventory_events e JOIN products p ON p.id=e.product_id WHERE e.store_id=? ORDER BY e.created DESC,e.id DESC LIMIT 100').bind(id).all()).results.map(e=>({...e,name:parse(e.data).name,data:undefined}))};}
async function sha(value){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',value instanceof Uint8Array?value:new TextEncoder().encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
async function rateLimit(db,request,user){const epoch=Math.floor(Date.now()/3600000);const identity=user?.userId||request.headers.get('x-heaven-client-ip')||'unknown-client';const key=await sha(epoch+':'+identity);const row=await db.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=rate_limits.count+1 RETURNING count').bind(key,Date.now()+7200000).first();if(row.count>40)fail(429,'Too many requests. Please try again later.');await db.prepare('DELETE FROM rate_limits WHERE expires<?').bind(Date.now()).run();}
function settings(v){const phone=text(v.phone??'',25).replace(/[+\s()-]/g,'');if(phone&&!/^[1-9]\d{7,14}$/.test(phone))fail(400,'Use the full international WhatsApp number, without a leading zero.');const address=text(v.address??'',500);if(v.pickup&&!address)fail(400,'Add a physical address to offer pickup.');return {displayName:text(v.displayName,22,true),phone,address,pickup:!!v.pickup,acceptsSwaps:v.acceptsSwaps!==false,sampleCatalogue:!!v.sampleCatalogue,swapPolicy:text(v.swapPolicy??'All swaps are subject to device inspection, ownership checks and an agreed top-up.',1000)};}
function product(v){const colors=Array.isArray(v.colors)?v.colors.map(c=>text(c,60,true)):[];if(!colors.length||colors.length>12)fail(400,'Add between 1 and 12 colours.');if(!['Phones','Laptops','Audio','Wearables','Accessories'].includes(v.category)||!['Brand new','Used','Refurbished'].includes(v.condition))fail(400,'Select a valid category and condition.');if(!safeImage(v.image))fail(400,'Use an HTTPS product photo or an uploaded product image.');return {name:text(v.name,100,true),brand:text(v.brand,60,true),category:v.category,condition:v.condition,storage:text(v.storage,100,true),colors,image:text(v.image,2000,true),description:text(v.description,1200,true),battery:text(v.battery??'',100),accessories:text(v.accessories??'',150),warranty:text(v.warranty??'',150),repairs:text(v.repairs??'',200),notes:text(v.notes??'',1000)};}
function contact(value){const phone=text(value,25,true),digits=phone.replace(/[^0-9]/g,'');if(!/^\+?[0-9 ()-]+$/.test(phone)||digits.length<7||digits.length>15)fail(400,'Enter a valid contact phone number.');return phone;}
function customer(v,s){const fulfillment=v.fulfillment==='pickup'?'pickup':'delivery';if(fulfillment==='pickup'&&!s.pickup)fail(400,'Pickup is not available at this store.');return {customer:text(v.name,100,true),phone:contact(v.phone),fulfillment,address:fulfillment==='pickup'?s.address:text(v.address,500,true),notes:text(v.notes??'',1000)};}
function retryKey(v){if(typeof v!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(v))fail(400,'Invalid request reference. Refresh and try again.');return v;}
async function prior(db,storeId,key,fingerprint){const row=await db.prepare('SELECT * FROM requests WHERE store_id=? AND idempotency_key=?').bind(storeId,key).first();if(row){if(row.fingerprint!==fingerprint)fail(409,'This reference was used for different details. Start a new request.');return requestRow(row);}return null;}
async function imageFile(file){if(!file||typeof file==='string'||!file.size||file.size>2*1024*1024)fail(400,'Each photo must be a JPEG, PNG or WebP under 2 MB.');const bytes=new Uint8Array(await file.arrayBuffer());const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71;const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;const webp=new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';if(!png&&!jpg&&!webp)fail(400,'Upload a JPEG, PNG or WebP image.');return {bytes,type:png?'image/png':jpg?'image/jpeg':'image/webp'};}
const naira=n=>new Intl.NumberFormat('en-NG',{style:'currency',currency:'NGN',maximumFractionDigits:0}).format(n);
function orderMessage(s,r){return `Hello ${s.name}, I’d like to order:\n\n${r.items.map(i=>`${i.name} — ${i.storage}, ${i.color}, ${i.condition}\nQty: ${i.quantity} × ${naira(i.price)} = ${naira(i.price*i.quantity)}`).join('\n\n')}\n\nProduct total: ${naira(r.total)}\nDelivery fee: please confirm\nName: ${r.customer}\nPhone: ${r.phone}\nReceive via: ${r.fulfillment}\nAddress: ${r.address}${r.notes?'\nNotes: '+r.notes:''}\nReference: ${r.id}\n\nPlease confirm availability, payment and warranty terms.`;}
function swapMessage(s,r){return `Hello ${s.name}, I’d like to request a device swap.\n\nMy device: ${r.device.model}\nStorage: ${r.device.storage}\nColour: ${r.device.color}\nCondition: ${r.device.condition}\nBattery: ${r.device.battery||'Not known'}\nRepair history: ${r.device.repairs}\nFaults / damage: ${r.device.faults}\nAccessories: ${r.device.accessories}\n\nDesired device: ${r.target.name} — ${r.target.storage}, ${r.target.color}, ${r.target.condition}\nListed price: ${naira(r.total)} (before assessment)\nPhotos attached to request: ${r.photoKeys.length}\n\nName: ${r.customer}\nPhone: ${r.phone}\n${r.notes?'Notes: '+r.notes+'\n':''}Reference: ${r.id}\n\nPlease assess my device and confirm eligibility, trade-in credit and any top-up after inspection. I understand that this is a request, not an approved swap.`;}
function responseFor(s,r){return {request:r,whatsappUrl:`https://wa.me/${s.phone}?text=${encodeURIComponent(r.kind==='swap'?swapMessage(s,r):orderMessage(s,r))}`};}

export async function handleApi(request,db,bucket,user){
  try {
    const url=new URL(request.url),path=url.pathname.split('/').filter(Boolean).slice(1),method=request.method;
    if(!db)fail(503,'The store database is not available. Please try again shortly.');
    if(method!=='GET'&&request.headers.get('origin')!==url.origin)fail(403,'This action must be submitted from this website.');
    if(method==='GET'&&path[0]==='me'){
      const rows=user?(await db.prepare('SELECT * FROM stores WHERE owner_id=? ORDER BY created').bind(user.userId).all()).results:[];
      return json({user:user?{displayName:user.displayName}:null,stores:rows.map(storeRow)});
    }
    if(method==='GET'&&path[0]==='store'&&path.length===2){
      const s=await db.prepare('SELECT * FROM stores WHERE slug=?').bind(path[1]).first();if(!s)fail(404,'This store was not found.');return json(await catalogue(db,s,user));
    }
    if(method==='GET'&&path[0]==='product-images'&&path.length===2){
      if(!/^[a-zA-Z0-9-]+$/.test(path[1])||!bucket)fail(404,'Image not found.');
      const file=await bucket.get('products/'+path[1]);if(!file)fail(404,'Image not found.');return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'public, max-age=86400','X-Content-Type-Options':'nosniff'}});
    }
    if(method==='POST'&&path[0]==='stores'&&path.length===1){
      const owner=requireUser(user);const v=await body(request);const slug=text(v.slug,50,true).toLowerCase();if(!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(slug)||slug.length<3)fail(400,'Use a store link of at least 3 letters, numbers and single hyphens.');
      const count=await db.prepare('SELECT COUNT(*) AS n FROM stores WHERE owner_id=?').bind(owner).first();if(count.n>=10)fail(400,'This account already has 10 stores.');
      if(await db.prepare('SELECT id FROM stores WHERE slug=?').bind(slug).first())fail(409,'That store link is taken. Choose another one.');
      const id=uid(),name=text(v.name,70,true);const config=settings({displayName:v.displayName||name.slice(0,22),phone:'',address:'',pickup:false,acceptsSwaps:true,sampleCatalogue:v.sampleProducts===true});
      const stmts=[db.prepare('INSERT INTO stores(id,owner_id,slug,name,settings,created) VALUES(?,?,?,?,?,?)').bind(id,owner,slug,name,JSON.stringify(config),now())];
      if(v.sampleProducts===true)for(const p of sampleProducts){const {price,stock,...data}=p;delete data.id;stmts.push(db.prepare('INSERT INTO products(id,store_id,data,price,stock) VALUES(?,?,?,?,?)').bind(uid(),id,JSON.stringify(data),price,stock));}
      await db.batch(stmts);return json(await manage(db,id,user),201);
    }
    if(path[0]!=='stores'||!path[1])fail(404,'Endpoint not found.');
    const id=path[1];
    if(method==='GET'&&path[2]==='manage'&&path.length===3)return json(await manage(db,id,user));
    if(method==='PATCH'&&path.length===2){
      const s=await owned(db,id,user),v=await body(request),config=settings(v);const changed=await db.prepare('UPDATE stores SET name=?,settings=?,revision=revision+1 WHERE id=? AND revision=?').bind(text(v.name,70,true),JSON.stringify(config),id,integer(v.revision,1)).run();if(!changed.meta.changes)fail(409,'Store settings changed elsewhere. Refresh and try again.');return json(await catalogue(db,{...s,name:v.name.trim(),settings:JSON.stringify(config),revision:s.revision+1},user));
    }
    if(method==='POST'&&path[2]==='product-photo'){
      await owned(db,id,user);if(!bucket)fail(503,'Image storage is unavailable.');const f=await form(request),image=await imageFile(f.get('photo')),key=uid();await bucket.put('products/'+key,image.bytes,{httpMetadata:{contentType:image.type},customMetadata:{storeId:id}});return json({image:'/api/product-images/'+key},201);
    }
    if(method==='GET'&&path[2]==='swap-images'&&path.length===4){
      await owned(db,id,user);if(!bucket||!/^[a-zA-Z0-9-]+$/.test(path[3]))fail(404,'Photo not found.');const file=await bucket.get(`swaps/${id}/${path[3]}`);if(!file)fail(404,'Photo not found.');return new Response(file.body,{headers:{'Content-Type':file.httpMetadata?.contentType||'image/jpeg','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'inline'}});
    }
    if(path[2]==='products'){
      await owned(db,id,user);
      if(method==='POST'&&path.length===3){const v=await body(request),data=product(v);const pid=uid();await db.prepare('INSERT INTO products(id,store_id,data,price,stock) VALUES(?,?,?,?,?)').bind(pid,id,JSON.stringify(data),integer(v.price,1),integer(v.stock,0,100000)).run();return json({id:pid},201);}
      if(method==='PUT'&&path.length===4){const v=await body(request),data=product(v);const changed=await db.prepare('UPDATE products SET data=?,price=?,stock=?,revision=revision+1,stock_reason=? WHERE id=? AND store_id=? AND active=1 AND revision=?').bind(JSON.stringify(data),integer(v.price,1),integer(v.stock,0,100000),'Seller inventory adjustment',path[3],id,integer(v.revision,1)).run();if(!changed.meta.changes)fail(409,'This product changed elsewhere. Refresh before editing.');return json({saved:true});}
      if(method==='DELETE'&&path.length===4){const v=await body(request);const changed=await db.prepare('UPDATE products SET active=0,revision=revision+1 WHERE id=? AND store_id=? AND revision=? AND active=1').bind(path[3],id,integer(v.revision,1)).run();if(!changed.meta.changes)fail(409,'This listing changed elsewhere. Refresh and try again.');return json({removed:true});}
    }
    if(method==='POST'&&path[2]==='sales'){
      await owned(db,id,user);const v=await body(request),saleId=retryKey(v.idempotencyKey);const previous=await db.prepare('SELECT * FROM sales WHERE id=?').bind(saleId).first();if(previous){if(previous.store_id!==id||previous.product_id!==v.productId||previous.quantity!==v.quantity)fail(409,'Sale reference already used.');return json({recorded:true});}
      await db.prepare('INSERT INTO sales(id,store_id,product_id,quantity,created) VALUES(?,?,?,?,?)').bind(saleId,id,text(v.productId,80,true),integer(v.quantity,1,1000),now()).run();return json({recorded:true});
    }
    if(method==='PATCH'&&path[2]==='requests'&&path.length===4){
      await owned(db,id,user);const v=await body(request);const r=await db.prepare('SELECT * FROM requests WHERE id=? AND store_id=?').bind(path[3],id).first();if(!r)fail(404,'Request not found.');
      if(r.status==='completed'&&v.status==='completed')return json({request:requestRow(r)});
      const allowed=r.kind==='swap'?{submitted:['reviewing','quoted','declined'],reviewing:['quoted','declined'],quoted:['reviewing','quoted','declined','completed']}:{submitted:['reviewing','declined','completed'],reviewing:['declined','completed']};
      if(!allowed[r.status]?.includes(v.status))fail(409,'This request cannot move to that status.');
      let credit=r.credit,quote=r.quote_price;if(v.status==='quoted'){
        const p=await db.prepare('SELECT * FROM products WHERE id=? AND store_id=? AND active=1').bind(r.target_id,id).first();if(!p||p.stock<1)fail(409,'The requested device is unavailable.');credit=integer(v.credit,0,p.price);quote=p.price;
      }
      const result=await db.prepare('UPDATE requests SET status=?,credit=?,quote_price=?,seller_note=?,revision=revision+1 WHERE id=? AND store_id=? AND revision=?').bind(v.status,credit,quote,text(v.sellerNote??r.seller_note,1000),r.id,id,integer(v.revision,1)).run();if(!result.meta.changes)fail(409,'This request changed elsewhere. Refresh and try again.');return json({request:requestRow(await db.prepare('SELECT * FROM requests WHERE id=?').bind(r.id).first())});
    }
    if(method==='POST'&&['orders','swaps'].includes(path[2])&&path.length===3){
      await rateLimit(db,request,user);const row=await db.prepare('SELECT * FROM stores WHERE id=?').bind(id).first();if(!row)fail(404,'Store not found.');const s=storeRow(row);if(!s.phone)fail(409,'This seller has not connected a WhatsApp number yet.');
      if(path[2]==='orders'){
        const v=await body(request),details=customer(v,s),key=retryKey(v.idempotencyKey);if(!Array.isArray(v.items)||!v.items.length||v.items.length>30)fail(400,'Add between 1 and 30 items.');
        const fingerprint=await sha(JSON.stringify({details,items:v.items}));const previous=await prior(db,id,key,fingerprint);if(previous)return json(responseFor(s,previous));
        const items=[],counts={};for(const i of v.items){const p=await db.prepare('SELECT * FROM products WHERE id=? AND store_id=? AND active=1').bind(text(i.productId,80,true),id).first();if(!p)fail(409,'An item is no longer available.');const data=productRow(p),quantity=integer(i.quantity,1,100);if(i.price!==p.price)fail(409,'A product price changed. Refresh your bag before continuing.');if(!data.colors.includes(i.color))fail(400,'Select an available colour.');counts[p.id]=(counts[p.id]||0)+quantity;if(counts[p.id]>p.stock)fail(409,'There is insufficient stock for this order.');items.push({productId:p.id,name:data.name,storage:data.storage,condition:data.condition,color:i.color,price:p.price,quantity});}
        const rid=uid(),total=items.reduce((n,i)=>n+i.price*i.quantity,0),data={...details,items};
        await db.batch([db.prepare('INSERT INTO requests(id,store_id,kind,data,customer_id,total,created,idempotency_key,fingerprint) VALUES(?,?,?,?,?,?,?,?,?)').bind(rid,id,'order',JSON.stringify(data),user?.userId||null,total,now(),key,fingerprint),...items.map(i=>db.prepare('INSERT INTO request_items(id,request_id,product_id,quantity,price,data) VALUES(?,?,?,?,?,?)').bind(uid(),rid,i.productId,i.quantity,i.price,JSON.stringify(i)))]);
        return json(responseFor(s,requestRow(await db.prepare('SELECT * FROM requests WHERE id=?').bind(rid).first())),201);
      }
      if(!s.acceptsSwaps)fail(409,'This seller is not accepting swap requests.');if(!bucket)fail(503,'Swap photo storage is unavailable.');
      const f=await form(request);let v;try{v=JSON.parse(String(f.get('details')));}catch{fail(400,'Invalid swap details.');}
      const key=retryKey(v.idempotencyKey);if(v.ownership!==true)fail(400,'Confirm that you own the device and can legally trade it in.');
      const details={customer:text(v.name,100,true),phone:contact(v.phone),notes:text(v.notes??'',1000)};
      const d=v.device||{},device={model:text(d.model,100,true),storage:text(d.storage,80,true),color:text(d.color,80,true),condition:text(d.condition,100,true),battery:text(d.battery??'',100),repairs:text(d.repairs,500,true),faults:text(d.faults,500,true),accessories:text(d.accessories,200,true),lockStatus:text(d.lockStatus,100,true)};
      const target=await db.prepare('SELECT * FROM products WHERE id=? AND store_id=? AND active=1').bind(text(v.targetId,80,true),id).first();if(!target||target.stock<1)fail(409,'The device you want is no longer available.');const tp=productRow(target);if(!tp.colors.includes(v.color))fail(400,'Choose an available target colour.');if(v.price!==tp.price)fail(409,'The target price changed. Refresh and request the swap again.');
      const files=f.getAll('photos');if(files.length<1||files.length>4)fail(400,'Add 1 to 4 clear device photos.');const images=await Promise.all(files.map(imageFile));const hashes=await Promise.all(images.map(image=>sha(image.bytes)));
      const fingerprint=await sha(JSON.stringify({details,device,targetId:target.id,color:v.color,price:tp.price,hashes}));const previous=await prior(db,id,key,fingerprint);if(previous)return json(responseFor(s,previous));
      const photoKeys=[];try{
        for(const image of images){const photoKey=uid();await bucket.put(`swaps/${id}/${photoKey}`,image.bytes,{httpMetadata:{contentType:image.type},customMetadata:{storeId:id}});photoKeys.push(photoKey);}
        const rid=uid(),data={...details,device,photoKeys,ownership:true,target:{id:tp.id,name:tp.name,storage:tp.storage,condition:tp.condition,color:v.color}};
        await db.prepare('INSERT INTO requests(id,store_id,kind,data,customer_id,total,target_id,created,idempotency_key,fingerprint) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(rid,id,'swap',JSON.stringify(data),user?.userId||null,tp.price,tp.id,now(),key,fingerprint).run();return json(responseFor(s,requestRow(await db.prepare('SELECT * FROM requests WHERE id=?').bind(rid).first())),201);
      }catch(e){await Promise.all(photoKeys.map(key=>bucket.delete(`swaps/${id}/${key}`)));throw e;}
    }
    fail(404,'Endpoint not found.');
  } catch(error) {
    if(error instanceof ApiError)return json({error:error.message},error.status);
    const message=String(error?.message||'');
    if(/stock|invalid_order_transition|swap_needs_valid_quote/i.test(message))return json({error:'Stock or price changed, or this request needs a valid quote. Refresh before completing it.'},409);
    if(/UNIQUE constraint/i.test(message))return json({error:'This reference or store link is already in use. Refresh and try again.'},409);
    console.error('Store API failure',error?.name,message.slice(0,300));
    return json({error:'The request could not be completed. Please try again.'},500);
  }

}
