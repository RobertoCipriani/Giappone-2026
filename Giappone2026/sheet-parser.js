/* Pure converter shared by the app integration and the Google Apps Script reader. */
var JAPAN_SHEET_PARSER=(function(){
  'use strict';
  const text=v=>String(v??'').trim(),norm=v=>text(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),unique=a=>[...new Set(a.filter(Boolean))];
  function urls(value){return (text(value).match(/https?:\/\/[^\s<>"']+/g)||[]).map(u=>u.replace(/[),.;]+$/,''))}
  function kind(value){const t=norm(value);if(/➡|→|⇄|🚇|🚆|🚌/.test(value)||/\bbus\b|\btreno\b|shinkansen|partenza|patenza|rientro|arrivo|cambio treno|ritrovo stazione|line\b|\bbin\s*\d|\bmin\b.*stazione|hotel.*\d+min/.test(t))return 'trasporto';if(/pranzo|cena|colazione|streetfood|street food/.test(t))return 'pasto';if(/check.?in|^(hotel|casa|itinerario tipo|giorno libero)$|controlli|dogana|prenota|contatta|deposito|euro$|yen$|contanti|^\(|^\d+[.,]?\d*\s*[€¥y]|^\d+\s*(min|m|h)\b|sul posto|ultima partenza|qr code/.test(t))return 'nota';return 'attivita'}
  function number(value){if(typeof value==='number'&&Number.isFinite(value))return value;let t=text(value).replace(/[€¥\s]/g,'');if(!t)return null;if(/^[-–]+$/.test(t))return 0;if(t.includes(','))t=t.replace(/\./g,'').replace(',','.');const n=Number(t);return Number.isFinite(n)?n:null}
  function date(value,fallback){if(/^\d{4}-\d{2}-\d{2}$/.test(text(value)))return text(value);const months=['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic'];const t=norm(value),m=t.match(/(\d{1,2})[- /]([a-z]{3}|\d{1,2})(?:[- /](\d{4}))?/);if(!m)return fallback||'';const month=/^\d/.test(m[2])?Number(m[2])-1:months.indexOf(m[2]);if(month<0||month>11)return fallback||'';return `${m[3]||'2026'}-${String(month+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`}
  function hash(value){let h=2166136261;for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(36)}
  function parse(input,base){
    if(!input?.program?.values||!input?.bookings?.values)throw new Error('Il collegamento non contiene Programma e Prenotazioni.');
    const out=JSON.parse(JSON.stringify(base)),p=input.program,b=input.bookings,g=p.values,r=b.values;
    const get=(a,row,col)=>a?.[row]?.[col],cell=(row,col)=>text(get(g,row,col)),links=(part,row,col)=>unique([...(get(part.links,row,col)||[]),...urls(get(part.values,row,col))]),num=(part,row,col)=>get(part.numbers,row,col)??number(get(part.values,row,col));
    const awake=g.findIndex(row=>row.some(v=>norm(v)==='dove ci svegliamo'));
    if(awake<2)throw new Error('Non trovo la riga «Dove ci svegliamo» nel foglio.');
    const sleep=g.findIndex((row,i)=>i>awake&&row.some(v=>norm(v)==='dove dormiamo'));
    if(sleep<awake+1)throw new Error('Non trovo la riga «Dove dormiamo» nel foglio.');
    const dates=awake-2,header=r.findIndex(row=>row.some(v=>/prenotato/i.test(text(v))));
    const bookingStart=header>=0?header+1:1,bookingDateColumn=(r[header>=0?header:0]||[]).findIndex(v=>/^(data attivita|data check.?in|data viaggio)$/.test(norm(v)));
    const knownBookings=new Map(base.reservations.map(item=>[norm(item.title),item])),titlesInSource=new Set(r.slice(bookingStart).map(row=>norm(row[1])));
    out.reservations=[];
    for(let row=bookingStart;row<r.length;row++){const title=text(get(r,row,1));if(!title)continue;const rowCandidate=base.reservations.find(item=>item.id==='b'+(row+1)),old=knownBookings.get(norm(title))||((rowCandidate&&!titlesInSource.has(norm(rowCandidate.title))&&norm(rowCandidate.type)===norm(get(r,row,0)))?rowCandidate:null),status=norm(get(r,row,4)),record={...(old||{}),id:old?.id||'booking-'+hash(norm(title)),type:text(get(r,row,0))||'Altro',title,deadline:text(get(r,row,2)),notes:text(get(r,row,3)),status:['si','sì','prenotato','confermato'].includes(status)?'booked':['no','da prenotare'].includes(status)?'pending':'consider',owner:text(get(r,row,5)),total:num(b,row,6),people:num(b,row,7),price:num(b,row,8),payment:text(get(r,row,9)),links:links(b,row,3)};record.date=bookingDateColumn>=0?(get(b.dates,row,bookingDateColumn)||date(get(r,row,bookingDateColumn),old?.date||'')):(old?.date||'');out.reservations.push(record)}
    const knownDays=new Map(base.days.map(day=>[day.date,day]));out.days=[];const hotelRow=g.findIndex(row=>row.some(value=>/hotel\s*-\s*gruppo\s*1/.test(norm(value))));let currentHotelLinks=[];
    for(let col=1;col<(g[dates]?.length||0);col++){const dayDate=get(p.dates,dates,col)||date(cell(dates,col),base.days[col-1]?.date);if(!dayDate)continue;const old=knownDays.get(dayDate),day={...(old||{}),id:old?.id||'day-'+dayDate,date:dayDate,title:old?.title||cell(awake,col)||'Giornata in Giappone',from:cell(awake,col),to:cell(sleep,col),hotel:old?.hotel||null,notes:old?.notes||'',events:[]};
      const oldEvents=new Map((old?.events||[]).map(e=>[e.time+'|'+norm(e.title),e]));
      for(let row=awake+1;row<sleep;row++){let title=cell(row,col);if(!title)continue;const cellLinks=links(p,row,col),note=text(get(p.notes,row,col)),timeMatch=cell(row,0).match(/\b(\d{1,2}):([0-5]\d)\b/),time=timeMatch?timeMatch[1].padStart(2,'0')+':'+timeMatch[2]:'';
        if(/^https?:\/\/\S+$/.test(title)&&day.events.length){day.events[day.events.length-1].links=unique([...day.events[day.events.length-1].links,...cellLinks]);if(note)day.events[day.events.length-1].notes+=[day.events[day.events.length-1].notes?'\n':'',note].join('');continue;}
        if(!time&&day.events.length){const last=day.events[day.events.length-1];last.notes=[last.notes,title,note].filter(Boolean).join('\n');last.links=unique([...last.links,...cellLinks]);continue;}
        title=title.replace(/https?:\/\/[^\s]+/g,'').trim()||title;const prior=oldEvents.get(time+'|'+norm(title)),eventKind=kind(title),matched=out.reservations.find(item=>item.date===dayDate&&eventKind==='attivita'&&(norm(title).includes(norm(item.title))||norm(item.title).includes(norm(title))||(/skytree/i.test(title)&&/skytree/i.test(item.title))||(/cerimonia del te/.test(norm(title))&&/cerimonia del te/.test(norm(item.title)))));
        day.events.push({id:prior?.id||'event-'+hash(dayDate+'|'+time+'|'+norm(title)),time,title,kind:eventKind,notes:note||prior?.notes||'',links:unique(cellLinks),bookingId:matched?.id||prior?.bookingId||null,done:false});
      }
      if(hotelRow>=0&&col>1){const hotelText=cell(hotelRow,col),hotelLinks=links(p,hotelRow,col);if(hotelText||hotelLinks.length)currentHotelLinks=hotelLinks;const reservation=out.reservations.find(item=>item.id===day.hotel);if(reservation)reservation.links=unique([...reservation.links,...currentHotelLinks]);}if(day.events.length>300)throw new Error('La giornata contiene troppe attività.');out.days.push(day);
    }
    if(!out.days.length||out.days.length>100)throw new Error('Le date del programma non sono leggibili.');
    const titles=new Map(base.budget.map(x=>[norm(x.label),x]));out.budget=[];
    for(let row=0;row<awake;row++){const title=cell(row,0),old=titles.get(norm(title));if(old){const amount=num(p,row,1);if(amount!=null&&amount>=0)out.budget.push({...old,amount})}}
    if(out.budget.length!==base.budget.length)out.budget=base.budget.map(x=>out.budget.find(y=>y.id===x.id)||x);
    const exchangeRow=g.findIndex(row=>row.some(v=>norm(v)==='euro')&&row.some(v=>norm(v)==='yen'));if(exchangeRow>=0){const exchange=num(p,exchangeRow+1,6);if(exchange>0)out.info.exchange=exchange}
    out.start=out.days[0].date;out.end=out.days[out.days.length-1].date;out.updatedAt=input.updatedAt||new Date().toISOString();return out;
  }
  return {parse,kind,date,number};
})();
