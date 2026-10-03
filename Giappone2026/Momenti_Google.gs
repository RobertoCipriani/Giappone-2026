/* MOMENTI / Giappone 2026. Google Apps Script, eseguito come il proprietario.
 * Foto PRIVATE su Drive. Nessun token OAuth viene inviato al browser.
 * Incollare in un NUOVO progetto Apps Script, poi eseguire inizializzaMomenti (senza trattino basso finale).
 */
var MOMENTI_ORIGIN = 'https://robertocipriani.github.io';
var MOMENTI_LIMITS = {photoBytes:350000,posts:5000,members:30,daily:20};
var MOMENTI_MEMBER_HEADERS = ['id','hash_accesso','nome_JSON','creato_UTC','ruolo','revocato'];
var MOMENTI_POST_HEADERS = ['id','autore_id','nome_JSON','descrizione_JSON','foto_Drive_id','foto_UTC','pubblicato_UTC','latitudine','longitudine','luogo_JSON','origine_foto','dimensione_byte','eliminato_UTC'];


// Voce visibile nel menu Esegui. L'avvio richiede l'identità del proprietario.
function inizializzaMomenti() {
 var active=Session.getActiveUser().getEmail();
 var effective=Session.getEffectiveUser().getEmail();
 if(!active||!effective||active!==effective)throw new Error('Avvia inizializzaMomenti dall’editor Apps Script con l’account proprietario. Questa funzione non è disponibile agli altri utenti dell’app web.');
 console.log('Avvio della configurazione Momenti.');
 inizializzaMomenti_();
 console.log('Configurazione completata: copia il CODICE PRIVATO DI ATTIVAZIONE dal registro di esecuzione.');
}

