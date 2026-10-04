/* Plain-text notes with validated formatting ranges. No author HTML is executed. */
(()=>{'use strict';
const sizes=[12,14,16,18,20,24],colors=['#44545c','#b84339','#987023','#23675c','#315a92','#743d80'];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function style(raw={}){
 const s={};if(raw.size!=null){if(!sizes.includes(raw.size))throw Error('Grandezza delle note non valida.');s.size=raw.size}
 if(raw.color!=null){if(typeof raw.color!=='string'||!/^#[a-fA-F0-9]{6}$/.test(raw.color))throw Error('Colore delle note non valido.');s.color=raw.color.toLowerCase()}
 for(const k of ['bold','italic','underline'])if(raw[k]!=null){if(typeof raw[k]!=='boolean')throw Error('Formato delle note non valido.');if(raw[k])s[k]=true}
 return s
}
function validate(text,ranges){
 if(ranges==null||ranges==='')return [];if(typeof ranges==='string'){try{ranges=JSON.parse(ranges)}catch{throw Error('Formato delle note non leggibile.')}}
 if(!Array.isArray(ranges)||ranges.length>250)throw Error('La formattazione delle note contiene troppi frammenti.');
 let end=0;return ranges.map(r=>{if(!r||!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<end||r.end<=r.start||r.end>text.length)throw Error('Selezione delle note non valida.');end=r.end;return {start:r.start,end:r.end,...style(r)}}).filter(r=>Object.keys(r).length>2)
}
function apply(text,ranges,start,end,patch){
 ranges=validate(text,ranges);start=Math.max(0,Math.min(text.length,start));end=Math.max(start,Math.min(text.length,end));if(start===end)return ranges;
 const bounds=[...new Set([0,text.length,start,end,...ranges.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b),out=[];
 for(let i=0;i<bounds.length-1;i++){
  const a=bounds[i],b=bounds[i+1],old=ranges.find(r=>r.start<=a&&r.end>=b);let s=style(old);
  if(a>=start&&b<=end)s=patch===null?{}:style({...s,...patch});
  if(!Object.keys(s).length)continue;
  const last=out.at(-1);if(last&&last.end===a&&same(style(last),s))last.end=b;else out.push({start:a,end:b,...s});
 }
 return validate(text,out)
}
function adjust(before,after,ranges){
 ranges=validate(before,ranges);let prefix=0,suffix=0;while(prefix<Math.min(before.length,after.length)&&before[prefix]===after[prefix])prefix++;
 while(suffix<Math.min(before.length-prefix,after.length-prefix)&&before[before.length-1-suffix]===after[after.length-1-suffix])suffix++;
 const oldEnd=before.length-suffix,newEnd=after.length-suffix,delta=after.length-before.length,out=[];
 for(const r of ranges){
  if(r.end<=prefix)out.push({...r});
  else if(r.start>=oldEnd)out.push({...r,start:r.start+delta,end:r.end+delta});
  else {const start=Math.min(r.start,prefix),end=r.end>=oldEnd?r.end+delta:newEnd;if(end>start)out.push({...r,start,end})}
 }
 // An edit across two styles inherits the first style on inserted text, and keeps untouched suffixes.
 const cleaned=[];for(const r of out){const last=cleaned.at(-1);if(last&&r.start<last.end)r.start=last.end;if(r.end>r.start)cleaned.push(r)}
 return validate(after,cleaned)
}
// Preserve authored hue while keeping coloured notes legible on dark cards.
function darkColor(hex){
 const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16));
 const lum=values=>values.reduce((sum,v,i)=>{const c=v/255;return sum+[.2126,.7152,.0722][i]*(c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4))},0);
 const background=lum([48,59,60]);let adjusted=rgb;
 for(let step=0;step<=100;step++){adjusted=rgb.map(v=>Math.round(v+(255-v)*step/100));if((lum(adjusted)+.05)/(background+.05)>=4.5)break}
 return '#'+adjusted.map(v=>v.toString(16).padStart(2,'0')).join('')
}
function html(text,ranges){
 ranges=validate(text,ranges);let cursor=0,out='';
 for(const r of ranges){out+=escape(text.slice(cursor,r.start));const css=[r.size?'font-size:'+r.size+'px':'',r.color?'color:'+r.color+';--note-dark-color:'+darkColor(r.color):'',r.bold?'font-weight:700':'',r.italic?'font-style:italic':'',r.underline?'text-decoration:underline':''].filter(Boolean).join(';');out+='<span'+(r.color?' data-note-color="'+r.color+'"':'')+' style="'+css+'">'+escape(text.slice(r.start,r.end))+'</span>';cursor=r.end}
 return '<div class="formatted-note">'+out+escape(text.slice(cursor))+'</div>'
}
function fieldMarkup(name,text,ranges){
 const value=JSON.stringify(validate(text,ranges));
 return '<div class="note-tools" data-note-for="'+escape(name)+'" role="group" aria-label="Formatta le note"><label>Grandezza <select data-note-style="size" aria-label="Grandezza del testo"><option value="">Scegli</option>'+sizes.map(n=>'<option value="'+n+'">'+n+' px</option>').join('')+'</select></label><label>Colore <input type="color" value="#44545c" data-note-style="color" aria-label="Colore del testo"></label><button type="button" data-note-style="bold" aria-label="Grassetto" title="Grassetto"><b>B</b></button><button type="button" data-note-style="italic" aria-label="Corsivo" title="Corsivo"><i>I</i></button><button type="button" data-note-style="underline" aria-label="Sottolineato" title="Sottolineato"><u>U</u></button><button type="button" data-note-style="clear" aria-label="Togli formattazione" title="Togli formattazione">↺</button></div><input type="hidden" name="'+escape(name)+'Format" value="'+escape(value)+'"><small class="note-hint">Seleziona il testo da formattare, oppure applica lo stile a tutta la nota.</small><div class="note-preview" aria-label="Anteprima delle note"></div>'
}
function mount(container){
 for(const textarea of container.querySelectorAll('textarea[data-note-editor]')){
  if(textarea.dataset.noteMounted)continue;textarea.dataset.noteMounted='1';
  const field=textarea.closest('.field'),tools=field.querySelector('.note-tools'),hidden=field.querySelector('input[type="hidden"]'),preview=field.querySelector('.note-preview');
  let before=textarea.value,ranges=validate(before,hidden.value),selection={start:0,end:0};
  const capture=()=>selection={start:textarea.selectionStart,end:textarea.selectionEnd};
  const paint=()=>{hidden.value=JSON.stringify(ranges);preview.hidden=!textarea.value;preview.innerHTML=textarea.value?html(textarea.value,ranges):''};
  textarea.addEventListener('select',capture);textarea.addEventListener('keyup',capture);textarea.addEventListener('pointerup',capture);textarea.addEventListener('blur',capture);
  textarea.addEventListener('input',()=>{ranges=adjust(before,textarea.value,ranges);before=textarea.value;capture();paint()});
  tools.addEventListener('pointerdown',event=>{capture();if(event.target.closest('button'))event.preventDefault()});
  const format=event=>{
   const control=event.target.closest('[data-note-style]');if(!control)return;const k=control.dataset.noteStyle;
   if(control.tagName!=='BUTTON'&&event.type!=='change')return;if(control.tagName==='BUTTON'&&event.type!=='click')return;
   const start=selection.start===selection.end?0:selection.start,end=selection.start===selection.end?textarea.value.length:selection.end;
   const current=ranges.find(r=>r.start<=start&&r.end>=end)||{};
   const patch=k==='clear'?null:k==='size'?{size:Number(control.value)}:k==='color'?{color:control.value}:{[k]:!current[k]};
   if(k==='size'&&!control.value)return;
   try{ranges=apply(textarea.value,ranges,start,end,patch);paint();textarea.focus({preventScroll:true});textarea.setSelectionRange(start,end);capture()}catch(e){preview.hidden=false;preview.textContent=e.message}
  };
  tools.addEventListener('click',format);tools.addEventListener('change',format);paint()
 }
}
window.JAPAN_NOTES={validate,apply,adjust,html,fieldMarkup,mount,darkColor};
})();
