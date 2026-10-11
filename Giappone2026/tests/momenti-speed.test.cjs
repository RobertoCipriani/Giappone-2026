'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright'),sharp=require('sharp');
const base=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(base,f),'utf8');
let checks=0;const check=(name,ok)=>{assert.ok(ok,name);checks++};
(async()=>{
 const jpeg=(await sharp({create:{width:900,height:700,channels:3,background:'#bb7755'}}).jpeg().toBuffer()).toString('base64');
 const browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({jpeg})=>{
  const url='https://script.google.com/macros/s/fixture-public-endpoint/exec';
  if(!localStorage.getItem('japan-moments-drive-v1'))localStorage.setItem('japan-moments-drive-v1',JSON.stringify({url,token:'a'.repeat(64),name:'Guest Alpha',member:{id:'account-a',name:'Guest Alpha',role:'member'},trip:{id:'fixture-trip',owner_id:'owner'},serviceVersion:3}));
  window.speedCalls=[];window.speedDelay=80;window.speedRevoked=false;window.speedPhotoHold=false;window.speedHeld=[];window.speedFeedDelay=0;
  window.speedPosts=[0,1].map(i=>({id:'photo-'+i,photo_path:'photo-'+i,author_id:'friend',author_name:'Fixture friend',caption:'Synthetic memory '+i,created_at:'2026-11-01T0'+(5-i)+':00:00Z',place_label:'Fixture location',source:'library',like_count:0,comment_count:0,liked:false,comments:[],size_bytes:5000}));
  window.speedRPC=async payload=>{
   speedCalls.push({op:payload.op,id:payload.data?.id,token:payload.token});
   if(speedRevoked&&payload.op!=='capabilities'){const e=Error('Access revoked');e.code='ACCESS';throw e}
   if(payload.op==='feed'){const snapshot=structuredClone(speedPosts);await new Promise(r=>setTimeout(r,speedFeedDelay));return {posts:snapshot,hasMore:false,revision:'r1',version:3,hasCode:true,member:{id:payload.token==='a'.repeat(64)?'account-a':'account-b',name:'Fixture guest',role:'member'}}}
   if(payload.op==='photo'){if(speedPhotoHold)await new Promise(r=>speedHeld.push(r));else await new Promise(r=>setTimeout(r,speedDelay));return {photo:jpeg,mimeType:'image/jpeg'}}
   if(payload.op==='publish'){const post={...speedPosts[0],id:payload.data.id,photo_path:payload.data.id,author_id:'account-a'};speedPosts.unshift(post);return {post}}
   if(payload.op==='stays'){const e=Error('Synthetic old private service');e.code='INVALID';throw e}
   if(payload.op==='capabilities')return {version:3,accounts:true,social:true};
   return {};
  };
 },{jpeg});
 await page.route('**/*',route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1')return route.abort();
  const relative=url.pathname.replace(/^\/Giappone-2026\/Giappone2026\//,'')||'index.html',file=path.resolve(base,relative);
  if(!file.startsWith(base+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Missing'});
  const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webmanifest':'application/manifest+json'};
  let body=fs.readFileSync(file);
  if(relative==='drive-transport.js')body=read(relative).replace(/\}\)\(\);\s*$/,"window.MOMENT_DRIVE_TRANSPORT.connect=url=>({call:payload=>window.speedRPC(payload)});})();");
  if(relative==='momenti.js')body=read(relative).replace('}catch(e){if(sessionMatches(stamp)&&!quiet)',"}catch(e){(window.speedPhotoErrors??=[]).push(e.message);if(sessionMatches(stamp)&&!quiet)").replace(/\}\)\(\);\s*$/,"window.SPEED_QA={session:photoSession,photos:()=>imageCache.size,pending:()=>imagePending.size,feed:()=>loadFeed(false,true),rpc,photo:id=>photo(posts.find(p=>p.id===id)),switch:()=>{cfg={...cfg,token:'b'.repeat(64),member:{id:'account-b',name:'Beta',role:'member'}};save();paintMain();return loadFeed(false,true)},publish:async()=>{compose();draft={blob:new Blob([Uint8Array.from(atob(window.fixtureJPEG),c=>c.charCodeAt(0))],{type:'image/jpeg'}),source:'library'};await publish()},reset:()=>{for(const url of imageCache.values())URL.revokeObjectURL(url);imageCache.clear();imagePending.clear()},paths:()=>[...imageCache.keys()]};})();");
  return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body});
 });
 const home='http://127.0.0.1:8765/Giappone-2026/Giappone2026/';await page.goto(home);
 await page.waitForFunction(()=>window.SPEED_QA?.photos()===2,{},{timeout:10000}).catch(async e=>{console.log('DEBUG',await page.evaluate(()=>({calls:window.speedCalls,qa:!!window.SPEED_QA,profile:window.JAPAN_MOMENTS?.profile(),photos:window.SPEED_QA?.photos(),pending:window.SPEED_QA?.pending(),status:document.querySelector('#moment-status')?.textContent,photoErrors:window.speedPhotoErrors})),errors);throw e});
 check('Background prepares only the first two images',await page.evaluate(()=>speedCalls.filter(c=>c.op==='photo').length===2));
 check('Program stays visible during prefetch',await page.locator('.day-navigation').count()===1);
 await page.waitForFunction(async()=>{const s=SPEED_QA.session();return !!await JAPAN_MOMENT_CACHE.get(s,'photo-0')&&!!await JAPAN_MOMENT_CACHE.get(s,'photo-1')});
 const cacheStats=await page.evaluate(()=>new Promise(resolve=>{const req=indexedDB.open('japan-moments-photos-v1');req.onsuccess=()=>{const db=req.result,tx=db.transaction(['photos','meta']),rows=tx.objectStore('photos').getAll();rows.onsuccess=()=>resolve(rows.result.map(r=>({keys:Object.keys(r),id:r.id,bytes:r.cipher.byteLength,cipher:typeof r.cipher})))}}));
 check('Saved records contain encrypted bytes only',cacheStats.length===2&&cacheStats.every(r=>r.keys.join(',')==='id,iv,cipher,born'&&r.bytes>0&&!r.id.includes('photo-')));
 await page.locator('.main-tabs [data-view="moments"]').click();await page.waitForFunction(()=>document.querySelectorAll('.moment-photo.loaded').length===2);
 check('Opening the feed does not download the same images again',await page.evaluate(()=>speedCalls.filter(c=>c.op==='photo').length===2));
 check('Image preview remains usable',await page.locator('.moment-photo-open').count()===2);
 await page.reload();await page.waitForFunction(()=>window.SPEED_QA?.photos()===2);
 check('Reload restores photos with zero image RPCs',await page.evaluate(()=>speedCalls.filter(c=>c.op==='photo').length===0));
 check('Reload verifies the feed before restoring photos',await page.evaluate(()=>speedCalls.some(c=>c.op==='feed')));
 await page.locator('.main-tabs [data-view="moments"]').click();await page.waitForFunction(()=>document.querySelectorAll('.moment-photo.loaded').length===2);
 await page.evaluate(()=>{window.fixtureJPEG=window.__jpeg||''});await page.evaluate(jpeg=>window.fixtureJPEG=jpeg,jpeg);
 const uploadsBefore=await page.evaluate(()=>speedCalls.filter(c=>c.op==='photo').length);await page.evaluate(()=>{speedFeedDelay=180;void SPEED_QA.feed()});await page.evaluate(()=>SPEED_QA.publish());
 check('Confirmed publication reuses the upload bytes',await page.evaluate(()=>speedCalls.filter(c=>c.op==='photo').length)===uploadsBefore);
 check('Published photo is already in memory',await page.evaluate(()=>SPEED_QA.photos()===3));await page.waitForTimeout(450);check('An older poll cannot hide a just-published moment',await page.evaluate(()=>document.querySelectorAll('[data-moment-id]').length===3));await page.evaluate(()=>speedFeedDelay=0);
 const originalSession=await page.evaluate(()=>SPEED_QA.session());
 check('Different account cannot decrypt the cache',await page.evaluate(async session=>await JAPAN_MOMENT_CACHE.get({...session,member:'different',token:'d'.repeat(64)},'photo-0')===null,originalSession));
 check('Different session key cannot decrypt the cache',await page.evaluate(async session=>await JAPAN_MOMENT_CACHE.get({...session,token:'c'.repeat(64)},'photo-1')===null,originalSession));
 // Old in-flight results must never mount into a new account, even for common post IDs.
 await page.evaluate(async()=>{await JAPAN_MOMENT_CACHE.clear(SPEED_QA.session());SPEED_QA.reset();speedPhotoHold=true;void SPEED_QA.photo('photo-0')});
 await page.waitForFunction(()=>speedHeld.length===1);
 await page.evaluate(()=>{void SPEED_QA.switch()});
 await page.waitForFunction(()=>speedCalls.some(c=>c.op==='feed'&&c.token==='b'.repeat(64)));
 await page.evaluate(()=>{speedPhotoHold=false;for(const r of speedHeld.splice(0))r()});
 await page.waitForFunction(()=>SPEED_QA.photos()>=2);
 check('Old account download cannot populate new account memory',await page.evaluate(()=>SPEED_QA.session().member==='account-b'&&speedCalls.some(c=>c.op==='photo'&&c.token==='b'.repeat(64)&&c.id==='photo-0')));
 await page.waitForFunction(()=>SPEED_QA.pending()===0);
 await page.evaluate(async()=>{speedRevoked=true;try{await SPEED_QA.rpc('stays')}catch{}});
 check('Revocation immediately removes account and image memory',await page.evaluate(()=>JAPAN_MOMENTS.profile()===null&&SPEED_QA.photos()===0));
 check('Revocation removes photos from the current DOM',await page.locator('.moment-photo img').count()===0);
 // Disk storage failure must remain a harmless fallback, not a failed photo load.
 const context2=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),fallback=await context2.newPage();
 await fallback.addInitScript(()=>Object.defineProperty(window,'indexedDB',{get(){throw Error('Storage denied')},configurable:true}));
 await fallback.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='127.0.0.1')return r.abort();const f=path.resolve(base,u.pathname.slice(1));if(!fs.existsSync(f)||!fs.statSync(f).isFile())return r.fulfill({body:'<html></html>',contentType:'text/html'});return r.fulfill({body:fs.readFileSync(f),contentType:'application/javascript'})});
 await fallback.goto('http://127.0.0.1/');await fallback.addScriptTag({content:read('momenti-cache.js')});
 check('Unavailable device storage returns a clean miss',await fallback.evaluate(async()=>await JAPAN_MOMENT_CACHE.get({url:'fixture',trip:'trip',member:'guest',token:'a'.repeat(64)},'photo')===null));
 check('No runtime errors in app',errors.length===0);
 await browser.close();console.log('PASS '+checks+' actual-browser photo performance and privacy checks');
})().catch(e=>{console.error(e);process.exit(1)});
