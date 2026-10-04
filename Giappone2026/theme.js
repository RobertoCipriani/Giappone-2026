/* Apply before paint; preferences belong to this device, never to the shared itinerary. */
(()=>{'use strict';
const key='japan_2026_theme',root=document.documentElement;
const moon='<path d="M20.5 13A8.5 8.5 0 0 1 11 3.5 8.5 8.5 0 1 0 20.5 13Z"/><path d="m18 3 .4 1.6L20 5l-1.6.4L18 7l-.4-1.6L16 5l1.6-.4Z"/>',
sun='<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>';
let saved;try{saved=localStorage.getItem(key)}catch{}
let theme=saved==='dark'||saved==='light'?saved:'light',timer;
function paint(){
 root.dataset.theme=theme;root.style.colorScheme=theme;
 const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=theme==='dark'?'#11191f':'#fffdf9';
 const button=document.querySelector('#theme-toggle');if(!button)return;
 const dark=theme==='dark',label=dark?'Attiva la modalità chiara':'Attiva la modalità scura';
 button.setAttribute('aria-pressed',String(dark));button.setAttribute('aria-label',label);button.title=label;
 button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(dark?sun:moon)+'</svg>';
}
function set(value,animate=false){
 if(value!=='dark'&&value!=='light')return;
 if(animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){root.classList.add('theme-changing');clearTimeout(timer);timer=setTimeout(()=>root.classList.remove('theme-changing'),450)}
 theme=value;try{localStorage.setItem(key,theme)}catch{}paint();
}
paint();
document.addEventListener('DOMContentLoaded',()=>{paint();document.querySelector('#theme-toggle')?.addEventListener('click',()=>set(theme==='dark'?'light':'dark',true))},{once:true});
window.addEventListener('storage',event=>{if(event.key===key&&(event.newValue==='dark'||event.newValue==='light')){theme=event.newValue;paint()}});
window.JAPAN_THEME={set,current:()=>theme};
})();