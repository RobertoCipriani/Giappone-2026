/* Private nightly allocations. The payload is fetched after server authentication. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normal=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const text=(v,max)=>{if(typeof v!=='string'||v.length>max)throw Error('Un’informazione sugli alloggi non è valida.');return v.trim()};
const list=(v,max,length)=>{if(v==null)return [];if(!Array.isArray(v)||v.length>max)throw Error('Elenco partecipanti non valido.');return [...new Set(v.map(s=>text(s,length)).filter(Boolean))]};
let hooks,privateData=null,privateAccount='',fetchAccount='',privatePerson='',canEdit=false,loading=false,error='',generation=0,lastFetch=0,pending=null;
const clone=o=>JSON.parse(JSON.stringify(o));
function changed(){window.dispatchEvent(new CustomEvent('japan-stays-changed'))}
function authorized(){return !!privateData&&privateAccount===window.JAPAN_MOMENTS?.profile?.()?.id}
function modelFor(model){
 if(!authorized())return {...model,participants:[]};
 const reservations=[...model.reservations];for(const b of privateData.reservations){const i=reservations.findIndex(x=>x.id===b.id);if(i<0)reservations.push(b);else reservations[i]=b;}
 return {...model,participants:privateData.participants,reservations,days:model.days.map(d=>{const night=privateData.nights.find(n=>n.date===d.date);return {...d,...(night?{stays:night.stays}:{})}})};
}
function currentProfile(){const p=window.JAPAN_MOMENTS?.profile?.();return p?{...p,travelPersonId:p.travelPersonId||privatePerson}:null}
function cleanConfig(raw){
 if(!raw||raw.version!==1||!Number.isSafeInteger(raw.revision)||raw.revision<1||!Array.isArray(raw.reservations)||raw.reservations.length>100||!Array.isArray(raw.nights)||raw.nights.length>100)throw Error('Gli alloggi ricevuti non sono validi.');
 const participants=validatePeople(raw.participants),reservations=raw.reservations.map(b=>{
  if(!b||typeof b!=='object')throw Error('Struttura non valida.');const result={id:text(b.id,100),title:text(b.title,200),type:'Hotel/Casa'};
  for(const key of ['phone','checkIn','checkOut','date','endDate','address','notes','payment','owner','deadline','status'])result[key]=text(b[key]||'',key==='notes'?5000:key==='address'?1000:250);
  for(const key of ['mapUrl','sourceUrl']){result[key]=text(b[key]||'',6000);if(result[key]){const u=new URL(result[key]);if(u.protocol!=='https:'||u.username||u.password)throw Error('Collegamento alloggio non valido.')}}
  result.links=list(b.links||[],20,6000).filter(u=>/^https:\/\//.test(u));result.notesFormat=Array.isArray(b.notesFormat)?b.notesFormat:[];for(const k of ['price','total','people'])result[k]=typeof b[k]==='number'&&Number.isFinite(b[k])?b[k]:null;return result;
 });
 if(new Set(reservations.map(b=>b.id)).size!==reservations.length)throw Error('Strutture duplicate.');
 const dates=new Set(),nights=raw.nights.map(n=>{if(!n||!/^\d{4}-\d{2}-\d{2}$/.test(n.date)||dates.has(n.date))throw Error('Notte non valida.');dates.add(n.date);return {date:n.date,stays:validateStays(n.stays,participants,reservations)||[]}});
 return {version:1,revision:raw.revision,participants,reservations,nights};
}
function reset(){generation++;privateData=null;privateAccount='';fetchAccount='';privatePerson='';canEdit=false;loading=false;pending=null;lastFetch=0;error='';document.querySelector('#private-stay-editor')?.close();document.querySelector('#private-stay-editor')?.remove();document.querySelector('#stay-identity-dialog')?.remove();}
async function refresh(force=false){
 const p=window.JAPAN_MOMENTS?.profile?.();if(!p){if(privateData||loading){reset();changed()}return;}
 if(pending)return pending;if(!force&&Date.now()-lastFetch<60000)return;
 const epoch=++generation,account=p.id;fetchAccount=account;loading=true;error='';changed();
 const task=(async()=>{try{
  const result=await window.JAPAN_MOMENTS.callPrivate('stays');if(epoch!==generation||window.JAPAN_MOMENTS.profile?.()?.id!==account)return;
  if(result.memberId!==account)throw Error('Riapri il tuo accesso a Momenti.');
  privateData=cleanConfig(result.config);privateAccount=account;privatePerson=result.personId||'';canEdit=result.canEdit===true;lastFetch=Date.now();
 }catch(e){if(epoch!==generation)return;privateData=null;privateAccount='';canEdit=false;privatePerson='';error=e.code==='INVALID'?'Il collegamento agli alloggi è da aggiornare.':e.code==='ACCESS'?'Accedi di nuovo a Momenti.':navigator.onLine?e.message:'Collegati a internet per aprire gli alloggi privati.';lastFetch=Date.now();
 }finally{if(epoch===generation){loading=false;pending=null;changed()}}})();pending=task;return task;
}
function lockedHTML(){
 const p=window.JAPAN_MOMENTS?.profile?.();return '<div class="stay-access"><span aria-hidden="true">'+(loading?'◌':'🔒')+'</span><div><strong>Gli alloggi del gruppo</strong><p>'+(loading?'Stiamo aprendo i vostri alloggi…':esc(p?(error||'Apriamo i tuoi alloggi dopo la verifica dell’accesso.'):'Accedi a Momenti per vedere strutture e compagni di stanza.'))+(error==='Il collegamento agli alloggi è da aggiornare.'?' <a href="aggiorna-alloggi.html">Guida per gli organizzatori</a>':'')+'</p></div>'+(p&&!loading?'<button type="button" class="text-button" data-stay-action="refresh">Riprova</button>':!p?'<button type="button" class="text-button" data-view="moments">Accedi</button>':'')+'</div>';
}
function validatePeople(raw){
 if(raw==null)return [];if(!Array.isArray(raw)||raw.length>50)throw Error('Puoi inserire al massimo 50 compagni di viaggio.');
 const ids=new Set(),accounts=new Set();
 return raw.map(p=>{if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Partecipante non valido.');const id=text(p.id,100),name=text(p.name,80);if(!id||!name||ids.has(id))throw Error('Ogni partecipante deve avere un nome e un identificativo unico.');ids.add(id);const memberIds=list(p.memberIds,100,100);for(const member of memberIds){if(accounts.has(member))throw Error('Un account Momenti è collegato a due persone.');accounts.add(member)}return {id,name,aliases:list(p.aliases,30,80),memberIds}});
}
function validateStays(raw,people,reservations){
 if(raw==null)return null;if(!Array.isArray(raw)||raw.length>20)throw Error('Elenco alloggi della giornata non valido.');
 const guests=new Set(),bookings=new Set(),known=new Set(people.map(p=>p.id));
 return raw.map(s=>{if(!s||typeof s!=='object'||Array.isArray(s))throw Error('Alloggio della giornata non valido.');const bookingId=text(s.bookingId,100),booking=reservations.find(b=>b.id===bookingId);if(!booking||!/hotel|casa|alloggio/i.test(booking.type)||bookings.has(bookingId))throw Error('Scegli una struttura valida senza ripeterla nella stessa notte.');bookings.add(bookingId);const guestIds=list(s.guestIds,50,100);for(const guest of guestIds){if(!known.has(guest))throw Error('Un ospite non è presente nell’elenco del viaggio.');if(guests.has(guest))throw Error('Una persona non può dormire in due strutture nella stessa notte.');guests.add(guest)}return {bookingId,guestIds,note:s.note==null?'':text(s.note,2000)}});
}
function resolve(profile,people){
 if(!profile?.id)return null;
 const selected=people.find(p=>p.id===profile.travelPersonId);if(selected)return selected;
 const bound=people.find(p=>p.memberIds.includes(profile.id));if(bound)return bound;
 const name=normal(profile.name);if(!name)return null;
 const exact=people.filter(p=>[p.name,...p.aliases].some(a=>normal(a)===name));
 if(exact.length===1)return exact[0];if(exact.length>1)return null;
 // A shortened first name is useful only when it identifies exactly one person.
 if(name.length<3)return null;
 const shortened=people.filter(p=>[p.name,...p.aliases].some(a=>normal(a).startsWith(name)));
 return shortened.length===1?shortened[0]:null;
}
function rows(day,model,profile=window.JAPAN_MOMENTS?.profile?.()){
 const people=model.participants||[],person=resolve(profile,people),allocations=Array.isArray(day.stays)&&day.stays.length?day.stays:day.hotel?[{bookingId:day.hotel,guestIds:people.map(p=>p.id),note:''}]:[];
 const result=allocations.map(s=>({booking:model.reservations.find(b=>b.id===s.bookingId),guestIds:s.guestIds||[],note:s.note||'',mine:!!person&&(s.guestIds||[]).includes(person.id)})).filter(s=>s.booking);
 const found=result.some(s=>s.mine);
 return result.map(s=>({...s,other:found&&result.length>1&&!s.mine,person,guests:people.filter(p=>s.guestIds.includes(p.id)),together:people.length>0&&people.every(p=>s.guestIds.includes(p.id))})).sort((a,b)=>Number(b.mine)-Number(a.mine));
}
function identityHTML(model,{always=false}={}){
 const people=model.participants||[],profile=currentProfile();if(!people.length||!profile||!authorized())return '';
 const person=resolve(profile,people);if(person&&!always)return '';
 return '<div class="stay-identity '+(!person?'stay-identity-pending':'')+'"><span>'+esc(person?'Alloggi di '+person.name:'Qual è il tuo nome nel gruppo?')+'</span><button type="button" data-stay-action="identify">'+(person?'Cambia':'Scegli il tuo nome')+'</button></div>';
}
function guestsHTML(row){return row.guests.length?'<div class="stay-guests"><h3>Chi dorme qui</h3><ul>'+row.guests.map(p=>'<li'+(p.id===row.person?.id?' class="stay-guest-you"':'')+'>'+esc(p.name)+(p.id===row.person?.id?' <span>Tu</span>':'')+'</li>').join('')+'</ul></div>':''}
function nightlyHTML(day,model,{compact=false}={}){
 if(!authorized())return day.hotel?lockedHTML():'';
 model=modelFor(model);day=model.days.find(d=>d.date===day.date)||day;
 const entries=rows(day,model,currentProfile());if(!entries.length)return '';
 return '<section class="night-stays '+(compact?'night-stays-compact':'')+'" aria-label="Alloggi della notte">'+identityHTML(model)+entries.map(row=>{
  const b=row.booking,label=row.mine?(row.together?'Il tuo alloggio · tutti insieme':'Il tuo alloggio'):row.other?'Altri compagni':row.together?'Tutti insieme':'Questa notte',guests=row.together?'Tutto il gruppo':row.guests.map(p=>p.name).join(' · '),classes=(compact?'today-pocket-hotel':'stay-card')+' assigned-stay '+(row.mine?'is-your-stay':row.other?'is-other-stay':'');
  return '<details class="'+classes+'" data-stay-booking="'+esc(b.id)+'" data-reading-key="hotel:'+esc(day.id)+':'+esc(b.id)+'"><summary><span class="'+(compact?'today-pocket-symbol':'stay-icon')+'">'+hooks.svg('moon')+'</span><span class="'+(compact?'today-stay-heading':'stay-heading')+'"><small>'+esc(label)+'</small><strong>'+esc(b.title)+'</strong>'+(guests?'<span class="stay-guests-preview">'+esc(guests)+'</span>':'')+'</span><span class="'+(compact?'today-pocket-chevron':'stay-details-label')+'">'+(compact?'':'Dettagli ')+'<span aria-hidden="true">⌄</span></span></summary><div class="'+(compact?'today-pocket-details':'stay-details-body')+'">'+guestsHTML(row)+(row.note?'<p class="stay-room-note">'+esc(row.note)+'</p>':'')+hotelInfo(b)+'</div></details>';
 }).join('')+(canEdit?'<button type="button" class="text-button stay-private-manage" data-stay-action="edit-night" data-date="'+esc(day.date)+'">Modifica alloggi della notte</button>':'')+'</section>';
}
function identify(){
 const model=modelFor(hooks.get()),profile=currentProfile();if(!profile||!authorized())return hooks.toast('Accedi a Momenti per vedere il tuo alloggio evidenziato.');
 let el=document.querySelector('#stay-identity-dialog');if(!el){el=document.createElement('dialog');el.id='stay-identity-dialog';el.className='stay-identity-dialog';document.body.append(el);el.addEventListener('click',e=>{if(e.target===el)el.close()})}
 const person=resolve(profile,model.participants||[]);
 el.innerHTML='<div class="dialog-heading"><h2>Il tuo posto nel viaggio</h2><button type="button" class="icon-button" data-stay-action="close-identity" aria-label="Chiudi">×</button></div><p>Il tuo account Momenti si chiama <strong>'+esc(profile.name)+'</strong>. Seleziona il tuo nome: evidenzieremo gli alloggi in cui dormi.</p><form id="stay-identity-form"><label for="stay-person-select">Chi sei nel gruppo?</label><select id="stay-person-select" name="person" required><option value="">Scegli il tuo nome</option>'+(model.participants||[]).map(p=>'<option value="'+esc(p.id)+'"'+(p.id===person?.id?' selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select><button type="submit" class="primary">Mostra i miei alloggi</button><p id="stay-identity-error" role="alert"></p></form>';
 el.showModal();el.querySelector('select').focus();
}
function stayEditor(day,model){
 const allocations=rows(day,model,null);return '<section class="night-editor"><h3>Alloggi di questa notte</h3><p>Scegli le strutture e spunta chi dorme in ciascuna. Una persona può essere assegnata a una sola struttura.</p><div id="night-editor-list">'+allocations.map(s=>editorRow({bookingId:s.booking.id,guestIds:s.guestIds,note:s.note},model)).join('')+'</div><button type="button" class="secondary" data-stay-action="add-night-row">＋ Aggiungi un altro alloggio</button></section>';
}
function editorRow(row,model){
 return '<fieldset class="night-editor-row"><legend>Struttura e ospiti</legend><div class="night-editor-row-heading"><select data-stay-reservation aria-label="Alloggio" required><option value="">Scegli una struttura</option>'+model.reservations.filter(b=>/hotel|casa|alloggio/i.test(b.type)).map(b=>'<option value="'+esc(b.id)+'"'+(b.id===row.bookingId?' selected':'')+'>'+esc(b.title)+'</option>').join('')+'</select><button type="button" class="text-button" data-stay-action="remove-night-row">Rimuovi</button></div><div class="night-editor-guests">'+(model.participants||[]).map(p=>'<label><input type="checkbox" data-stay-guest="'+esc(p.id)+'"'+((row.guestIds||[]).includes(p.id)?' checked':'')+'><span>'+esc(p.name)+'</span></label>').join('')+'</div><label class="night-editor-note">Camere / note per questi ospiti (facoltativo)<textarea data-stay-note rows="2" maxlength="2000">'+esc(row.note||'')+'</textarea></label></fieldset>';
}
function readEditor(root){return [...root.querySelectorAll('.night-editor-row')].map(row=>({bookingId:row.querySelector('[data-stay-reservation]').value,guestIds:[...row.querySelectorAll('[data-stay-guest]:checked')].map(i=>i.dataset.stayGuest),note:row.querySelector('[data-stay-note]').value.trim()}))}
function peopleEditor(model){return '<p>Le abbreviazioni aiutano a riconoscere anche le nuove iscrizioni. I collegamenti agli account esistenti vengono conservati.</p>'+model.participants.map(p=>'<fieldset class="person-editor" data-person-editor="'+esc(p.id)+'"><legend>'+esc(p.name)+'</legend><label>Nome nel gruppo<input data-person-name maxlength="80" required value="'+esc(p.name)+'"></label><label>Soprannomi / abbreviazioni, uno per riga<textarea data-person-aliases rows="2" maxlength="2000">'+esc(p.aliases.join('\n'))+'</textarea></label></fieldset>').join('')}
function readPeopleEditor(root,people){return people.map(p=>{const row=[...root.querySelectorAll('[data-person-editor]')].find(r=>r.dataset.personEditor===p.id);return {...p,name:row.querySelector('[data-person-name]').value.trim(),aliases:row.querySelector('[data-person-aliases]').value.split('\n').map(s=>s.trim()).filter(Boolean)}})}
function hotelInfo(b){
 const pair=(label,value)=>value?'<div><dt>'+label+'</dt><dd>'+esc(value)+'</dd></div>':'',tel=(b.phone||'').replace(/[^\d+]/g,''),map=b.mapUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(b.title+' '+(b.address||'Japan')),date=v=>{try{return new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long'}).format(new Date(v+'T12:00:00Z'))}catch{return v}};
 return '<dl class="hotel-facts">'+pair('Nome dell’alloggio',b.title)+pair('Indirizzo',b.address)+(b.date&&b.endDate?pair('Soggiorno',date(b.date)+' → '+date(b.endDate)):'')+(tel&&/^\+?\d{5,20}$/.test(tel)?'<div><dt>Telefono</dt><dd><a href="tel:'+tel+'">'+esc(b.phone)+'</a></dd></div>':pair('Telefono','Da inserire'))+pair('Check-in',b.checkIn||'Da inserire')+pair('Check-out',b.checkOut||'Da inserire')+'</dl>'+(b.notes?.trim()?'<div class="hotel-notes"><h3>Note</h3>'+hooks.detailsText(b.notes,b.notesFormat)+'</div>':'')+'<div class="hotel-actions"><a class="map-link" href="'+esc(map)+'" target="_blank" rel="noopener noreferrer">Posizione</a>'+(canEdit?'<button type="button" class="text-button" data-stay-action="edit-booking" data-id="'+esc(b.id)+'">Modifica alloggio</button>':'')+'</div>'+(b.sourceUrl?'<p class="hotel-source"><a href="'+esc(b.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Informazioni della struttura ↗</a></p>':'');
}
function overviewHTML(publicModel){
 const heading='<div class="page-heading"><h1>Alloggi</h1><p>Il vostro posto, ogni notte. Visibile dopo l’accesso.</p></div>';
 if(!authorized())return heading+lockedHTML();const model=modelFor(publicModel);
 return heading+identityHTML(model,{always:true})+(canEdit?'<div class="alloggi-manage"><button type="button" class="secondary" data-stay-action="edit-people">Compagni e soprannomi</button><button type="button" class="secondary" data-stay-action="add-booking">+ Aggiungi struttura</button></div>':'')+'<div class="night-stays-list">'+model.days.filter(d=>rows(d,model,currentProfile()).length).map(d=>'<section><h2>'+esc(new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long'}).format(new Date(d.date+'T12:00:00Z')))+'</h2>'+nightlyHTML(d,publicModel)+'</section>').join('')+'</div>';
}
let editState=null;
function openEditor(type,value){
 if(!authorized()||!canEdit)return hooks.toast('Solo gli organizzatori possono modificare gli alloggi.');
 const model=modelFor(hooks.get()),config=clone(privateData);let body='',title='';editState={type,value,config,revision:config.revision};
 if(type==='night'){const day=model.days.find(d=>d.date===value);if(!day)return;title='Alloggi della notte';body='<p>'+esc(new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'long'}).format(new Date(value+'T12:00:00Z')))+'</p>'+stayEditor(day,model);}
 if(type==='people'){title='Compagni e soprannomi';body=peopleEditor(model);}
 if(type==='booking'){
  title=value?'Modifica alloggio':'Aggiungi struttura';const b=config.reservations.find(b=>b.id===value)||{};
  const field=(name,label,type='text',required=false)=>'<label class="private-stay-field">'+label+(type==='textarea'?'<textarea name="'+name+'" rows="3" maxlength="5000">'+esc(b[name]||'')+'</textarea>':'<input name="'+name+'" type="'+type+'" maxlength="'+(['mapUrl','sourceUrl'].includes(name)?6000:1000)+'" '+(required?'required':'')+' value="'+esc(b[name]||'')+'">')+'</label>';
  body=field('title','Nome della struttura','text',true)+'<div class="field-grid">'+field('date','Check-in','date')+field('endDate','Check-out','date')+field('checkIn','Orario di check-in')+field('checkOut','Orario di check-out')+'</div>'+field('phone','Telefono','tel')+field('address','Indirizzo')+field('mapUrl','Posizione su Google Maps','url')+field('sourceUrl','Sito / fonte','url')+field('notes','Note','textarea');
 }
 let el=document.querySelector('#private-stay-editor');if(!el){el=document.createElement('dialog');el.id='private-stay-editor';el.className='private-stay-editor';document.body.append(el);el.addEventListener('cancel',e=>{if(el.dataset.busy==='true')e.preventDefault()});el.addEventListener('close',()=>{el.innerHTML='';editState=null})}
 el.innerHTML='<div class="dialog-heading"><h2>'+title+'</h2><button type="button" class="icon-button" data-stay-action="close-editor" aria-label="Chiudi">×</button></div><p class="private-stay-notice">Salvato nel Drive privato. Lo vedono solo gli amici che effettuano l’accesso.</p><form id="private-stay-form">'+body+'<p class="form-error" id="private-stay-error" role="alert"></p><button type="submit" class="primary">Salva per il gruppo</button></form>';el.dataset.busy='false';el.showModal();
}
async function saveEditor(form){
 const el=document.querySelector('#private-stay-editor');if(!authorized()||!canEdit||!editState||el.dataset.busy==='true')return;
 const state=editState,config=clone(state.config),button=form.querySelector('[type=submit]'),account=privateAccount,epoch=generation;
 try{
  if(state.type==='night'){const model=modelFor(hooks.get()),allocations=validateStays(readEditor(form),config.participants,model.reservations),index=config.nights.findIndex(n=>n.date===state.value),night={date:state.value,stays:allocations};if(index<0)config.nights.push(night);else config.nights[index]=night;}
  if(state.type==='people')config.participants=validatePeople(readPeopleEditor(form,config.participants));
  if(state.type==='booking'){const values=Object.fromEntries(new FormData(form)),index=config.reservations.findIndex(b=>b.id===state.value),existing=index>=0?config.reservations[index]:{id:'private-'+crypto.randomUUID(),type:'Hotel/Casa',status:'booked',links:[],notesFormat:[]};const booking={...existing,...values};if(index>=0)config.reservations[index]=booking;else config.reservations.push(booking);}
  cleanConfig(config);el.dataset.busy='true';button.disabled=true;button.textContent='Salvataggio…';
  const result=await window.JAPAN_MOMENTS.callPrivate('saveStays',{expectedRevision:state.revision,config});
  if(epoch!==generation||window.JAPAN_MOMENTS.profile?.()?.id!==account)return;
  if(result.memberId!==account)throw Error('Accesso cambiato. Riapri Momenti.');privateData=cleanConfig(result.config);privatePerson=result.personId||'';canEdit=result.canEdit===true;lastFetch=Date.now();el.close();changed();hooks.toast('Alloggi aggiornati per gli amici che effettuano l’accesso.');
 }catch(e){if(el.open){form.querySelector('#private-stay-error').textContent=e.message;el.dataset.busy='false';button.disabled=false;button.textContent='Salva per il gruppo';}}
}
document.addEventListener('click',e=>{const el=e.target.closest('[data-stay-action]');if(!el||!hooks)return;switch(el.dataset.stayAction){case'identify':identify();break;case'refresh':void refresh(true);break;case'close-identity':document.querySelector('#stay-identity-dialog')?.close();break;case'edit-night':openEditor('night',el.dataset.date);break;case'edit-people':openEditor('people');break;case'edit-booking':openEditor('booking',el.dataset.id);break;case'add-booking':openEditor('booking');break;case'close-editor':{const dialog=document.querySelector('#private-stay-editor');if(dialog?.dataset.busy!=='true')dialog?.close();break;}case'add-night-row':if(canEdit&&authorized())document.querySelector('#night-editor-list')?.insertAdjacentHTML('beforeend',editorRow({},modelFor(hooks.get())));break;case'remove-night-row':if(canEdit&&authorized())el.closest('.night-editor-row')?.remove();break;}});
document.addEventListener('change',e=>{if(!e.target.matches('[data-stay-guest]')||!e.target.checked)return;const id=e.target.dataset.stayGuest;document.querySelectorAll('#night-editor-list [data-stay-guest]').forEach(input=>{if(input!==e.target&&input.dataset.stayGuest===id)input.checked=false})});
document.addEventListener('submit',e=>{if(e.target.id==='private-stay-form'){e.preventDefault();void saveEditor(e.target);return;}if(e.target.id!=='stay-identity-form')return;e.preventDefault();try{const person=e.target.querySelector('select').value;if(!authorized()||!modelFor(hooks.get()).participants.some(p=>p.id===person))throw Error('Scegli il tuo nome.');window.JAPAN_MOMENTS.setTravelPerson(person);document.querySelector('#stay-identity-dialog').close();hooks.toast('Ora vedrai evidenziati i tuoi alloggi.')}catch(error){document.querySelector('#stay-identity-error').textContent=error.message}});
window.addEventListener('japan-moments-identity',()=>{const p=window.JAPAN_MOMENTS?.profile?.();if(!p||privateAccount&&privateAccount!==p.id||fetchAccount&&fetchAccount!==p.id){reset();changed();}if(p)void refresh();});
window.addEventListener('online',()=>{if(hooks)void refresh(true)});
document.addEventListener('visibilitychange',()=>{if(hooks&&!document.hidden&&!document.querySelector('dialog[open]'))void refresh()});
window.JAPAN_STAYS={validatePeople,validateStays,resolve,rows,identityHTML,nightlyHTML,stayEditor,readEditor,peopleEditor,readPeopleEditor,cleanConfig,overviewHTML,refresh,currentIdentityHTML:()=>hooks&&authorized()?identityHTML(modelFor(hooks.get())):'',install:h=>{hooks=h;setTimeout(()=>void refresh(),0);setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]'))void refresh()},60000)}};
})();