// La funzione interna resta privata; per avviare usare inizializzaMomenti.
function inizializzaMomenti_() {
 var lock=LockService.getScriptLock();lock.waitLock(25000);
 try {
  var props=PropertiesService.getScriptProperties();
  var folderId=props.getProperty('mom_folder');
  var folder=folderId?DriveApp.getFolderById(folderId):DriveApp.createFolder('Giappone 2026 - Momenti');
  if(folder.isTrashed())throw new Error('Ripristina la cartella Momenti dal cestino di Drive.');
  props.setProperty('mom_folder',folder.getId());
  var sheetId=props.getProperty('mom_sheet');
  var book=sheetId?SpreadsheetApp.openById(sheetId):SpreadsheetApp.create('Giappone 2026 - Registro Momenti');
  if(!sheetId){DriveApp.getFileById(book.getId()).moveTo(folder);props.setProperty('mom_sheet',book.getId());}
  ['Partecipanti','Momenti'].forEach(function(name){var s=book.getSheetByName(name)||book.insertSheet(name);var headers=name==='Momenti'?MOMENTI_POST_HEADERS:MOMENTI_MEMBER_HEADERS;if(s.getLastRow()===0){s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#192b38').setFontColor('#ffffff');s.setFrozenRows(1);s.getRange(1,1,s.getMaxRows(),headers.length).setNumberFormat('@');}});
  if(!props.getProperty('mom_group'))props.setProperty('mom_group',Utilities.getUuid());
  if(!props.getProperty('mom_owner'))props.setProperty('mom_owner',Utilities.getUuid());
  if(!props.getProperty('mom_name'))props.setProperty('mom_name','Giappone 2026');
  if(!props.getProperty('mom_rev'))props.setProperty('mom_rev','1');
  var code=momentToken_();props.setProperty('mom_activation_hash',momentHash_(code));props.setProperty('mom_activation_expires',String(Date.now()+7*86400000));
  // Il codice privato è mostrato SOLO a chi esegue nell’editor, non inserito nel sorgente.
  Logger.log('CODICE PRIVATO DI ATTIVAZIONE (non inviarlo agli amici):\n'+code);
  Logger.log('Cartella foto: '+folder.getUrl());Logger.log('Registro: '+book.getUrl());
  Logger.log('Ora pubblica come App web: Esegui come Me; accesso Chiunque. Usa /exec nell’app del viaggio.');
 }finally{lock.releaseLock();}
}

function doGet(e) {
 var channel=String((e&&e.parameter&&e.parameter.channel)||'');
 if(!/^[a-zA-Z0-9_-]{20,80}$/.test(channel))return HtmlService.createHtmlOutput('<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font:16px system-ui;padding:30px;color:#192b38"><h1>Momenti è collegabile.</h1><p>Copia questo URL che termina con /exec e incollalo nell’app del viaggio, nella sezione Momenti. Non serve aprire questa pagina per vedere le foto.</p></body></html>');
 var html='<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"></head><body><script>'+momentBridgeCode_(channel)+'<\/script></body></html>';
 return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function momentBridgeCode_(channel) {
 return "\n(()=>{'use strict';\n const channel=CHANNEL,origin=ORIGIN,records=new Map();\n const send=data=>{try{window.top.postMessage(JSON.stringify(Object.assign({channel,kind:'momenti-drive'},data)),origin)}catch{}};\n const ready=()=>send({type:'ready',version:2});\n let started=false;const hello=setInterval(()=>{if(!started)ready()},2000);\n function trim(){const now=Date.now();for(const [key,record] of records)if(record.done&&now-record.at>120000)records.delete(key);if(records.size>32)for(const [key,record] of records){if(record.done&&!record.write)records.delete(key);if(records.size<=32)break}}\n window.addEventListener('message',event=>{\n  let m;try{m=typeof event.data==='string'?JSON.parse(event.data):event.data}catch{return}\n  if(event.origin!==origin||!m||m.channel!==channel||m.kind!=='momenti-drive'||m.type!=='request'||typeof m.id!=='string'||m.id.length>100||!m.payload||typeof m.payload!=='object')return;\n  started=true;clearInterval(hello);trim();\n  const previous=records.get(m.id);if(previous){if(previous.done)send(previous.reply);return}\n  const requestId=m.id,record={done:false,at:Date.now(),write:['activate','join','rename','publish','delete','rotate','removeMember'].includes(m.payload.op)};records.set(requestId,record);\n  function finish(result){record.done=true;record.at=Date.now();record.reply={type:'response',id:requestId,result};send(record.reply);trim()}\n  try{google.script.run.withSuccessHandler(value=>{try{if(typeof value!=='string')throw Error('FORMAT');finish(JSON.parse(value))}catch{finish({ok:false,code:'BRIDGE_FORMAT',message:'La risposta Google non è leggibile. Aggiorna il deployment dello script alla nuova versione.'})}}).withFailureHandler(()=>finish({ok:false,code:'GOOGLE_ERROR',message:'Google non ha completato la richiesta. Riprova tra poco.'})).momentiRpcJson(JSON.stringify(m.payload))}\n  catch{finish({ok:false,code:'BRIDGE_ERROR',message:'Il collegamento Google non ha avviato la richiesta. Aggiorna lo script e pubblica una nuova versione del deployment.'})}\n });\n ready();\n})();"
  .replace('CHANNEL',JSON.stringify(channel)).replace('ORIGIN',JSON.stringify(MOMENTI_ORIGIN));
}

// Unica funzione pubblica di dati. Tutte le operazioni hanno controlli lato server.

/* Il ponte passa testo JSON, con gli stessi controlli del metodo originale. */
function momentiRpcJson(text) {
 if(typeof text!=='string'||text.length>1500000)return JSON.stringify({ok:false,code:'INVALID',message:'Richiesta non valida.'});
 var request;try{request=JSON.parse(text)}catch{return JSON.stringify({ok:false,code:'INVALID',message:'Richiesta non valida.'});}
 return JSON.stringify(momentiRpc(request));
}

function momentiRpc(request) {
 try {
  if(!request||typeof request!=='object')throw momentError_('INVALID','Richiesta non valida.');
  var op=String(request.op||''),data=request.data||{};
  if(['activate','join','rename','publish','delete','rotate','removeMember'].indexOf(op)>=0){var lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw momentError_('BUSY','Il diario sta ricevendo altri momenti. Attendi qualche secondo e riprova.');try{return {ok:true,data:momentWrite_(op,data,request.token)}}finally{lock.releaseLock();}}
  var member=momentMember_(request.token);
  if(op==='feed')return {ok:true,data:momentFeed_(member,data)};
  if(op==='photo')return {ok:true,data:momentPhoto_(member,data)};
  if(op==='members'){if(member.role!=='owner')throw momentError_('DENIED','Solo l’organizzatore può gestire i partecipanti.');return {ok:true,data:momentRows_('Partecipanti').filter(function(r){return r[5]!=='1'}).map(function(r){return {id:r[0],name:momentParseText_(r[2]),role:r[4]};})};}
  throw momentError_('INVALID','Operazione non disponibile.');
 }catch(error){return {ok:false,code:error.momentCode||'GOOGLE_ERROR',message:error.momentCode?error.message:'Google non ha completato la richiesta. Verifica la configurazione, lo spazio Drive e riprova tra poco.'};}
}
function momentError_(code,message){var error=new Error(message);error.momentCode=code;return error;}
function momentProps_(){var p=PropertiesService.getScriptProperties();if(!p.getProperty('mom_folder')||!p.getProperty('mom_sheet'))throw momentError_('NOT_READY','Esegui prima inizializzaMomenti nell’editor Apps Script.');return p;}
function momentToken_(){return (Utilities.getUuid()+Utilities.getUuid()).replace(/-/g,'');}
function momentHash_(value){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(value),Utilities.Charset.UTF_8).map(function(b){return ('0'+(b&255).toString(16)).slice(-2)}).join('');}
function momentSame_(a,b){a=String(a||'');b=String(b||'');if(a.length!==b.length)return false;var diff=0;for(var i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;}
function momentText_(value,max,required){if(typeof value!=='string')value='';value=value.trim();if(value.length>max||required&&!value)throw momentError_('INVALID','Controlla i campi: nome, descrizione o luogo troppo lunghi.');return value;}
function momentParseText_(value){try{return JSON.parse(String(value))}catch{return ''}}
function momentSheet_(name){var s=SpreadsheetApp.openById(momentProps_().getProperty('mom_sheet')).getSheetByName(name);if(!s)throw momentError_('NOT_READY','Il registro Momenti non è completo. Esegui inizializzaMomenti nell’editor.');return s;}
function momentRows_(name){var s=momentSheet_(name);return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,name==='Momenti'?MOMENTI_POST_HEADERS.length:MOMENTI_MEMBER_HEADERS.length).getValues();}
function momentRev_(){var p=momentProps_();p.setProperty('mom_rev',String(Number(p.getProperty('mom_rev')||0)+1));}
function momentTrip_(){var p=momentProps_();return {id:p.getProperty('mom_group'),name:p.getProperty('mom_name'),owner_id:p.getProperty('mom_owner')};}
function momentMember_(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw momentError_('ACCESS','Accesso non valido. Riapri il tuo invito.');var hash=momentHash_(token),cache=CacheService.getScriptCache(),key='member:'+hash,cached=cache.get(key);if(cached)return JSON.parse(cached);var row=momentRows_('Partecipanti').find(function(r){return momentSame_(r[1],hash)&&r[5]!=='1'});if(!row)throw momentError_('ACCESS','Accesso revocato o non valido. Chiedi all’organizzatore un nuovo invito.');var result={id:row[0],name:momentParseText_(row[2]),role:row[4],hash:hash};cache.put(key,JSON.stringify(result),30);return result;}
function momentRotate_(){var token=momentToken_();momentProps_().setProperty('mom_invite_hash',momentHash_(token));return token;}
function momentWrite_(op,d,token){
 var p=momentProps_(),members=momentRows_('Partecipanti'),ms=momentSheet_('Partecipanti');
 var accessKey=d.accessKey;if(accessKey!=null&&(typeof accessKey!=='string'||!/^[a-f0-9]{64}$/.test(accessKey)))throw momentError_('INVALID','Accesso del browser non valido.');
 var accessHash=accessKey?momentHash_(accessKey):'',existingAccess=accessKey?members.find(function(r){return momentSame_(r[1],accessHash);}):null;
 if(op==='activate'){
  if(existingAccess){
   if(existingAccess[0]!==p.getProperty('mom_owner')||existingAccess[4]!=='owner'||existingAccess[5]==='1')throw momentError_('ACCESS','Questo accesso non è disponibile.');
   return {member:{id:existingAccess[0],name:momentParseText_(existingAccess[2]),role:'owner'},token:accessKey,trip:momentTrip_(),recovered:true};
  }
  if(typeof d.code!=='string'||!/^[a-f0-9]{64}$/.test(d.code)||!momentSame_(momentHash_(d.code),p.getProperty('mom_activation_hash'))||Number(p.getProperty('mom_activation_expires'))<Date.now())throw momentError_('ACTIVATION','Codice di attivazione non valido, già usato o scaduto. Esegui inizializzaMomenti nell’editor per ottenerne uno nuovo.');
  var name=momentText_(d.name,40,true),owner=p.getProperty('mom_owner'),memberToken=accessKey||momentToken_(),row=members.findIndex(function(r){return r[0]===owner}),now=new Date().toISOString();
  if(row>=0){CacheService.getScriptCache().remove('member:'+members[row][1]);ms.getRange(row+2,1,1,6).setValues([[owner,momentHash_(memberToken),JSON.stringify(name),members[row][3],'owner','0']]);}else ms.appendRow([owner,momentHash_(memberToken),JSON.stringify(name),now,'owner','0']);
  var invite=momentRotate_();p.deleteProperty('mom_activation_hash');p.deleteProperty('mom_activation_expires');momentRev_();return {member:{id:owner,name:name,role:'owner'},token:memberToken,trip:momentTrip_(),invite:invite};
 }
 if(op==='join'){
  if(typeof d.invite!=='string'||!/^[a-f0-9]{64}$/.test(d.invite)||!momentSame_(momentHash_(d.invite),p.getProperty('mom_invite_hash')))throw momentError_('INVITE','Invito non valido o sostituito. Chiedi il nuovo collegamento all’organizzatore.');
  if(existingAccess){
   if(existingAccess[4]!=='member'||existingAccess[5]==='1')throw momentError_('ACCESS','Questo accesso è stato revocato o non è valido.');
   return {member:{id:existingAccess[0],name:momentParseText_(existingAccess[2]),role:'member'},token:accessKey,trip:momentTrip_(),recovered:true};
  }
  if(members.filter(function(r){return r[5]!=='1'}).length>=MOMENTI_LIMITS.members)throw momentError_('LIMIT','Il gruppo ha raggiunto 30 partecipanti.');
  var memberToken=accessKey||momentToken_(),id=Utilities.getUuid(),name=momentText_(d.name,40,true);ms.appendRow([id,momentHash_(memberToken),JSON.stringify(name),new Date().toISOString(),'member','0']);momentRev_();return {member:{id:id,name:name,role:'member'},token:memberToken,trip:momentTrip_()};
 }
 var member=momentMember_(token);
 if(op==='rename'){var name=momentText_(d.name,40,true),i=members.findIndex(function(r){return r[0]===member.id});ms.getRange(i+2,3).setValue(JSON.stringify(name));CacheService.getScriptCache().remove('member:'+member.hash);momentRev_();return {name:name};}
 if(op==='rotate'){if(member.role!=='owner')throw momentError_('DENIED','Solo l’organizzatore può cambiare l’invito.');return {invite:momentRotate_()};}
 if(op==='removeMember'){if(member.role!=='owner'||d.id===member.id)throw momentError_('DENIED','Puoi rimuovere solo gli altri partecipanti.');var i=members.findIndex(function(r){return r[0]===d.id&&r[5]!=='1'});if(i<0)throw momentError_('INVALID','Partecipante non trovato.');ms.getRange(i+2,6).setValue('1');CacheService.getScriptCache().remove('member:'+members[i][1]);momentRev_();return {invite:momentRotate_()};}
 var rows=momentRows_('Momenti'),sheet=momentSheet_('Momenti');
 if(op==='delete'){var i=rows.findIndex(function(r){return r[0]===d.id&&r[12]===''});if(i<0)throw momentError_('INVALID','Il momento è già stato eliminato.');var row=rows[i];if(row[1]!==member.id&&member.role!=='owner')throw momentError_('DENIED','Puoi eliminare soltanto i tuoi momenti.');sheet.getRange(i+2,13).setValue(new Date().toISOString());momentRev_();var cleaned=true;try{momentFile_(row[4]).setTrashed(true)}catch{cleaned=false}return {cleaned:cleaned};}
 if(op==='publish'){
  if(typeof d.id!=='string'||!/^[a-f0-9-]{36}$/.test(d.id))throw momentError_('INVALID','Identificativo foto non valido.');
  var existing=rows.find(function(r){return r[0]===d.id});if(existing){if(existing[1]!==member.id||existing[12]!=='')throw momentError_('INVALID','Questo momento non può essere inviato.');return {post:momentPost_(existing),duplicate:true};}
  if(rows.filter(function(r){return r[12]===''}).length>=MOMENTI_LIMITS.posts)throw momentError_('LIMIT','Il diario ha raggiunto 5000 foto. Conserva una copia dei ricordi e libera l’archivio.');
  var now=new Date(),today=Utilities.formatDate(now,'Asia/Tokyo','yyyy-MM-dd');if(rows.filter(function(r){return r[1]===member.id&&Utilities.formatDate(new Date(r[6]),'Asia/Tokyo','yyyy-MM-dd')===today}).length>=MOMENTI_LIMITS.daily)throw momentError_('LIMIT','Hai raggiunto 20 momenti per oggi.');
  var caption=momentText_(d.caption,600,false),place=momentText_(d.place,100,false),lat=d.latitude,lng=d.longitude;if(lat==null&&lng==null){lat='';lng='';}else if(typeof lat!=='number'||typeof lng!=='number'||!isFinite(lat)||!isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw momentError_('INVALID','Posizione non valida.');
  if(typeof d.photo!=='string'||d.photo.length>Math.ceil(MOMENTI_LIMITS.photoBytes/3)*4||! /^[A-Za-z0-9+/]+={0,2}$/.test(d.photo))throw momentError_('PHOTO','Foto troppo grande o non leggibile.');
  var bytes=Utilities.base64Decode(d.photo);if(bytes.length>MOMENTI_LIMITS.photoBytes||bytes.length<4||(bytes[0]&255)!==255||(bytes[1]&255)!==216||(bytes[2]&255)!==255)throw momentError_('PHOTO','La foto deve essere JPEG, massimo 350 KB.');
  var captured=new Date(d.captured_at);if(!isFinite(captured.getTime())||captured>new Date(now.getTime()+300000)||captured<new Date(now.getTime()-86400000))captured=now;
  var file=DriveApp.getFolderById(p.getProperty('mom_folder')).createFile(Utilities.newBlob(bytes,'image/jpeg','Giappone-'+today+'-'+d.id+'.jpg'));
  var row=[d.id,member.id,JSON.stringify(member.name),JSON.stringify(caption),file.getId(),captured.toISOString(),now.toISOString(),lat,lng,JSON.stringify(place),d.source==='camera'?'camera':'selected',bytes.length,''];
  try{sheet.appendRow(row);SpreadsheetApp.flush();}catch(error){try{file.setTrashed(true)}catch{}throw error;}momentRev_();return {post:momentPost_(row)};
 }
 throw momentError_('INVALID','Operazione non disponibile.');
}
function momentPost_(r){return {id:r[0],author_id:r[1],author_name:momentParseText_(r[2]),caption:momentParseText_(r[3]),photo_path:r[0],captured_at:r[5],created_at:r[6],latitude:r[7]===''?null:Number(r[7]),longitude:r[8]===''?null:Number(r[8]),place_label:momentParseText_(r[9]),source:r[10],size_bytes:Number(r[11])};}
function momentFeed_(member,d){var p=momentProps_(),revision=p.getProperty('mom_rev');if(d.revision===revision&&!d.before)return {unchanged:true,revision:revision};var rows=momentRows_('Momenti').filter(function(r){return r[12]===''&&(!d.mine||r[1]===member.id)}).map(momentPost_).sort(function(a,b){return b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)});if(d.before){if(typeof d.before.time!=='string'||typeof d.before.id!=='string')throw momentError_('INVALID','Pagina non valida.');rows=rows.filter(function(r){return r.created_at<d.before.time||r.created_at===d.before.time&&r.id<d.before.id;});}var limit=Math.max(1,Math.min(12,Number(d.limit)||12));return {posts:rows.slice(0,limit),hasMore:rows.length>limit,revision:revision,trip:momentTrip_()};}
function momentFile_(id){var p=momentProps_(),file=DriveApp.getFileById(id),parents=file.getParents(),inside=false;while(parents.hasNext())if(parents.next().getId()===p.getProperty('mom_folder'))inside=true;if(!inside)throw momentError_('DENIED','Foto fuori dall’archivio del gruppo.');return file;}
function momentPhoto_(member,d){var row=momentRows_('Momenti').find(function(r){return r[0]===d.id&&r[12]===''});if(!row)throw momentError_('PHOTO','Il momento non è più disponibile.');var file=momentFile_(row[4]);if(file.isTrashed())throw momentError_('PHOTO','La foto è nel cestino di Drive.');var blob=file.getBlob();return {photo:Utilities.base64Encode(blob.getBytes()),mimeType:'image/jpeg'};}
