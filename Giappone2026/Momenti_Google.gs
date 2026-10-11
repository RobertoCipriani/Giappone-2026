/* MOMENTI / Giappone 2026. Google Apps Script, eseguito come il proprietario.
 * Foto PRIVATE su Drive. Nessun token OAuth viene inviato al browser.
 * Prima attivazione: nuovo progetto ed eseguire inizializzaMomenti.
 * Aggiornamento: sostituire il codice nel progetto esistente e aggiornare il deployment.
 * Non inizializzare di nuovo per attivare profili, like e commenti.
 */
var MOMENTI_ORIGIN = 'https://robertocipriani.github.io';
var MOMENTI_LIMITS = {photoBytes:350000,posts:5000,members:30,daily:20,comments:20000,commentsDaily:60,likes:20000,sessions:1500};
var MOMENTI_SOCIAL_VERSION=4;
var MOMENTI_WRITE_LOCKED=false;
var MOMENTI_SOCIAL_HEADERS={Account:['autore_id','hash_codice','creato_UTC'],Sessioni:['hash_accesso','autore_id','creato_UTC'],Commenti:['id','momento_id','autore_id','nome_JSON','testo_JSON','creato_UTC','eliminato_UTC'],Like:['momento_id','autore_id','attivo','aggiornato_UTC']};
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
 return "\n(()=>{'use strict';\n const channel=CHANNEL,origin=ORIGIN,records=new Map();\n const send=data=>{try{window.top.postMessage(JSON.stringify(Object.assign({channel,kind:'momenti-drive'},data)),origin)}catch{}};\n const ready=()=>send({type:'ready',version:4});\n let started=false;const hello=setInterval(()=>{if(!started)ready()},2000);\n function trim(){const now=Date.now();for(const [key,record] of records)if(record.done&&now-record.at>120000)records.delete(key);if(records.size>32)for(const [key,record] of records){if(record.done&&!record.write)records.delete(key);if(records.size<=32)break}}\n window.addEventListener('message',event=>{\n  let m;try{m=typeof event.data==='string'?JSON.parse(event.data):event.data}catch{return}\n  if(event.origin!==origin||!m||m.channel!==channel||m.kind!=='momenti-drive'||m.type!=='request'||typeof m.id!=='string'||m.id.length>100||!m.payload||typeof m.payload!=='object')return;\n  started=true;clearInterval(hello);trim();\n  const previous=records.get(m.id);if(previous){if(previous.done)send(previous.reply);return}\n  const requestId=m.id,record={done:false,at:Date.now(),write:['activate','join','login','setCode','resetCode','rename','publish','delete','comment','deleteComment','like','rotate','removeMember','saveStays','kartRun','kartBuy','kartSkinSave'].includes(m.payload.op)};records.set(requestId,record);\n  function finish(result){record.done=true;record.at=Date.now();record.reply={type:'response',id:requestId,result};send(record.reply);trim()}\n  try{google.script.run.withSuccessHandler(value=>{try{if(typeof value!=='string')throw Error('FORMAT');finish(JSON.parse(value))}catch{finish({ok:false,code:'BRIDGE_FORMAT',message:'La risposta Google non è leggibile. Aggiorna il deployment dello script alla nuova versione.'})}}).withFailureHandler(()=>finish({ok:false,code:'GOOGLE_ERROR',message:'Google non ha completato la richiesta. Riprova tra poco.'})).momentiRpcJson(JSON.stringify(m.payload))}\n  catch{finish({ok:false,code:'BRIDGE_ERROR',message:'Il collegamento Google non ha avviato la richiesta. Aggiorna lo script e pubblica una nuova versione del deployment.'})}\n });\n ready();\n})();"
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
  if(op==='capabilities')return {ok:true,data:{version:MOMENTI_SOCIAL_VERSION,accounts:true,social:true,privateStays:true,kart:true}};
  if(['activate','join','login','setCode','resetCode','rename','publish','delete','comment','deleteComment','like','rotate','removeMember','saveStays','kartRun','kartBuy','kartSkinSave'].indexOf(op)>=0){var lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw momentError_('BUSY','Il diario sta ricevendo altri momenti. Attendi qualche secondo e riprova.');try{MOMENTI_WRITE_LOCKED=true;return {ok:true,data:momentWrite_(op,data,request.token)}}finally{MOMENTI_WRITE_LOCKED=false;lock.releaseLock();}}
  var member=momentMember_(request.token);
  if(op.indexOf('kart')===0)return {ok:true,data:momentKartRead_(op,member,data)};
  if(op==='stays')return {ok:true,data:momentStayRead_(member)};
  if(op==='feed')return {ok:true,data:momentFeed_(member,data)};
  if(op==='photo')return {ok:true,data:momentPhoto_(member,data)};
  if(op==='comments')return {ok:true,data:momentComments_(member,data)};
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
function momentMember_(token){if(typeof token!=='string'||!/^[a-f0-9]{64}$/.test(token))throw momentError_('ACCESS','Accesso non valido. Riapri il tuo invito.');var hash=momentHash_(token),cache=CacheService.getScriptCache(),key='member:'+hash,cached=cache.get(key);if(cached)return JSON.parse(cached);var members=momentRows_('Partecipanti'),row=members.find(function(r){return momentSame_(r[1],hash)&&r[5]!=='1'});if(!row){var sessions=momentSocialRows_('Sessioni'),session=sessions.find(function(r){return momentSame_(r[0],hash)});if(session)row=members.find(function(r){return r[0]===session[1]&&r[5]!=='1'});if(row)return {id:row[0],name:momentParseText_(row[2]),role:row[4],hash:hash};}if(!row)throw momentError_('ACCESS','Accesso revocato o non valido. Chiedi all’organizzatore un nuovo invito.');var result={id:row[0],name:momentParseText_(row[2]),role:row[4],hash:hash};cache.put(key,JSON.stringify(result),30);return result;}
function momentRotate_(){var token=momentToken_();momentProps_().setProperty('mom_invite_hash',momentHash_(token));return token;}
function momentWrite_(op,d,token){
 if(op.indexOf('kart')===0)return momentKartWrite_(op,d,token);
 if(op==='saveStays')return momentStayWrite_(d,token);
 var p=momentProps_(),members=momentRows_('Partecipanti'),ms=momentSheet_('Partecipanti');
 var accessKey=d.accessKey;if(accessKey!=null&&(typeof accessKey!=='string'||!/^[a-f0-9]{64}$/.test(accessKey)))throw momentError_('INVALID','Accesso del browser non valido.');
 var accessHash=accessKey?momentHash_(accessKey):'',existingAccess=accessKey?members.find(function(r){return momentSame_(r[1],accessHash);}):null;
 if(op==='login')return momentLogin_(d,token,members);
 var personalCode=d.personalCode!=null?momentCode_(d.personalCode):null;
 if(op==='activate'){
  if(existingAccess){
   if(existingAccess[0]!==p.getProperty('mom_owner')||existingAccess[4]!=='owner'||existingAccess[5]==='1')throw momentError_('ACCESS','Questo accesso non è disponibile.');
   if(personalCode)momentSetCode_(existingAccess[0],personalCode);return {member:{id:existingAccess[0],name:momentParseText_(existingAccess[2]),role:'owner'},token:accessKey,trip:momentTrip_(),hasCode:momentHasCode_(existingAccess[0]),version:3,recovered:true};
  }
  if(typeof d.code!=='string'||!/^[a-f0-9]{64}$/.test(d.code)||!momentSame_(momentHash_(d.code),p.getProperty('mom_activation_hash'))||Number(p.getProperty('mom_activation_expires'))<Date.now())throw momentError_('ACTIVATION','Codice di attivazione non valido, già usato o scaduto. Esegui inizializzaMomenti nell’editor per ottenerne uno nuovo.');
  if(personalCode)momentCodeAvailable_(personalCode,p.getProperty('mom_owner'));
  var name=momentText_(d.name,40,true),owner=p.getProperty('mom_owner'),memberToken=accessKey||momentToken_(),row=members.findIndex(function(r){return r[0]===owner}),now=new Date().toISOString();
  if(row>=0){CacheService.getScriptCache().remove('member:'+members[row][1]);ms.getRange(row+2,1,1,6).setValues([[owner,momentHash_(memberToken),JSON.stringify(name),members[row][3],'owner','0']]);}else ms.appendRow([owner,momentHash_(memberToken),JSON.stringify(name),now,'owner','0']);
  if(personalCode)momentSetCode_(owner,personalCode);var invite=momentRotate_();p.deleteProperty('mom_activation_hash');p.deleteProperty('mom_activation_expires');momentRev_();return {member:{id:owner,name:name,role:'owner'},token:memberToken,trip:momentTrip_(),hasCode:momentHasCode_(owner),version:3,invite:invite};
 }
 if(op==='join'){
  if(typeof d.invite!=='string'||!/^[a-f0-9]{64}$/.test(d.invite)||!momentSame_(momentHash_(d.invite),p.getProperty('mom_invite_hash')))throw momentError_('INVITE','Invito non valido o sostituito. Chiedi il nuovo collegamento all’organizzatore.');
  if(personalCode)momentCodeAvailable_(personalCode,existingAccess?existingAccess[0]:null);
  if(existingAccess){
   if(existingAccess[4]!=='member'||existingAccess[5]==='1')throw momentError_('ACCESS','Questo accesso è stato revocato o non è valido.');
   if(personalCode)momentSetCode_(existingAccess[0],personalCode);return {member:{id:existingAccess[0],name:momentParseText_(existingAccess[2]),role:'member'},token:accessKey,trip:momentTrip_(),hasCode:momentHasCode_(existingAccess[0]),version:3,recovered:true};
  }
  if(members.filter(function(r){return r[5]!=='1'}).length>=MOMENTI_LIMITS.members)throw momentError_('LIMIT','Il gruppo ha raggiunto 30 partecipanti.');
  var memberToken=accessKey||momentToken_(),id=Utilities.getUuid(),name=momentText_(d.name,40,true);ms.appendRow([id,momentHash_(memberToken),JSON.stringify(name),new Date().toISOString(),'member','0']);if(personalCode)momentSetCode_(id,personalCode);momentRev_();return {member:{id:id,name:name,role:'member'},token:memberToken,trip:momentTrip_(),hasCode:!!personalCode,version:3};
 }
 var member=momentMember_(token);
 if(op==='setCode'){momentSetCode_(member.id,momentCode_(d.personalCode));momentRev_();return {hasCode:true};}
 if(op==='resetCode'){if(member.role!=='owner')throw momentError_('DENIED','Solo l’organizzatore può aiutare a recuperare un profilo.');if(!members.some(function(r){return r[0]===d.id&&r[5]!=='1'}))throw momentError_('INVALID','Partecipante non trovato.');momentSetCode_(d.id,momentCode_(d.personalCode));momentRev_();return {hasCode:true};}
 if(['comment','deleteComment','like'].indexOf(op)>=0)return momentSocialWrite_(op,d,member);
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
function momentFeed_(member,d){
 var p=momentProps_(),revision=p.getProperty('mom_rev'),profile={id:member.id,name:member.name,role:member.role},hasCode=momentHasCode_(member.id);
 if(d.revision===revision&&!d.before)return {unchanged:true,revision:revision,version:3,member:profile,hasCode:hasCode};
 var rows=momentRows_('Momenti').filter(function(r){return r[12]===''&&(!d.mine||r[1]===member.id)}).map(momentPost_).sort(function(a,b){return b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)});
 if(d.before){if(typeof d.before.time!=='string'||typeof d.before.id!=='string')throw momentError_('INVALID','Pagina non valida.');rows=rows.filter(function(r){return r.created_at<d.before.time||r.created_at===d.before.time&&r.id<d.before.id;});}
 var limit=Math.max(1,Math.min(12,Number(d.limit)||12)),page=rows.slice(0,limit),social=momentSocialMap_(member,page.map(function(post){return post.id}));
 page.forEach(function(post){Object.assign(post,social[post.id])});
 return {posts:page,hasMore:rows.length>limit,revision:revision,trip:momentTrip_(),member:profile,hasCode:hasCode,version:3};
}
function momentFile_(id){var p=momentProps_(),file=DriveApp.getFileById(id),parents=file.getParents(),inside=false;while(parents.hasNext())if(parents.next().getId()===p.getProperty('mom_folder'))inside=true;if(!inside)throw momentError_('DENIED','Foto fuori dall’archivio del gruppo.');return file;}
function momentPhoto_(member,d){var row=momentRows_('Momenti').find(function(r){return r[0]===d.id&&r[12]===''});if(!row)throw momentError_('PHOTO','Il momento non è più disponibile.');var file=momentFile_(row[4]);if(file.isTrashed())throw momentError_('PHOTO','La foto è nel cestino di Drive.');var blob=file.getBlob();return {photo:Utilities.base64Encode(blob.getBytes()),mimeType:'image/jpeg'};}

