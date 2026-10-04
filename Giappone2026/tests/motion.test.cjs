/* node Giappone2026/tests/motion.test.cjs
 * Deterministic browser simulation: no network, real photos or credentials. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'..','motion.js'),'utf8');
const checks=[];
function check(label,value){if(!value)throw Error(label);checks.push(label)}
function fixture(){
 const listeners=[],animations=[],frames=[],media={matches:false},mobile={matches:true};
 const classes=()=>{const set=new Set();return {add:c=>set.add(c),remove:c=>set.delete(c),contains:c=>set.has(c),toggle(c,on){if(on??!set.has(c))set.add(c);else set.delete(c)}}};
 function el(kind='div'){
  const node={kind,tagName:kind.toUpperCase(),dataset:{},classList:classes(),style:{},children:[],open:false,isConnected:true,offsetWidth:44,offsetHeight:30,offsetTop:5,
   rect:{left:0,top:0,width:80,height:55},visualHeight:null,
   getBoundingClientRect(){return {...this.rect,height:this.visualHeight??(kind==='details'?(this.open?this.expanded:this.closed):this.rect.height)}},
   appendChild(child){this.children.push(child);child.parentElement=this;return child},setAttribute(k,v){this[k]=v},
   matches(selector){return selector==='details'&&kind==='details'},
   closest(selector){if(selector==='summary')return kind==='summary'?this:null;if(selector==='main')return kind==='details'?main:null;return null},
   querySelector(){return null},
   animate(keyframes,options){const animation={el:this,keyframes,options,cancelled:false,cancel(){if(this.cancelled)return;this.cancelled=true;this.el.visualHeight=null;this.oncancel?.()},complete(){this.onfinish?.()}};animations.push(animation);return animation}
  };return node;
 }
 const main=el('main'),summary=el('summary'),details=el('details'),body=el();
 details.closed=60;details.expanded=280;details.appendChild(summary);details.appendChild(body);details.querySelector=()=>body;
 const nav=el('nav'),tabs=['today','program','moments','more'].map((name,i)=>{const b=el('button'),icon=el('span');b.dataset.view=name;b.rect={left:20+i*80,top:705,width:80,height:55};b.querySelector=()=>icon;return b});
 nav.rect={left:20,top:700,width:320,height:65};let active=tabs[0],measures=0;
 const originalRect=nav.getBoundingClientRect.bind(nav);nav.getBoundingClientRect=()=>{measures++;return originalRect()};nav.querySelector=()=>active;
 const heart=el(),like=el('button');like.dataset.post='p';like.querySelector=()=>heart;
 const comment=el('li');comment.dataset.commentId='c';const converted=el('strong');
 const document={hidden:false,documentElement:el('html'),querySelector:s=>s==='.main-tabs'?nav:s==='#converted'?converted:null,querySelectorAll:s=>s.includes('moment-like')?[like]:s.includes('moment-comment')?[comment]:[],createElement:()=>el(),addEventListener:(type,fn)=>listeners.push({node:'document',type,fn})};
 media.addEventListener=(type,fn)=>listeners.push({node:'media',type,fn});
 const window={innerHeight:800,matchMedia:s=>s.includes('max-width')?mobile:media,addEventListener:(type,fn)=>listeners.push({node:'window',type,fn})};
 const raf=fn=>{frames.push(fn);return frames.length};
 new Function('window','document','requestAnimationFrame',source)(window,document,raf);
 const dispatch=(type,event={},node='document')=>listeners.filter(l=>l.type===type&&l.node===node).forEach(l=>l.fn(event));
 const click=(extra={})=>{const event={target:summary,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true},...extra};dispatch('click',event);return event};
 const flush=()=>{const pending=frames.splice(0);pending.forEach(fn=>fn())};
 return {window,document,media,mobile,main,summary,details,body,nav,tabs,heart,like,comment,converted,animations,frames,dispatch,click,flush,setTab:t=>active=t,get measures(){return measures}};
}
const f=fixture(),M=f.window.JAPAN_MOTION;
f.dispatch('DOMContentLoaded');
check('Navigation highlights the initial tab without an entrance slide',f.nav.children[0].classList.contains('glider-still'));
check('Mobile highlight fits the icon rather than covering the tab label',f.nav.children[0].style.width==='44px'&&f.nav.children[0].style.height==='30px');
const measured=f.measures;M.nav();M.nav();check('Background renders do not remeasure unchanged navigation',f.measures===measured);
f.setTab(f.tabs[2]);M.nav();
check('Changing tabs moves the same highlight with a bounded transition',f.nav.children.length===1&&!f.nav.children[0].classList.contains('glider-still')&&f.nav.children[0].style.transform==='translate3d(178px,10px,0)');
f.mobile.matches=false;f.dispatch('resize',{},'window');f.dispatch('resize',{},'window');check('Repeated resize events share one scheduled measurement',f.frames.length===1);f.flush();
check('Desktop navigation becomes an underline without a resize animation',f.nav.children[0].style.height==='3px'&&f.nav.children[0].classList.contains('glider-still'));
let event=f.click();check('A user can smoothly open a native details card',event.defaultPrevented&&f.details.open&&f.details.classList.contains('motion-accordion'));
const opening=f.animations.find(a=>a.el===f.details);check('Only user-triggered accordion layout changes animate',opening.keyframes[0].height==='60px'&&opening.keyframes[1].height==='280px');
f.details.visualHeight=140;event=f.click();
const closing=f.animations.filter(a=>a.el===f.details).at(-1);
check('A second rapid tap reverses from the visible height and cancels the old motion',opening.cancelled&&closing.keyframes[0].height==='140px'&&closing.keyframes[1].height==='60px');
closing.complete();check('Closing restores the native closed state without leaving clipping',!f.details.open&&!f.details.classList.contains('motion-accordion')&&closing.cancelled);
f.click();M.settle();check('A render during opening preserves the requested expanded state',f.details.open&&!f.details.classList.contains('motion-accordion'));
f.click();M.settle();check('A render during closing preserves the requested closed state',!f.details.open&&!f.details.classList.contains('motion-accordion'));
f.details.expanded=2000;const beforeLarge=f.animations.filter(a=>a.el===f.details).length;f.click();
check('Long reading sections open immediately without a large height animation',f.details.open&&f.animations.filter(a=>a.el===f.details).length===beforeLarge&&!f.details.classList.contains('motion-accordion'));
M.settle();f.details.open=false;f.details.expanded=280;const beforeLink=f.animations.length;
const control={closest:s=>s==='summary'?f.summary:s==='a,button,input,select,textarea'?{}:null};
event=f.click({target:control});check('Links or buttons inside summaries retain their normal interaction',!event.defaultPrevented&&f.animations.length===beforeLink);
event=f.click({ctrlKey:true});check('Modified clicks retain native behavior',!event.defaultPrevented);
f.media.matches=true;event=f.click();check('Reduced motion uses native details without interception',!event.defaultPrevented&&!f.details.open);
f.media.matches=false;f.click();f.document.hidden=true;f.dispatch('visibilitychange');
check('Leaving the app settles an interrupted card and pauses decorative loops',f.details.open&&!f.details.classList.contains('motion-accordion')&&f.document.documentElement.classList.contains('motion-paused'));
const hiddenCount=f.animations.length;M.social('p','like');check('Hidden apps never start social animations',f.animations.length===hiddenCount);
f.document.hidden=false;f.dispatch('visibilitychange');check('Decorative loops resume when the app becomes visible',!f.document.documentElement.classList.contains('motion-paused'));
M.social('p','like');const likeMotion=f.animations.at(-1);check('A confirmed like animates only its local heart',likeMotion.el===f.heart&&likeMotion.options.duration<=350);
M.social('p','like');check('Repeated heart feedback cancels its predecessor',likeMotion.cancelled);
M.social('p','comment','c');check('Comment feedback targets the exact submitted comment',f.animations.at(-1).el===f.comment);
const unrelated=f.animations.length;M.social('p','comment','other');check('Refreshing unrelated comments produces no extra motion',f.animations.length===unrelated);
f.converted.textContent='10,00 €';f.dispatch('input',{target:{id:'yen-amount'}});f.dispatch('input',{target:{id:'yen-amount'}});
check('Converter feedback coalesces quick input without delaying the value',f.frames.length===1&&f.converted.textContent==='10,00 €');f.flush();
check('Currency result uses one short local feedback animation',f.animations.at(-1).el===f.converted&&f.animations.at(-1).options.duration===160);
f.media.matches=true;f.dispatch('change',{},'media');
check('Turning reduced motion on cancels running effects',f.animations.filter(a=>a.el===f.heart||a.el===f.converted).every(a=>a.cancelled));
const reducedCount=f.animations.length;M.social('p','like');f.dispatch('input',{target:{id:'yen-amount'}});check('Reduced motion disables social and converter feedback',f.animations.length===reducedCount&&f.frames.length===0);
const ambient=fixture(),observed=new Set(),released=[];
let intersections;const decoration={classList:{toggle:(name,on)=>decoration.paused=on,remove:()=>decoration.paused=false}};
ambient.window.IntersectionObserver=class{
 constructor(callback){intersections=callback}
 observe(node){observed.add(node)}unobserve(node){observed.delete(node);released.push(node)}
};
const oldQuery=ambient.document.querySelectorAll;let present=true;
ambient.document.querySelectorAll=selector=>selector.includes('weather-scene')?(present?[decoration]:[]):oldQuery(selector);
ambient.window.JAPAN_MOTION.ambient();
check('Decorative scenes share a visibility observer',observed.size===1);
intersections([{target:decoration,isIntersecting:false}]);check('Offscreen decoration pauses without affecting reading',decoration.paused===true);
intersections([{target:decoration,isIntersecting:true}]);check('Visible decoration resumes its own animation',decoration.paused===false);
present=false;ambient.window.JAPAN_MOTION.ambient();check('Replacing a view releases detached decoration references',observed.size===0&&released[0]===decoration);
intersections([{target:decoration,isIntersecting:false}]);check('Late observer callbacks cannot pause removed scenes',decoration.paused===false);
const unsupported=fixture();unsupported.details.animate=undefined;check('Browsers without Web Animations keep native accordion behavior',!unsupported.click().defaultPrevented);
const keyboard=fixture();keyboard.click({detail:0});check('Keyboard activation still opens and animates the same native card',keyboard.details.open);keyboard.animations.find(a=>a.el===keyboard.details).complete();
check('Completed expansion has no retained animation or forced height',keyboard.details.open&&!keyboard.details.classList.contains('motion-accordion')&&keyboard.details.visualHeight===null);
console.log(checks.length+' interaction-motion checks passed.');
