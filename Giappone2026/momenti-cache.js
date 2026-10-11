/* Optional device photo cache. AES-GCM ciphertext only, scoped to a personal
 * session; no captions, location, names or access tokens are written here. */
(()=>{'use strict';
const DB='japan-moments-photos-v1',TTL=7*86400000,MAX_BYTES=24*1024*1024,MAX_ITEMS=80;
let opening=null,contextKey='',contextPromise=null;
const hex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
async function digest(s){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))}
async function context(session){
 if(!session?.token||!session.member||!session.trip||!crypto?.subtle||!window.indexedDB)return null;
 const signature=[session.url,session.trip,session.member,session.token].join('|');
 if(signature!==contextKey){contextKey=signature;contextPromise=(async()=>{
  const scope=hex(await digest([session.url,session.trip,session.member].join('|')));
  const key=await crypto.subtle.importKey('raw',await digest(session.token+'|'+scope),'AES-GCM',false,['encrypt','decrypt']);
  return {scope,key};
 })();}
 return contextPromise;
}
function database(){
 if(opening)return opening;
 opening=new Promise(resolve=>{
  let settled=false;const finish=value=>{if(settled){value?.close();return}settled=true;clearTimeout(timer);resolve(value)};
  const timer=setTimeout(()=>finish(null),1000);
  try{const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{req.result.createObjectStore('photos',{keyPath:'id'});req.result.createObjectStore('meta',{keyPath:'id'})};
   req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();opening=null};finish(req.result)};
   req.onerror=req.onblocked=()=>finish(null);
  }catch{finish(null)}
 });
 return opening;
}
async function identity(session,path){const c=await context(session);return c?{...c,id:c.scope+':'+hex(await digest(String(path)))}:null}
function transaction(db,mode,run){return new Promise(resolve=>{
 try{const tx=db.transaction(['photos','meta'],mode);let value=null;run(tx,v=>value=v);tx.oncomplete=()=>resolve(value);tx.onerror=tx.onabort=()=>resolve(null)}catch{resolve(null)}
 })}
async function remove(session,path){try{const c=await identity(session,path),db=await database();if(!c||!db)return;await transaction(db,'readwrite',tx=>{tx.objectStore('photos').delete(c.id);tx.objectStore('meta').delete(c.id)})}catch{}}
async function get(session,path){try{
 const c=await identity(session,path),db=await database();if(!c||!db)return null;
 const record=await transaction(db,'readonly',(tx,result)=>{const req=tx.objectStore('photos').get(c.id);req.onsuccess=()=>result(req.result)});
 if(!record)return null;
 if(record.born<Date.now()-TTL){void remove(session,path);return null}
 let bytes;try{bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv,additionalData:new TextEncoder().encode(c.id)},c.key,record.cipher)}catch{void remove(session,path);return null}
 if(bytes.byteLength>350000)return null;
 void transaction(db,'readwrite',tx=>{tx.objectStore('meta').put({id:c.id,scope:c.scope,bytes:record.cipher.byteLength,born:record.born,at:Date.now()})});
 return new Blob([bytes],{type:'image/jpeg'});
 }catch{return null}}
async function put(session,path,blob){try{
 if(blob?.type!=='image/jpeg'||blob.size>350000)return;
 const c=await identity(session,path),db=await database();if(!c||!db)return;
 const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(c.id)},c.key,await blob.arrayBuffer()),born=Date.now();
 await transaction(db,'readwrite',tx=>{
  tx.objectStore('photos').put({id:c.id,iv,cipher,born});
  tx.objectStore('meta').put({id:c.id,scope:c.scope,bytes:cipher.byteLength,born,at:born});
  const req=tx.objectStore('meta').getAll();req.onsuccess=()=>{
   const rows=req.result.sort((a,b)=>b.at-a.at);let bytes=0,count=0;
   for(const row of rows){bytes+=row.bytes;count++;if(row.born<born-TTL||count>MAX_ITEMS||bytes>MAX_BYTES){tx.objectStore('photos').delete(row.id);tx.objectStore('meta').delete(row.id)}}
  };
 });
 }catch{}}
async function clear(session){try{
 const c=await context(session),db=await database();if(!c||!db)return;
 await transaction(db,'readwrite',tx=>{const req=tx.objectStore('meta').getAll();req.onsuccess=()=>{for(const row of req.result)if(row.scope===c.scope){tx.objectStore('photos').delete(row.id);tx.objectStore('meta').delete(row.id)}}});
 }catch{}}
window.JAPAN_MOMENT_CACHE={get,put,remove,clear};
})();