/* Migration is additive. Old participants, invitations and photo tokens remain valid. */
function momentSocialSheet_(name){
 var headers=MOMENTI_SOCIAL_HEADERS[name];if(!headers)throw momentError_('INVALID','Registro non valido.');
 var book=SpreadsheetApp.openById(momentProps_().getProperty('mom_sheet')),s=book.getSheetByName(name);
 if(!s||s.getLastRow()===0){var lock=LockService.getScriptLock(),owned=MOMENTI_WRITE_LOCKED;if(!owned&&!lock.tryLock(25000))throw momentError_('BUSY','Attendi un momento e riprova.');try{s=book.getSheetByName(name)||book.insertSheet(name);if(s.getLastRow()===0){s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#192b38').setFontColor('#ffffff');s.setFrozenRows(1);s.getRange(1,1,s.getMaxRows(),headers.length).setNumberFormat('@');}}finally{if(!owned)lock.releaseLock();}}
 return s;
}
function momentSocialRows_(name){var s=momentSocialSheet_(name);return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,MOMENTI_SOCIAL_HEADERS[name].length).getValues().map(function(row){return row.map(function(value){return value instanceof Date?value.toISOString():value==null?'':String(value)});});}
function momentCode_(value){if(typeof value!=='string')throw momentError_('CODE','Scegli un codice di 6 caratteri, con almeno una lettera e un numero.');var code=value.trim().toUpperCase();if(!/^[A-Z0-9]{6}$/.test(code)||!/[A-Z]/.test(code)||!/[0-9]/.test(code))throw momentError_('CODE','Usa esattamente 6 lettere e numeri, con almeno una lettera e un numero.');return code;}
function momentCodeHash_(code){
 var p=momentProps_(),secret=p.getProperty('mom_code_secret');if(!secret){secret=momentToken_();p.setProperty('mom_code_secret',secret);}
 return Utilities.computeHmacSha256Signature('mom-code-v1:'+code,secret).map(function(b){return ('0'+(b&255).toString(16)).slice(-2)}).join('');
}
function momentHasCode_(id){return momentSocialRows_('Account').some(function(r){return r[0]===id});}
function momentCodeAvailable_(code,id){var hash=momentCodeHash_(code);if(momentSocialRows_('Account').some(function(r){return r[0]!==id&&momentSame_(r[1],hash)}))throw momentError_('CODE_TAKEN','Questo codice è già usato: scegline un altro.');return hash;}
function momentSetCode_(id,code){var hash=momentCodeAvailable_(code,id),rows=momentSocialRows_('Account'),sheet=momentSocialSheet_('Account'),i=rows.findIndex(function(r){return r[0]===id}),row=[id,hash,new Date().toISOString()];if(i>=0)sheet.getRange(i+2,1,1,3).setValues([row]);else sheet.appendRow(row);}
function momentValidInvite_(invite){return typeof invite==='string'&&/^[a-f0-9]{64}$/.test(invite)&&momentSame_(momentHash_(invite),momentProps_().getProperty('mom_invite_hash'));}
function momentLogin_(d,token,members){
 // The invitation is a second secret: a six-character code alone never opens the public endpoint.
 var invited=momentValidInvite_(d.invite);if(!invited){try{momentMember_(token);invited=true}catch{}}
 if(!invited)throw momentError_('INVITE','Per recuperare il profilo apri il link d’invito attuale del gruppo.');
 var p=momentProps_(),attempt;try{attempt=JSON.parse(p.getProperty('mom_login_failures')||'null')}catch{}
 var now=Date.now();if(!attempt||now-attempt.since>=600000)attempt={since:now,count:0};if(attempt.count>=40)throw momentError_('RATE','Troppi codici errati. Attendi qualche minuto e riprova.');
 var code=momentCode_(d.personalCode),hash=momentCodeHash_(code),account=momentSocialRows_('Account').find(function(r){return momentSame_(r[1],hash)}),member=account&&members.find(function(r){return r[0]===account[0]&&r[5]!=='1'});
 if(!member){attempt.count++;p.setProperty('mom_login_failures',JSON.stringify(attempt));throw momentError_('LOGIN','Codice non corretto o profilo non disponibile.');}
 var access=typeof d.accessKey==='string'&&/^[a-f0-9]{64}$/.test(d.accessKey)?d.accessKey:momentToken_(),accessHash=momentHash_(access),sessions=momentSocialRows_('Sessioni'),existing=sessions.find(function(r){return momentSame_(r[0],accessHash)}),old=members.find(function(r){return momentSame_(r[1],accessHash)});
 if(existing&&existing[1]!==member[0]||old&&old[0]!==member[0])throw momentError_('ACCESS','Accesso del browser non valido.');
 if(!existing&&!old){if(sessions.length>=MOMENTI_LIMITS.sessions)throw momentError_('LIMIT','Il registro degli accessi è pieno. Contatta l’organizzatore.');momentSocialSheet_('Sessioni').appendRow([accessHash,member[0],new Date().toISOString()]);}
 return {member:{id:member[0],name:momentParseText_(member[2]),role:member[4]},token:access,trip:momentTrip_(),hasCode:true,version:3};
}
function momentLivePost_(id){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw momentError_('INVALID','Foto non valida.');var row=momentRows_('Momenti').find(function(r){return r[0]===id&&r[12]===''});if(!row)throw momentError_('INVALID','La foto non è più disponibile.');return row;}
function momentComment_(r){return {id:r[0],post_id:r[1],author_id:r[2],author_name:momentParseText_(r[3]),text:momentParseText_(r[4]),created_at:r[5]};}
function momentSocialMap_(member,ids){
 var map={};ids.forEach(function(id){map[id]={like_count:0,liked:false,comment_count:0,comments:[]}});
 momentSocialRows_('Like').forEach(function(r){if(map[r[0]]&&r[2]==='1'){map[r[0]].like_count++;if(r[1]===member.id)map[r[0]].liked=true;}});
 momentSocialRows_('Commenti').forEach(function(r){if(map[r[1]]&&r[6]===''){var info=map[r[1]];info.comment_count++;info.comments.push(momentComment_(r));}});
 ids.forEach(function(id){map[id].comments.sort(function(a,b){return a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id)});map[id].comments=map[id].comments.slice(-2);});
 return map;
}
function momentSocialWrite_(op,d,member){
 momentLivePost_(d.id);
 if(op==='like'){
  if(typeof d.liked!=='boolean')throw momentError_('INVALID','Like non valido.');var rows=momentSocialRows_('Like'),i=rows.findIndex(function(r){return r[0]===d.id&&r[1]===member.id}),sheet=momentSocialSheet_('Like'),row=[d.id,member.id,d.liked?'1':'0',new Date().toISOString()];
  if(i>=0){if(rows[i][2]!==row[2]){sheet.getRange(i+2,1,1,4).setValues([row]);momentRev_();}}else if(d.liked){if(rows.length>=MOMENTI_LIMITS.likes)throw momentError_('LIMIT','Il registro dei like è pieno.');sheet.appendRow(row);momentRev_();}
 }
 if(op==='comment'){
  if(typeof d.commentId!=='string'||!/^[a-f0-9-]{36}$/.test(d.commentId))throw momentError_('INVALID','Commento non valido.');
  var text=momentText_(d.text,600,true),rows=momentSocialRows_('Commenti'),old=rows.find(function(r){return r[0]===d.commentId});
  if(old){if(old[1]!==d.id||old[2]!==member.id||old[6]!=='')throw momentError_('INVALID','Questo commento non può essere inviato.');}
  else{
   if(rows.length>=MOMENTI_LIMITS.comments)throw momentError_('LIMIT','Il registro dei commenti è pieno.');
   var today=Utilities.formatDate(new Date(),'Asia/Tokyo','yyyy-MM-dd');if(rows.filter(function(r){return r[2]===member.id&&Utilities.formatDate(new Date(r[5]),'Asia/Tokyo','yyyy-MM-dd')===today}).length>=MOMENTI_LIMITS.commentsDaily)throw momentError_('LIMIT','Hai raggiunto 60 commenti per oggi.');
   momentSocialSheet_('Commenti').appendRow([d.commentId,d.id,member.id,JSON.stringify(member.name),JSON.stringify(text),new Date().toISOString(),'']);momentRev_();
  }
 }
 if(op==='deleteComment'){
  var rows=momentSocialRows_('Commenti'),i=rows.findIndex(function(r){return r[0]===d.commentId&&r[1]===d.id});
  if(i<0)throw momentError_('INVALID','Commento non trovato.');if(rows[i][2]!==member.id&&member.role!=='owner')throw momentError_('DENIED','Puoi eliminare solo i tuoi commenti.');
  if(rows[i][6]===''){momentSocialSheet_('Commenti').getRange(i+2,7).setValue(new Date().toISOString());momentRev_();}
 }
 return {social:momentSocialMap_(member,[d.id])[d.id]};
}
function momentComments_(member,d){
 momentLivePost_(d.id);var rows=momentSocialRows_('Commenti').filter(function(r){return r[1]===d.id&&r[6]===''}).map(momentComment_).sort(function(a,b){return b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id)});
 if(d.before){if(typeof d.before.time!=='string'||typeof d.before.id!=='string')throw momentError_('INVALID','Pagina non valida.');rows=rows.filter(function(c){return c.created_at<d.before.time||c.created_at===d.before.time&&c.id<d.before.id});}
 var limit=20;return {comments:rows.slice(0,limit).reverse(),hasMore:rows.length>limit};
}


