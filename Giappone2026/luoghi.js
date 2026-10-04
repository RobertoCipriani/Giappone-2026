/* Optional place details and offline import of opening hours copied by organizers. */
(()=>{'use strict';
const TEXT={name:250,category:200,price:250,duration:200,reservation:500,address:600,phone:100,access:1000,dietary:1000,whatToBring:1000,hoursNote:700};
const URLS=['mapsUrl','website','bookingUrl','sourceUrl'],TIMES=['opening','closing','secondOpening','secondClosing','lastEntry'];
const weekdays=[['domenica','sunday','日曜日'],['lunedi','monday','月曜日'],['martedi','tuesday','火曜日'],['mercoledi','wednesday','水曜日'],['giovedi','thursday','木曜日'],['venerdi','friday','金曜日'],['sabato','saturday','土曜日']];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value}
function validate(raw){
 if(raw==null)return null;if(typeof raw!=='object'||Array.isArray(raw))throw Error('Dettagli del luogo non validi.');
 const clean={type:raw.type||'activity'};if(!['activity','restaurant'].includes(clean.type))throw Error('Scegli attività o ristorante per i dettagli.');
 for(const [k,max] of Object.entries(TEXT)){if(raw[k]!=null&&(typeof raw[k]!=='string'||raw[k].length>max))throw Error('Un dettaglio del luogo è troppo lungo o non valido.');clean[k]=(raw[k]||'').trim()}
 for(const k of URLS){const value=raw[k]||'';if(typeof value!=='string'||value.length>6000)throw Error('Collegamento del luogo non valido.');if(value){let u;try{u=new URL(value)}catch{throw Error('Inserisci collegamenti completi https://.')}if(u.protocol!=='https:'||u.username||u.password)throw Error('Usa un collegamento https:// senza credenziali.')}if(k==='mapsUrl'&&value&&!hasGoogleMap(value))throw Error('La posizione deve essere un collegamento Google Maps.');clean[k]=value}
 for(const k of TIMES){const value=raw[k]||'';if(typeof value!=='string'||value&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw Error('Inserisci orari in formato 09:00.');clean[k]=value}
 for(const k of ['closed','open24']){if(raw[k]!=null&&typeof raw[k]!=='boolean')throw Error('Stato di apertura non valido.');clean[k]=raw[k]===true}
 if(clean.closed&&clean.open24)throw Error('Un luogo chiuso non può essere aperto 24 ore.');
 for(const k of ['hoursDate','checkedAt']){const value=raw[k]||'';if(typeof value!=='string'||value&&!validDate(value))throw Error('Data di verifica degli orari non valida.');clean[k]=value}
 if(clean.secondOpening&&!clean.secondClosing||clean.secondClosing&&!clean.secondOpening)throw Error('Completa entrambe le ore del secondo turno.');
 return clean
}
function fromForm(v,old=null){
 const raw={type:v.placeType||old?.type||'activity'};
 for(const k of [...Object.keys(TEXT),...URLS,...TIMES,'hoursDate','checkedAt'])raw[k]=v['place_'+k]??old?.[k]??'';
 raw.closed=v.place_closed==='1';raw.open24=v.place_open24==='1';return validate(raw)
}
function inferType(e){return e.place?.type||(/pasto|ristorante/i.test(e.kind)||/\b(pranzo|cena|colazione|ramen|sushi|ristorante)\b/i.test(e.title)?'restaurant':'activity')}
function weekday(date){return validDate(date)?new Date(date+'T12:00:00Z').getUTCDay():null}
function dateLabel(date){return validDate(date)?new Intl.DateTimeFormat('it-IT',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(new Date(date+'T12:00:00Z')):''}
function hours(p,dayDate){
 if(!p)return '';if(p.closed)return 'Chiuso';if(p.open24)return 'Aperto 24 ore';
 const slot=(a,b)=>a&&b?a+'–'+b+(b<=a?' (+1 giorno)':''):a?'Dalle '+a:b?'Fino alle '+b:'';
 return [slot(p.opening,p.closing),slot(p.secondOpening,p.secondClosing)].filter(Boolean).join(' · ')
}
function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
function parseHours(input,date){
 if(typeof input!=='string'||input.length>12000||!validDate(date))throw Error('Incolla gli orari e scegli una giornata valida.');
 const normalized=normalize(input).replace(/\u202f|\u00a0/g,' '),labels=weekdays.flatMap((names,day)=>names.map(name=>({name,day}))),matches=[];
 for(const label of labels){let at=-1;while((at=normalized.indexOf(label.name,at+1))>=0)matches.push({at,end:at+label.name.length,day:label.day})}
 matches.sort((a,b)=>a.at-b.at);let text=normalized;
 if(matches.length){const target=matches.find(m=>m.day===weekday(date));if(!target)throw Error('Non trovo gli orari di '+dateLabel(date)+'. Incolla anche quel giorno.');const next=matches.find(m=>m.at>=target.end);text=normalized.slice(target.end,next?.at||normalized.length)}
 if(/\b(chiuso|closed)\b|休業|定休日/.test(text))return {closed:true,open24:false,opening:'',closing:'',secondOpening:'',secondClosing:'',hoursDate:date};
 if(/(?:24\s*(?:ore|hours|h)|open\s*24|aperto\s*24)|24時間/.test(text))return {closed:false,open24:true,opening:'',closing:'',secondOpening:'',secondClosing:'',hoursDate:date};
 if(/\b(?:am|pm)\b/.test(text))throw Error('Usa gli orari nel formato 24 ore, per esempio 11:00–15:00.');
 const slots=[...text.matchAll(/(\d{1,2})[:.](\d{2})\s*(?:[-–—−〜～]|alle|to)\s*(\d{1,2})[:.](\d{2})/g)];
 if(!slots.length||slots.length>2)throw Error('Incolla uno o due intervalli, per esempio 11:00–15:00 e 18:00–22:00.');
 const result={closed:false,open24:false,opening:'',closing:'',secondOpening:'',secondClosing:'',hoursDate:date};
 slots.forEach((m,i)=>{const a=m[1].padStart(2,'0')+':'+m[2],b=m[3].padStart(2,'0')+':'+m[4];if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(a)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(b))throw Error('Gli orari copiati non sono validi.');result[i?'secondOpening':'opening']=a;result[i?'secondClosing':'closing']=b});
 return result
}
function hasGoogleMap(url){try{const u=new URL(url);return u.protocol==='https:'&&(u.hostname==='maps.app.goo.gl'||u.hostname==='goo.gl'||/^(?:(?:www|maps)\.)?google\.(?:com|it|co\.jp)$/.test(u.hostname)&&(u.hostname.startsWith('maps.')||u.pathname.includes('maps')))}catch{return false}}
function position(e,day){
 const p=e.place,existing=p?.mapsUrl||(e.links||[]).find(hasGoogleMap);
 return existing||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent((p?.name||String(e.title||'').split('\n')[0].replace(/^(?:pranzo|cena|colazione)\s+(?:a|da|al|alla)\s+/i,''))+' '+(day?.to||day?.from||'')+' Japan')
}
function html(e,day){
 const p=validate(e.place),restaurant=inferType(e)==='restaurant',pair=(label,value)=>value?'<div><dt>'+label+'</dt><dd>'+escape(value)+'</dd></div>':'',time=hours(p,day?.date);
 const facts=p?pair(restaurant?'Cucina':'Tipo di esperienza',p.category)+pair(restaurant?'Fascia di prezzo':'Costo / biglietto',p.price)+pair('Tempo da dedicare',p.duration)+pair('Prenotazione',p.reservation)+pair('Indirizzo',p.address)+pair('Telefono',p.phone)+pair('Come arrivare',p.access)+pair('Ultimo ingresso',p.lastEntry):'';
 const schedule=time?'<section class="place-hours"><span class="place-detail-label">Orari · '+escape(dateLabel(day?.date))+'</span><strong>'+escape(time)+'</strong>'+(p.hoursDate&&p.hoursDate!==day?.date?'<small class="place-hours-warning">Orari riferiti al '+escape(dateLabel(p.hoursDate))+': da riconfermare per questa giornata.</small>':'')+(p.hoursNote?'<p>'+escape(p.hoursNote)+'</p>':'')+'</section>':p?.hoursNote?'<section class="place-hours"><span class="place-detail-label">Orari</span><p>'+escape(p.hoursNote)+'</p></section>':'';
 const extra=p?(p.dietary&&restaurant?'<section class="place-practical"><h4>Esigenze alimentari</h4><p>'+escape(p.dietary)+'</p></section>':'')+(p.whatToBring&&!restaurant?'<section class="place-practical"><h4>Da portare / da sapere</h4><p>'+escape(p.whatToBring)+'</p></section>':''):'';
 const anchor=(url,label)=>url?'<a class="event-link" href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+label+' ↗</a>':'';
 return '<div class="place-detail-heading"><span aria-hidden="true">'+(restaurant?'🍽️':'🧭')+'</span><span>'+escape(p?.name||e.title.split('\n')[0])+'</span></div>'+schedule+(facts?'<dl class="place-facts">'+facts+'</dl>':'')+extra+'<div class="place-actions">'+anchor(position(e,day),'Posizione')+anchor(p?.bookingUrl,restaurant?'Prenota':'Biglietti')+anchor(p?.website,'Sito ufficiale')+'</div>'+(p?.checkedAt?'<p class="place-source">Orari verificati il '+escape(dateLabel(p.checkedAt))+'. '+anchor(p.sourceUrl,'Fonte')+'</p>':'')
}
window.JAPAN_PLACES={validate,fromForm,inferType,weekday,dateLabel,hours,parseHours,position,html,hasGoogleMap};
})();
