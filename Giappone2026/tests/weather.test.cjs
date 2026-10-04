/* node Giappone2026/tests/weather.test.cjs — no real network or personal credentials. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'..','weather.js'),'utf8');
const program=JSON.parse(fs.readFileSync(path.resolve(__dirname,'..','programma.json'),'utf8')).program;
function fixture(time='2026-10-29T03:00:00Z',memory={}){
 let clock=Date.parse(time),serial=0,detail={open:false};
 const requests=[],timers=new Map(),listeners=[],intervals=[],paints=[],attrs={},button={focus(){attrs.focused=true}};
 const root={dataset:{weatherDate:'2026-10-29'},weatherHTML:null,contains:()=>true,querySelector:s=>s==='[data-weather-card]'?detail:s==='[data-weather-refresh]'?button:null};
 Object.defineProperty(root,'innerHTML',{get:()=>paints.at(-1)||'',set:value=>{paints.push(value);detail={open:false}}});
 const f={requests,timers,listeners,intervals,paints,attrs,root,memory,advance:ms=>clock+=ms,setDate:date=>root.dataset.weatherDate=date,open:()=>detail.open=true,isOpen:()=>detail.open,transport:null};
 class TestDate extends Date{constructor(...args){super(...(args.length?args:[clock]))}static now(){return clock}}
 const window={addEventListener:(type,fn)=>listeners.push({type,fn,node:'window'})},document={hidden:false,activeElement:null,querySelector:()=>root,addEventListener:(type,fn)=>listeners.push({type,fn,node:'document'})};
 const localStorage={getItem:key=>memory[key]||null,setItem:(key,value)=>memory[key]=value},navigator={onLine:true};
 const fetch=async(url,options)=>{requests.push({url,options});return f.transport?f.transport(url,options):{ok:true,json:async()=>payload()}};
 const setTimeout=(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id},clearTimeout=id=>timers.delete(id);
 class AbortController{constructor(){this.signal={aborted:false}}abort(){this.signal.aborted=true}}
 const instrumented=source.replace(/\}\)\(\);\s*$/,'window.WEATHER_INTERNAL={snapshot,request};})();');
 new Function('window','document','localStorage','navigator','fetch','Date','setTimeout','clearTimeout','setInterval','AbortController',instrumented)(window,document,localStorage,navigator,fetch,TestDate,setTimeout,clearTimeout,(fn,ms)=>intervals.push({fn,ms}),AbortController);
 Object.assign(f,{window,document,navigator,W:window.JAPAN_WEATHER,I:window.WEATHER_INTERNAL});return f
}
function payload(date='2026-10-29',overrides={}){
 return {daily:{time:[date,'2026-10-30'],temperature_2m_min:[14,15],temperature_2m_max:[23,24],weather_code:[2,61],precipitation_probability_max:[20,90],wind_speed_10m_max:[18,32]},current:{time:date+'T12:00',temperature_2m:21,weather_code:0,wind_speed_10m:9,is_day:1},...overrides}
}
(async()=>{
 const tests=[],check=(name,value)=>{if(!value)throw Error(name);tests.push(name)},clone=p=>JSON.parse(JSON.stringify(p));
 const f=fixture(),W=f.W,tokyo={date:'2026-10-29',title:'Asakusa',from:'Tokyo',to:'Tokyo',events:[]};
 check('Itinerary cities are deduplicated',W.places(tokyo).length===1);
 const itinerary=clone(program);
 check('Kyoto and Osaka are both forecast locations',W.places(itinerary.days[3]).map(p=>p.name).join(',')==='Kyoto,Osaka');
 check('Mountain trek uses Kamikochi before the hotel city',W.places(itinerary.days[8]).map(p=>p.name).join(',')==='Kamikōchi,Takayama');
 check('Shirakawa-go and Takayama are distinct locations',W.places(itinerary.days[7]).map(p=>p.name).join(',')==='Shirakawa-go,Takayama');
 check('Hida Furukawa is included on the excursion day',W.places(itinerary.days[9]).some(p=>p.name==='Hida Furukawa'));
 check('Diacritic and dash variations resolve to the same point',W.places({title:'Kamikōchi',from:'Shirakawa–go',to:'',events:[]}).map(p=>p.key).join(',')==='kamikochi,shirakawago');
 check('Unknown cities can be resolved without editing code',W.places({title:'Visita',from:'Hakone',to:'Hakone',events:[]})[0].key==='geo:hakone');
 const before=new Date('2026-10-04T13:00:00Z');
 check('Far-future forecast is not invented',W.range('2026-10-29',before).kind==='future'&&W.range('2026-10-29',before).opens==='2026-10-14');
 check('Inclusive 16-day forecast boundary is correct',W.range('2026-10-29',new Date('2026-10-14T00:00:00Z')).kind==='available'&&W.range('2026-10-30',new Date('2026-10-14T00:00:00Z')).kind==='future');
 check('Forecast day follows Japan midnight rather than device UTC',W.range('2026-10-30',new Date('2026-10-14T15:01:00Z')).kind==='available');
 check('Invalid calendar dates never enter the API',W.range('2026-02-30',before).kind==='invalid');
 const future=fixture('2026-10-04T13:00:00Z');await future.W.mount(tokyo);
 check('Far-future days make no network requests',future.requests.length===0&&future.paints.at(-1).includes('Previsioni dal 14 ott'));
 check('Far-future summary contains no fabricated temperatures',!future.paints.at(-1).includes('Min / Max'));
 const parsed=W.parse(payload());
 check('Forecast extraction keeps temperatures, rain and maximum wind',parsed.days['2026-10-29'].min===14&&parsed.days['2026-10-30'].rain===90&&parsed.days['2026-10-30'].wind===32);
 const missing=payload();missing.daily.temperature_2m_min[0]=null;
 check('Missing temperature does not become zero degrees',!W.parse(missing).days['2026-10-29']);
 let rejected=false;try{W.parse({error:true})}catch{rejected=true}check('Provider errors cannot become forecasts',rejected);
 check('Weather code zero is recognised as clear sky',W.condition(0).kind==='sun');
 check('Rain, fog, snowfall and thunderstorms have separate scenes',[61,45,73,95].map(c=>W.condition(c).kind).join(',')==='rain,fog,snow,storm');
 check('Unknown codes never become sunny by default',W.condition(null).kind==='unknown'&&W.condition(44).kind==='unknown');
 check('Wind adds leaves without replacing the rain condition',W.condition(61,35).kind==='rain'&&W.condition(61,35).windy&&W.scene('rain',true).includes('wx-leaf'));
 check('Night-time clear conditions display a moon',W.condition(0,3,true).kind==='night'&&W.scene('night').includes('wx-moon'));
 await W.mount(tokyo);
 check('Public API request uses the selected place and daily Japanese date window',f.requests[0].url.includes('latitude=35.6895')&&f.requests[0].url.includes('forecast_days=16')&&f.requests[0].url.includes('timezone=auto'));
 check('Forecast request contains no API key or member credentials',!f.requests[0].url.includes('apikey')&&f.requests[0].options.credentials==='omit'&&f.requests[0].options.referrerPolicy==='no-referrer');
 check('Widget renders real data and source attribution',f.paints.at(-1).includes('14°')&&f.paints.at(-1).includes('23°')&&f.paints.at(-1).includes('Open-Meteo'));
 check('Current-day scene uses the latest current condition',W.markup(tokyo).includes('weather-sun')&&W.markup(tokyo).includes('Adesso 21°'));
 check('Another date never reuses current weather',W.markup({...tokyo,date:'2026-10-30'}).includes('weather-rain')&&!W.markup({...tokyo,date:'2026-10-30'}).includes('Adesso 21°'));
 check('Completed requests clear their timeout timers',f.timers.size===0);
 const count=f.requests.length;f.open();await W.mount(tokyo);
 check('Repeated views use the cached forecast instead of issuing requests',f.requests.length===count);
 check('Weather updates keep the accordion open',f.isOpen());
 f.navigator.onLine=false;f.advance(2*3600000);await W.mount(tokyo);
 check('Offline mode shows a dated saved forecast',f.requests.length===count&&W.markup(tokyo).includes('Previsione salvata'));
 check('Stale current conditions do not masquerade as live weather',!W.markup(tokyo).includes('Adesso 21°'));
 const restart=fixture('2026-10-29T05:00:00Z',{...f.memory});restart.navigator.onLine=false;
 check('Forecast cache survives closing and reopening the app',restart.W.markup(tokyo).includes('14°')&&restart.W.markup(tokyo).includes('Previsione salvata'));
 const broken=fixture();broken.transport=async()=>({ok:false});await broken.W.mount(tokyo);const errorCount=broken.requests.length;await broken.W.mount(tokyo);
 check('Errors use a cooldown instead of retrying on every render',broken.requests.length===errorCount&&broken.W.markup(tokyo).includes('Previsione non disponibile'));
 const denied=fixture();denied.memory.profile='account';denied.memory.invite='group';await denied.W.mount(tokyo);
 check('Weather storage does not alter accounts or invitations',denied.memory.profile==='account'&&denied.memory.invite==='group');
 const concurrent=fixture();let resolve;concurrent.transport=()=>new Promise(r=>resolve=r);
 const first=concurrent.W.mount(tokyo),second=concurrent.W.mount(tokyo);await Promise.resolve();await Promise.resolve();
 check('Concurrent mounts share one request per place',concurrent.requests.length===1);
 const farDay={...tokyo,date:'2026-11-20'};concurrent.setDate(farDay.date);await concurrent.W.mount(farDay);const beforeResponse=concurrent.paints.at(-1);
 resolve({ok:true,json:async()=>payload()});await Promise.all([first,second]);
 check('Late responses cannot overwrite another selected day',concurrent.paints.at(-1)===beforeResponse);
 const geocoded=fixture();geocoded.transport=async url=>({ok:true,json:async()=>url.includes('geocoding-api')?{results:[{country_code:'US',latitude:36,longitude:140,population:100},{country_code:'JP',latitude:35.232,longitude:139.107,population:50}]}:payload()});
 await geocoded.W.mount({date:tokyo.date,title:'Visita',from:'Hakone',to:'Hakone',events:[]});
 check('New city searches are explicitly restricted to Japan',geocoded.requests[0].url.includes('countryCode=JP')&&geocoded.requests[1].url.includes('latitude=35.232'));
 const escaped=W.markup({date:tokyo.date,title:'Visita',from:'<img src=x onerror=alert(1)>',to:'',events:[]});
 check('Itinerary location text is escaped before rendering',escaped.includes('&lt;img')&&!escaped.includes('<img src=x'));
 const offline=fixture();offline.navigator.onLine=false;await offline.W.mount(tokyo);
 check('First visit offline shows a useful state without network traffic',offline.requests.length===0&&offline.paints.at(-1).includes('Meteo non disponibile offline'));
 const timeout=fixture();timeout.transport=()=>new Promise(()=>{});const waiting=timeout.W.mount(tokyo);await Promise.resolve();await Promise.resolve();timeout.timers.values().next().value.fn();await waiting;
 check('Slow provider response times out without blocking the app',timeout.W.markup(tokyo).includes('Previsione non disponibile')&&timeout.requests[0].options.signal.aborted);
 console.log(tests.length+' weather checks passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