// Private accommodation data stays in the existing, unshared Momenti workbook.
// These helpers are private Apps Script functions and cannot be called by google.script.run.
function momentStaySheet_(){
 var s=SpreadsheetApp.openById(momentProps_().getProperty('mom_sheet')).getSheetByName('AlloggiPrivati');
 if(!s||s.getLastRow()<3)throw momentError_('STAYS_NOT_READY','Gli alloggi privati non sono ancora configurati.');
 return s;
}
function momentStayConfig_(){
 var cells=momentStaySheet_().getRange(2,1,2,2).getValues();
 if(cells[0][0]!=='config'||cells[1][0]!=='autorizzazioni')throw momentError_('STAYS_NOT_READY','Il registro alloggi non è completo.');
 try{return {config:JSON.parse(cells[0][1]),permissions:JSON.parse(cells[1][1])};}
 catch(error){throw momentError_('STAYS_NOT_READY','Controlla il registro privato degli alloggi.');}
}
function momentStayEditor_(member,permissions){return member.role==='owner'||Array.isArray(permissions.editors)&&permissions.editors.indexOf(member.id)>=0;}
function momentStayPerson_(member,people){
 var bound=people.find(function(p){return (p.memberIds||[]).indexOf(member.id)>=0;});if(bound)return bound.id;
 var normalize=function(s){return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');},name=normalize(member.name);
 if(!name)return '';var matches=people.filter(function(p){return [p.name].concat(p.aliases||[]).some(function(a){return normalize(a)===name;});});
 if(matches.length===1)return matches[0].id;if(matches.length>1||name.length<3)return '';
 matches=people.filter(function(p){return [p.name].concat(p.aliases||[]).some(function(a){return normalize(a).indexOf(name)===0;});});return matches.length===1?matches[0].id:'';
}
function momentStayRead_(member){
 member=momentStayActive_(member);
 var stored=momentStayConfig_(),copy=JSON.parse(JSON.stringify(stored.config)),person=momentStayPerson_(member,copy.participants);
 copy.participants=copy.participants.map(function(p){return {id:p.id,name:p.name,aliases:p.aliases||[],memberIds:[]};});
 return {memberId:member.id,personId:person,canEdit:momentStayEditor_(member,stored.permissions),config:copy};
}
function momentStayValidate_(raw,previous){
 function fail(){throw momentError_('INVALID','Controlla nomi, strutture e assegnazioni degli alloggi.');}
 function text(v,max,required){if(v==null)v='';if(typeof v!=='string'||v.length>max||required&&!v.trim())fail();return v.trim();}
 function list(v,max,len){if(!Array.isArray(v)||v.length>max)fail();return v.map(function(x){return text(x,len,true);}).filter(function(x,i,a){return a.indexOf(x)===i;});}
 function date(v){return /^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;}
 function url(v,map){v=text(v,6000);if(!v)return '';if(!/^https:\/\/[^\s]+$/i.test(v))fail();var host=v.match(/^https:\/\/([^/?#]+)/i)[1].toLowerCase();if(host.indexOf('@')>=0||host.indexOf(':')>=0)fail();if(map&&host!=='maps.app.goo.gl'&&host!=='goo.gl'&&!/(^|\.)google\.[a-z.]+$/.test(host))fail();return v;}
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||!Array.isArray(raw.participants)||raw.participants.length>50||!raw.participants.length||!Array.isArray(raw.reservations)||raw.reservations.length>100||!Array.isArray(raw.nights)||raw.nights.length>100)fail();
 var ids={},old={};previous.participants.forEach(function(p){old[p.id]=p;});
 var people=raw.participants.map(function(p){if(!p||typeof p!=='object')fail();var id=text(p.id,100,true);if(ids[id]||!old[id])fail();ids[id]=true;return {id:id,name:text(p.name,80,true),aliases:list(p.aliases||[],30,80),memberIds:(old[id].memberIds||[]).slice()};});
 // Existing account bindings remain server-owned; the browser cannot grant editor rights.
 if(people.length!==previous.participants.length)fail();
 var bookings={},reservations=raw.reservations.map(function(b){if(!b||typeof b!=='object')fail();var id=text(b.id,100,true);if(bookings[id])fail();bookings[id]=true;var result={id:id,title:text(b.title,200,true),type:'Hotel/Casa'};
 ['phone','checkIn','checkOut','date','endDate','address','notes','payment','owner','deadline','status'].forEach(function(k){result[k]=text(b[k],k==='notes'?5000:k==='address'?1000:250);});
 if(result.date&&!date(result.date)||result.endDate&&(!date(result.endDate)||result.date&&result.endDate<=result.date))fail();
 result.mapUrl=url(b.mapUrl,true);result.sourceUrl=url(b.sourceUrl,false);result.links=(b.links||[]).map(function(v){return url(v,false);});if(result.links.length>20)fail();
 ['price','total','people'].forEach(function(k){if(b[k]==null||b[k]==='')result[k]=null;else {if(typeof b[k]!=='number'||!isFinite(b[k])||b[k]<0||b[k]>1000000)fail();result[k]=b[k];}});
 // Notes are plain text in private editor. Existing formatting is retained only if unchanged.
 var prior=previous.reservations.find(function(x){return x.id===id;});result.notesFormat=prior&&prior.notes===result.notes?prior.notesFormat||[]:[];return result;
 });
 var dates={},nights=raw.nights.map(function(n){if(!n||!date(n.date)||dates[n.date]||!Array.isArray(n.stays)||n.stays.length>20)fail();dates[n.date]=true;var assigned={},used={};
 return {date:n.date,stays:n.stays.map(function(s){if(!s||typeof s!=='object')fail();var bookingId=text(s.bookingId,100,true);if(!bookings[bookingId]||used[bookingId])fail();used[bookingId]=true;var guests=list(s.guestIds||[],50,100);guests.forEach(function(g){if(!ids[g]||assigned[g])fail();assigned[g]=true;});return {bookingId:bookingId,guestIds:guests,note:text(s.note,2000)};})};
 });
 var result={version:1,revision:Number(previous.revision||0)+1,participants:people,reservations:reservations,nights:nights};
 if(JSON.stringify(result).length>48000)fail();return result;
}
function momentStayWrite_(data,token){
 // Server authentication is required, including when the UI has management mode enabled.
 var member=momentStayActive_(momentMember_(token)),stored=momentStayConfig_();
 if(!momentStayEditor_(member,stored.permissions))throw momentError_('DENIED','Solo gli organizzatori possono modificare gli alloggi.');
 if(Number(data.expectedRevision)!==Number(stored.config.revision))throw momentError_('CONFLICT','Gli alloggi sono cambiati. Aggiorna e riprova per non sovrascrivere le modifiche degli altri.');
 var next=momentStayValidate_(data.config,stored.config);
 momentStaySheet_().getRange(2,2,1,2).setValues([[JSON.stringify(next),new Date().toISOString()]]);
 return momentStayRead_(member);
}
function momentStayActive_(member){
 // Recheck revocation even when the regular Momenti member cache is still warm.
 var row=momentRows_('Partecipanti').find(function(r){return r[0]===member.id&&String(r[5])!=='1';});
 if(!row)throw momentError_('ACCESS','Accesso revocato. Accedi di nuovo a Momenti.');
 return {id:row[0],name:momentParseText_(row[2]),role:row[4]};
}

// Private Grand Tour records and skins. Stored in the existing Momenti workbook/Drive.
var KART_VERSION='japan-v1';
var KART_ROSTER=[
 ['kitsu','Kitsu',0,'traveler'],['roberto','Robanana',250,'hero'],['leonardo','Leonardrift',300,'pope'],
 ['francesco','FranTokyo',350,'creature'],['andrea','AndreTornado',400,'muscular'],['antonella','Antornella',450,'white'],
 ['erika','Erikart',500,'traveler'],['gabriele','Gabbracoli',750,'octo'],['giorgia-s','Giorgiaku S.',550,'white'],
 ['giorgia-i','Giorgiaku I.',550,'traveler'],['manuel','Manu Turbo',600,'round'],['lorenzo','Lorenzen',650,'traveler'],
 ['federico','FedeFuga',700,'traveler'],['valerio','Valerazzo',800,'traveler']
];
var KART_HEADERS={KartProfili:['autore_id','stato_JSON','aggiornato_UTC'],KartGare:['id','autore_id','nome_JSON','versione','circuito','classe','giri','skin','tempo','giro_migliore','posizione','pubblicato_UTC'],KartSkin:['id','soprannome_JSON','corpo','crop_JSON','foto_Drive_id','aggiornato_UTC']};
function momentKartSheet_(name){
 var headers=KART_HEADERS[name];if(!headers)throw momentError_('INVALID','Registro di gioco non valido.');
 var book=SpreadsheetApp.openById(momentProps_().getProperty('mom_sheet')),s=book.getSheetByName(name);
 if(!s||s.getLastRow()===0){var lock=LockService.getScriptLock(),owned=MOMENTI_WRITE_LOCKED;if(!owned&&!lock.tryLock(25000))throw momentError_('BUSY','Attendi un momento e riprova.');try{s=book.getSheetByName(name)||book.insertSheet(name);if(s.getLastRow()===0){s.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold').setBackground('#192b38').setFontColor('#ffffff');s.setFrozenRows(1);s.getRange(1,1,s.getMaxRows(),headers.length).setNumberFormat('@');}}finally{if(!owned)lock.releaseLock();}}
 return s;
}
function momentKartRows_(name){var s=momentKartSheet_(name);return s.getLastRow()<2?[]:s.getRange(2,1,s.getLastRow()-1,KART_HEADERS[name].length).getValues().map(function(row){return row.map(function(v){return v instanceof Date?v.toISOString():v==null?'':String(v)});});}
function momentKartProfile_(member){
 var rows=momentKartRows_('KartProfili'),index=rows.findIndex(function(r){return r[0]===member.id}),state={xp:0,coins:0,completed:[],owned:['kitsu'],records:{}};
 if(index>=0){try{var saved=JSON.parse(rows[index][1]);state.owned=saved.owned||['kitsu'];}catch{throw momentError_('INVALID','Profilo di gioco non leggibile. Contatta l’organizzatore.');}}
 var unique={};momentKartRows_('KartGare').forEach(function(r){if(r[1]!==member.id||r[3]!==KART_VERSION||unique[r[0]])return;unique[r[0]]=true;var stage=Number(r[4]),place=Number(r[10]),first=state.completed.indexOf(stage)<0;if(first)state.completed.push(stage);state.xp+=first?150+(9-place)*10:40;state.coins+=first?120+(9-place)*10:30+(9-place)*5;var key=r[4]+':'+r[5]+':'+r[6],run={id:r[0],stage:stage,difficulty:r[5],laps:Number(r[6]),skin:r[7],time:Number(r[8]),bestLap:Number(r[9]),place:place,version:KART_VERSION};if(!state.records[key]||run.bestLap<state.records[key].bestLap)state.records[key]=run;});
 state.owned.forEach(function(id){var ch=KART_ROSTER.find(function(x){return x[0]===id});if(ch)state.coins-=ch[2]});state.coins=Math.max(0,state.coins);return {state:state,index:index};
}
function momentKartSave_(member,record){var s=momentKartSheet_('KartProfili'),values=[[member.id,JSON.stringify({owned:record.state.owned}),new Date().toISOString()]];if(record.index<0)s.appendRow(values[0]);else s.getRange(record.index+2,1,1,3).setValues(values);}
function momentKartEditor_(member){if(member.role==='owner')return true;try{var stored=momentStayConfig_();return momentStayEditor_(member,stored.permissions)}catch{return false}}
function momentKartSkins_(){var saved=momentKartRows_('KartSkin');return KART_ROSTER.map(function(ch){var r=saved.find(function(x){return x[0]===ch[0]});return {id:ch[0],nickname:r?momentParseText_(r[1]):ch[1],price:ch[2],body:r?r[2]:ch[3],crop:r?JSON.parse(r[3]):[1,.5,.35],hasPhoto:!!(r&&r[4]),updatedAt:r?r[5]:''};});}
function momentKartRead_(op,member,d){
 member=momentStayActive_(member);
 if(op==='kartState'){var record=momentKartProfile_(member);return {version:KART_VERSION,state:record.state,canEdit:momentKartEditor_(member),skins:momentKartSkins_()};}
 if(op==='kartPhoto'){var skin=momentKartRows_('KartSkin').find(function(r){return r[0]===d.id});if(!skin||!skin[4])throw momentError_('PHOTO','Foto non ancora disponibile.');var bytes=momentFile_(skin[4]).getBlob().getBytes();if(bytes.length>350000)throw momentError_('PHOTO','Foto troppo grande.');return {photo:Utilities.base64Encode(bytes)};}
 if(op==='kartRanks'){
  var stage=Number(d.stage),laps=Number(d.laps),difficulty=String(d.difficulty||'');if(d.version!==KART_VERSION||!Number.isInteger(stage)||stage<0||stage>=50||[1,3,5].indexOf(laps)<0||['easy','normal','hard'].indexOf(difficulty)<0)throw momentError_('INVALID','Filtro classifica non valido.');
  var members=momentRows_('Partecipanti').filter(function(r){return r[5]!=='1'}),roster=momentKartSkins_(),best={};
  momentKartRows_('KartGare').forEach(function(r){if(r[3]!==KART_VERSION||Number(r[4])!==stage||r[5]!==difficulty||Number(r[6])!==laps||!members.some(function(m){return m[0]===r[1]}))return;var candidate={memberId:r[1],name:momentParseText_(r[2]),skinName:(roster.find(function(ch){return ch.id===r[7]})||{nickname:r[7]}).nickname,time:Number(r[8]),bestLap:Number(r[9]),createdAt:r[11]};if(!best[r[1]]||candidate.bestLap<best[r[1]].bestLap||candidate.bestLap===best[r[1]].bestLap&&candidate.time<best[r[1]].time)best[r[1]]=candidate;});
  return {rows:Object.keys(best).map(function(id){return best[id]}).sort(function(a,b){return a.bestLap-b.bestLap||a.time-b.time}).slice(0,30)};
 }
 throw momentError_('INVALID','Operazione di gioco non disponibile.');
}
function momentKartWrite_(op,d,token){
 var member=momentStayActive_(momentMember_(token)),record=momentKartProfile_(member),state=record.state;
 if(op==='kartRun'){
  var rows=momentKartRows_('KartGare'),existing=rows.find(function(r){return r[0]===d.id});if(existing){if(existing[1]!==member.id)throw momentError_('INVALID','Identificativo gara non disponibile.');return {state:state,duplicate:true};}
  var stage=d.stage,laps=d.laps,place=d.place,time=d.time,best=d.bestLap,skin=KART_ROSTER.find(function(ch){return ch[0]===d.skin});
  if(typeof d.id!=='string'||!/^[a-f0-9-]{36}$/.test(d.id)||d.version!==KART_VERSION||!Number.isInteger(stage)||stage<0||stage>=50||[1,3,5].indexOf(laps)<0||['easy','normal','hard'].indexOf(d.difficulty)<0||!Number.isInteger(place)||place<1||place>8||typeof time!=='number'||!isFinite(time)||time<20*laps||time>7200||typeof best!=='number'||!isFinite(best)||best<20||best>time/laps+.1||!skin)throw momentError_('INVALID','Tempo o gara non validi.');
  var unlocked=0;while(state.completed.indexOf(unlocked)>=0)unlocked++;if(stage>Math.min(49,unlocked))throw momentError_('LOCKED','Completa prima la gara precedente.');
  if(rows.length>=5000)throw momentError_('LIMIT','Il registro ha raggiunto 5000 gare. L’organizzatore può archiviare i risultati.');var today=new Date().toISOString().slice(0,10);if(rows.filter(function(r){return r[1]===member.id&&r[11].slice(0,10)===today}).length>=100)throw momentError_('LIMIT','Hai salvato già 100 gare oggi.');
  var first=state.completed.indexOf(stage)<0,xp=first?150+(9-place)*10:40,coins=first?120+(9-place)*10:30+(9-place)*5;
  // A new profile may already have used a locally purchased skin before Google was updated.
  // Races stay valid; only purchases are authorized against the server's coin balance.
  // Append is the only mutation: retries derive rewards from this ledger and cannot double-credit.
  var sheet=momentKartSheet_('KartGare');sheet.appendRow([d.id,member.id,JSON.stringify(member.name),KART_VERSION,stage,d.difficulty,laps,d.skin,time,best,place,new Date().toISOString()]);
  SpreadsheetApp.flush();return {state:momentKartProfile_(member).state,xp:xp,coins:coins};
 }
 if(op==='kartBuy'){var ch=KART_ROSTER.find(function(x){return x[0]===d.id});if(!ch)throw momentError_('INVALID','Skin non disponibile.');if(state.owned.indexOf(d.id)>=0)return {state:state};if(state.coins<ch[2])throw momentError_('COINS','Non hai ancora abbastanza monete.');state.coins-=ch[2];state.owned.push(d.id);momentKartSave_(member,record);return {state:state};}
 if(op==='kartSkinSave'){
  if(!momentKartEditor_(member))throw momentError_('DENIED','Solo Roberto e gli organizzatori autorizzati possono modificare le skin condivise.');var character=KART_ROSTER.find(function(x){return x[0]===d.id&&x[0]!=='kitsu'});if(!character)throw momentError_('INVALID','Skin non disponibile.');
  var nickname=momentText_(d.nickname,24,true);if(/[<>"\u0000-\u001f]/.test(nickname)||['traveler','white','hero','octo','muscular','round','creature','pope'].indexOf(d.body)<0||!Array.isArray(d.crop)||d.crop.length!==3||d.crop.some(function(x){return typeof x!=='number'||!isFinite(x)})||d.crop[0]<1||d.crop[0]>5||d.crop[1]<0||d.crop[1]>1||d.crop[2]<0||d.crop[2]>1)throw momentError_('INVALID','Soprannome o ritaglio non validi.');
  var skins=momentKartRows_('KartSkin'),index=skins.findIndex(function(r){return r[0]===d.id}),previous=index<0?null:skins[index],fileId=previous?previous[4]:'',file=null;
  if(d.photo!=null){if(typeof d.photo!=='string'||d.photo.length>466668||! /^[A-Za-z0-9+/]+={0,2}$/.test(d.photo))throw momentError_('PHOTO','Foto non leggibile.');var bytes=Utilities.base64Decode(d.photo);if(bytes.length>350000||bytes.length<4||(bytes[0]&255)!==255||(bytes[1]&255)!==216||(bytes[2]&255)!==255)throw momentError_('PHOTO','Usa una foto JPEG sotto 350 KB.');file=DriveApp.getFolderById(momentProps_().getProperty('mom_folder')).createFile(Utilities.newBlob(bytes,'image/jpeg','Kart-skin-'+d.id+'.jpg'));fileId=file.getId();}
  var values=[d.id,JSON.stringify(nickname),d.body,JSON.stringify(d.crop),fileId,new Date().toISOString()],s=momentKartSheet_('KartSkin');try{if(index<0)s.appendRow(values);else s.getRange(index+2,1,1,6).setValues([values]);SpreadsheetApp.flush()}catch(e){if(file)try{file.setTrashed(true)}catch{}throw e}if(file&&previous&&previous[4])try{momentFile_(previous[4]).setTrashed(true)}catch{}return {saved:true};
 }
 throw momentError_('INVALID','Operazione di gioco non disponibile.');
}
