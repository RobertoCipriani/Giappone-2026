/* Open-Meteo daily forecasts. Public place coordinates only; no account or location permission. */
(()=>{'use strict';
const STORE='japan2026-weather-v1',HOUR=3600000,DAY=86400000,forecast=new Map(),geocodes=new Map(),pending=new Map(),errors=new Map();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[–—-]/g,' ').replace(/\s+/g,' ').trim();
const spots=[
 ['tokyo','Tokyo',35.6895,139.6917,['tokyo']],
 ['kyoto','Kyoto',35.0116,135.7681,['kyoto']],
 ['osaka','Osaka',34.6937,135.5023,['osaka']],
 ['nara','Nara',34.6851,135.8048,['nara']],
 ['kanazawa','Kanazawa',36.5613,136.6562,['kanazawa']],
 ['shirakawago','Shirakawa-go',36.2578,136.9063,['shirakawa go','shirakawago']],
 ['takayama','Takayama',36.146,137.252,['takayama']],
 ['kamikochi','Kamikōchi',36.247,137.6387,['kamikochi']],
 ['hida','Hida Furukawa',36.238,137.187,['hida furukawa']],
 ['fuji','Kawaguchiko',35.503,138.768,['kawaguchiko','lago kawaguchi','monte fuji']],
 ['fujiyoshida','Fujiyoshida',35.489,138.806,['fujiyoshida']],
 ['kamakura','Kamakura',35.319,139.546,['kamakura']],
 ['rome','Roma',41.9028,12.4964,['roma','rome']]
].map(([key,name,latitude,longitude,aliases])=>({key,name,latitude,longitude,aliases}));
// City centres; Kamikochi is the valley near Kappa Bridge, not the nearest city.
function matching(text){
 text=normalize(text);return spots.map(p=>({p,index:Math.min(...p.aliases.map(a=>{
 const match=new RegExp('(^|[^a-z0-9])'+a.replace(/ /g,'\\s*')+'(?=$|[^a-z0-9])').exec(text);return match?match.index:Infinity
 }))})).filter(x=>Number.isFinite(x.index)).sort((a,b)=>a.index-b.index).map(x=>x.p)
}
function places(day){
 const out=[],add=p=>{if(p&&!out.some(x=>x.key===p.key))out.push({...p})};
 matching(day.title).forEach(add);
 for(const name of [day.from,day.to]){
  const found=matching(name);found.forEach(add);
  if(!found.length&&String(name||'').trim()&&!/volo|partenza|arrivo|aereo/i.test(name)){
   const clean=String(name).trim().slice(0,80);add({key:'geo:'+normalize(clean),name:clean})
  }
 }
 for(const e of day.events||[]){if(e.kind==='trasporto'||e.kind==='piedi'||e.transport)continue;matching([e.title,e.subtitle,e.place?.name,e.place?.address].filter(Boolean).join(' ')).forEach(add)}
 return out.slice(0,6)
}
function today(now=new Date()){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);return ['year','month','day'].map(k=>parts.find(p=>p.type===k).value).join('-')}
function validDate(date){return typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date}
function range(date,now=new Date()){if(!validDate(date))return {kind:'invalid'};const delta=Math.round((Date.parse(date+'T00:00:00Z')-Date.parse(today(now)+'T00:00:00Z'))/DAY);return {kind:delta>15?'future':delta< -16?'past':'available',delta,opens:new Date(Date.parse(date+'T00:00:00Z')-15*DAY).toISOString().slice(0,10)}}
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
function row(raw){
 if(!raw||typeof raw!=='object')return null;
 const min=num(raw.min,-100,65),max=num(raw.max,-100,65);if(min==null||max==null||min>max)return null;
 return {min,max,code:num(raw.code,0,99),rain:num(raw.rain,0,100),wind:num(raw.wind,0,500)}
}
function parse(data,at=Date.now()){
 if(!data||data.error||!data.daily||!Array.isArray(data.daily.time))throw Error('Meteo non disponibile');
 const days={};data.daily.time.slice(0,48).forEach((date,i)=>{if(!validDate(date))return;const r=row({min:data.daily.temperature_2m_min?.[i],max:data.daily.temperature_2m_max?.[i],code:data.daily.weather_code?.[i],rain:data.daily.precipitation_probability_max?.[i],wind:data.daily.wind_speed_10m_max?.[i]});if(r)days[date]=r});
 if(!Object.keys(days).length)throw Error('Previsioni non ancora disponibili');
 const c=data.current,current=c&&validDate(String(c.time).slice(0,10))&&num(c.temperature_2m,-100,65)!=null?{time:String(c.time).slice(0,16),temperature:c.temperature_2m,code:num(c.weather_code,0,99),wind:num(c.wind_speed_10m,0,500),night:c.is_day===0}:null;
 return {at,days,current}
}
function loadCache(){
 try{const raw=localStorage.getItem(STORE);if(!raw||raw.length>200000)return;const data=JSON.parse(raw);if(data.version!==1)return;
 for(const [key,v] of Object.entries(data.forecast||{}).slice(0,24)){if(!v||num(v.at,0,Date.now()+60000)==null||Date.now()-v.at>45*DAY)continue;const days={};for(const [d,r] of Object.entries(v.days||{}).slice(0,48)){const safe=row(r);if(validDate(d)&&safe)days[d]=safe}if(Object.keys(days).length)forecast.set(key,{at:v.at,days,current:null})}
 for(const [key,p] of Object.entries(data.geocodes||{}).slice(0,24)){if(num(p.latitude,20,46)!=null&&num(p.longitude,122,154)!=null)geocodes.set(key,{latitude:p.latitude,longitude:p.longitude})}
 }catch{}
}
function saveCache(){
 try{localStorage.setItem(STORE,JSON.stringify({version:1,forecast:Object.fromEntries([...forecast].sort((a,b)=>b[1].at-a[1].at).slice(0,24)),geocodes:Object.fromEntries([...geocodes].slice(-24))}))}catch{}
}
loadCache();
function condition(code,wind=0,night=false){
 let kind='unknown',label='Condizioni non disponibili';
 if(code===0||code===1){kind=night?'night':'sun';label=night?'Sereno':'Sole'}
 else if(code===2){kind='partly';label='Sole e nuvole'}
 else if(code===3){kind='cloud';label='Nuvoloso'}
 else if(code===45||code===48){kind='fog';label='Nebbia'}
 else if([51,53,55,56,57].includes(code)){kind='rain';label='Pioviggine'}
 else if([61,63,65,66,67,80,81,82].includes(code)){kind='rain';label=code===65||code===82?'Pioggia intensa':'Pioggia'}
 else if([71,73,75,77,85,86].includes(code)){kind='snow';label='Neve'}
 else if([95,96,97,99].includes(code)){kind='storm';label='Temporale'}
 const windy=typeof wind==='number'&&wind>=25;
 if(windy&&['sun','partly','cloud','night'].includes(kind))label+=' e vento';
 return {kind,label,windy}
}
function scene(kind,windy=false){
 const sun='<g class="wx-sun"><circle class="wx-glow" cx="24" cy="24" r="16" fill="#ffc65c" opacity=".15"/><g class="wx-rays" stroke="#eab45c" stroke-width="2" stroke-linecap="round">'+Array.from({length:8},(_,i)=>'<path d="M24 4v4" transform="rotate('+i*45+' 24 24)"/>').join('')+'</g><circle cx="24" cy="24" r="9" fill="#ffc65c"/></g>';
 const cloud='<g class="wx-cloud"><path d="M10 30c-7-1-7-12 0-13 0-11 16-14 21-4 11-2 15 17 4 17Z" fill="currentColor"/><path d="M11 30h23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></g>';
 let drawing='';
 if(kind==='sun')drawing=sun;
 else if(kind==='night')drawing='<path class="wx-moon" d="M33 8A16 16 0 1 0 40 32 16 16 0 0 1 33 8Z" fill="#e7c67e"/><path class="wx-star" d="m37 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z" fill="#f6dea5"/>';
 else if(kind==='partly')drawing='<g transform="translate(7 -6) scale(.8)">'+sun+'</g>'+cloud;
 else drawing=cloud;
 if(kind==='rain'||kind==='storm')drawing+='<g stroke="#6aabc6" stroke-width="2.2" stroke-linecap="round">'+[15,24,33].map((x,i)=>'<path class="wx-drop wx-delay-'+i+'" d="m'+x+' 33-3 6"/>').join('')+'</g>';
 if(kind==='storm')drawing+='<path class="wx-lightning" d="m28 24-7 11h6l-3 9 12-14h-7l4-6Z" fill="#efc66e"/>';
 if(kind==='snow')drawing+='<g fill="#8eb9c6">'+[13,24,35].map((x,i)=>'<circle class="wx-snow wx-delay-'+i+'" cx="'+x+'" cy="36" r="2"/>').join('')+'</g>';
 if(kind==='fog'||kind==='unknown')drawing+='<g class="wx-mist" stroke="currentColor" opacity=".45" stroke-width="2" stroke-linecap="round"><path d="M6 35h29m-21 5h25"/></g>';
 if(windy)drawing+='<g fill="#8aab79"><path class="wx-leaf wx-delay-0" d="M5 30q9-6 9 2-7 6-9-2Z"/><path class="wx-leaf wx-delay-1" d="M23 39q9-6 9 2-7 6-9-2Z"/></g>';
 return '<span class="weather-scene weather-'+kind+'" aria-hidden="true"><svg class="weather-svg" viewBox="0 0 48 48" fill="none">'+drawing+'</svg></span>'
}
const dateLabel=d=>new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));
const deg=v=>Math.round(v)+'°';
function snapshot(place,date,now=Date.now()){
 const cache=forecast.get(place.key),daily=cache?.days?.[date];if(!daily)return null;
 const stale=now-cache.at>=HOUR,current=!stale&&cache.current?.time.slice(0,10)===date&&date===today(new Date(now))?cache.current:null;
 return {daily,current,stale,at:cache.at,condition:condition(current?.code??daily.code,current?.wind??daily.wind,current?.night||false)}
}
function status(date){
 const r=range(date);return r.kind==='future'?'Previsioni dal '+dateLabel(r.opens):r.kind==='past'?'Data fuori dal periodo meteo':r.kind==='invalid'?'Data da verificare':navigator.onLine===false?'Meteo non disponibile offline':'Previsione non disponibile'
}
function markup(day){
 const locations=places(day),primary=locations[0],r=range(day.date);
 if(!primary||r.kind==='invalid')return '<div class="weather-unavailable">Meteo: località o data da verificare.</div>';
 const data=r.kind==='available'?snapshot(primary,day.date):null,c=data?.condition||{kind:'unknown',windy:false,label:status(day.date)};
 const name=primary.name+(locations.length>1?' + '+(locations.length-1)+' '+(locations.length===2?'luogo':'luoghi'):'');
 const loading=r.kind==='available'&&!data&&pending.has(primary.key),label=loading?'Carichiamo il meteo…':c.label;
 const meta=data?[data.daily.rain!=null?'Pioggia '+Math.round(data.daily.rain)+'%':'',data.daily.wind!=null?'Vento max '+Math.round(data.daily.wind)+' km/h':''].filter(Boolean).join(' · '):r.kind==='future'?'Si aggiorna automaticamente':loading?'Un attimo e siamo pronti':r.kind==='past'?'Consulta le giornate più recenti':'Apri i dettagli per riprovare';
 const temps=data?'<span class="weather-range"><strong>'+deg(data.daily.min)+' <span>/</span> '+deg(data.daily.max)+'</strong><small>Min / Max</small></span>':'';
 const rows=locations.map(place=>{
  const v=r.kind==='available'?snapshot(place,day.date):null,cond=v?.condition||{kind:'unknown',windy:false,label:status(day.date)};
  return '<div class="weather-place">'+scene(cond.kind,cond.windy)+'<div><strong>'+esc(place.name)+'</strong><span>'+esc(cond.label)+'</span>'+(v?'<small>'+esc([v.daily.rain!=null?'Pioggia '+Math.round(v.daily.rain)+'%':'',v.daily.wind!=null?'Vento massimo '+Math.round(v.daily.wind)+' km/h':''].filter(Boolean).join(' · '))+'</small>':'')+(v?.current?'<small>Adesso '+deg(v.current.temperature)+'</small>':'')+'</div>'+(v?'<strong class="weather-place-temp">'+deg(v.daily.min)+' / '+deg(v.daily.max)+'</strong>':'')+'</div>'
 }).join('');
 const at=Math.min(...locations.map(p=>snapshot(p,day.date)?.at).filter(Number.isFinite)),hasSaved=locations.some(p=>snapshot(p,day.date)?.stale);
 const stamp=Number.isFinite(at)?(hasSaved?'Previsione salvata · ':'Aggiornato · ')+new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Tokyo'}).format(new Date(at))+' (Giappone)':'';
 const explanation=r.kind==='future'?'La previsione compare quando questa giornata rientra nei prossimi 16 giorni.':r.delta<0?'Riepilogo meteorologico della giornata.':'Le temperature indicano la minima e la massima della giornata. Il meteo può cambiare.';
 return '<details class="weather-card" data-weather-card><summary>'+scene(c.kind,c.windy)+'<span class="weather-copy"><small>'+esc(name)+' · '+dateLabel(day.date)+'</small><strong>'+esc(label)+'</strong><span>'+esc(meta)+'</span></span>'+temps+'<span class="weather-chevron" aria-hidden="true">⌄</span></summary><div class="weather-details">'+rows+'<p class="weather-note">'+esc(explanation)+(stamp?'<br>'+esc(stamp):'')+'</p><div class="weather-footer"><small>Meteo: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> · CC BY 4.0'+(locations.some(p=>p.key.startsWith('geo:'))?' · Località: GeoNames':'')+'</small>'+(r.kind==='available'?'<button type="button" class="text-button" data-weather-refresh>Aggiorna</button>':'')+'</div></div></details>'
}
async function json(url){
 const controller=typeof AbortController==='function'?new AbortController():null;
 let timer;try{
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller?.abort();reject(Error('Meteo troppo lento'))},10000)});
  const response=await Promise.race([fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:controller?.signal}),timeout]);
  if(!response.ok)throw Error('Meteo non disponibile');return await Promise.race([response.json(),timeout])
 }finally{clearTimeout(timer)}
}
async function locate(place){
 if(Number.isFinite(place.latitude))return place;if(geocodes.has(place.key))return {...place,...geocodes.get(place.key)};
 const data=await json('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(place.name)+'&count=5&language=en&format=json&countryCode=JP');
 const match=data.results?.filter(p=>p.country_code==='JP'&&num(p.latitude,20,46)!=null&&num(p.longitude,122,154)!=null).sort((a,b)=>(b.population||0)-(a.population||0))[0];
 if(!match)throw Error('Località non trovata');const point={latitude:match.latitude,longitude:match.longitude};geocodes.set(place.key,point);saveCache();return {...place,...point}
}
function request(place,date,force=false){
 if(pending.has(place.key))return pending.get(place.key);
 const cache=forecast.get(place.key),age=cache?Date.now()-cache.at:Infinity,failedAge=errors.has(place.key)?Date.now()-errors.get(place.key):Infinity;
 const recent=cache&&age<HOUR&&today(new Date(cache.at))===today();
 if((recent&&(!force||age<60000))||failedAge<(force?60000:300000)||navigator.onLine===false)return Promise.resolve();
 const promise=(async()=>{try{
  const p=await locate(place),url='https://api.open-meteo.com/v1/forecast?latitude='+p.latitude+'&longitude='+p.longitude+'&daily=weather_code,temperature_2m_min,temperature_2m_max,precipitation_probability_max,wind_speed_10m_max&current=temperature_2m,weather_code,wind_speed_10m,is_day&timezone=auto&temperature_unit=celsius&wind_speed_unit=kmh&forecast_days=16&past_days=16';
  forecast.set(place.key,parse(await json(url)));errors.delete(place.key);saveCache()
 }catch{errors.set(place.key,Date.now())}finally{pending.delete(place.key)}})();
 pending.set(place.key,promise);return promise
}
let active=null;
function paint(){
 if(!active)return;const root=document.querySelector('[data-day-weather]');if(!root||root.dataset.weatherDate!==active.date)return;
 const old=root.querySelector('[data-weather-card]'),open=!!old?.open,focused=document.activeElement?.matches?.('[data-weather-refresh]')&&root.contains?.(document.activeElement),content=markup(active);
 if(root.weatherHTML===content)return;root.innerHTML=content;root.weatherHTML=content;const next=root.querySelector('[data-weather-card]');if(next)next.open=open;if(focused)root.querySelector('[data-weather-refresh]')?.focus({preventScroll:true})
}
async function mount(day,force=false){
 active=day||null;if(!active)return;
 if(range(day.date).kind!=='available'){paint();return}
 const tasks=places(day).map(p=>request(p,day.date,force));paint();await Promise.allSettled(tasks);
 // A late response may only repaint the currently selected day's widget.
 if(active===day)paint()
}
document.addEventListener('click',event=>{if(!event.target.closest?.('[data-weather-refresh]')||!active)return;mount(active,true)});
window.addEventListener('online',()=>{if(active)mount(active)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&active)mount(active)});
setInterval(()=>{if(!document.hidden&&active)mount(active)},HOUR);
window.JAPAN_WEATHER={markup,mount,places,range,parse,condition,scene};
})();