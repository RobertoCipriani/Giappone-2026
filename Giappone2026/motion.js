/* Small, interruptible motions. Navigation, data and focus always update immediately. */
(()=>{'use strict';
const ease='cubic-bezier(.16,1,.3,1)',reduction=window.matchMedia?.('(prefers-reduced-motion: reduce)');
const accordions=new Map(),effects=new Map();
let activeTab=null,glider=null,navFrame=0,converterFrame=0,ambientObserver=null;
let ambientNodes=new Set();
const reduced=()=>!!reduction?.matches;
const allowed=()=>!reduced()&&!document.hidden;
function effect(el,frames,duration=220){
 if(!el?.animate||!allowed())return;
 effects.get(el)?.cancel();
 const animation=el.animate(frames,{duration,easing:ease});
 effects.set(el,animation);
 const clean=()=>{if(effects.get(el)===animation)effects.delete(el)};
 animation.onfinish=clean;animation.oncancel=clean;return animation;
}
function nav(force=false){
 const bar=document.querySelector('.main-tabs'),tab=bar?.querySelector('button.active');
 if(!bar||!tab||(!force&&tab===activeTab))return;
 const bounds=bar.getBoundingClientRect(),button=tab.getBoundingClientRect();
 if(!bounds.width||!button.width)return;
 const mobile=window.matchMedia?.('(max-width: 760px)').matches,icon=tab.querySelector('[data-nav-icon]');
 let x=button.left-bounds.left,y=button.top-bounds.top,w=button.width,h=3;
 if(mobile&&icon){w=icon.offsetWidth;h=icon.offsetHeight;x+=(button.width-w)/2;y+=icon.offsetTop}
 else y=bounds.height-h-1;
 if(!w||!h)return;
 if(!glider){glider=document.createElement('span');glider.className='nav-glider';glider.setAttribute('aria-hidden','true');bar.appendChild(glider)}
 // Resize is immediate; only changing tabs slides the highlight.
 glider.classList.toggle('glider-still',force||!activeTab||reduced());
 glider.style.width=w+'px';glider.style.height=h+'px';glider.style.transform='translate3d('+x+'px,'+y+'px,0)';
 bar.classList.add('motion-ready');activeTab=tab;
}
function scheduleNav(){if(navFrame)return;navFrame=requestAnimationFrame(()=>{navFrame=0;nav(true)})}
function finish(details,state,commit=true){
 if(accordions.get(details)!==state)return;
 accordions.delete(details);state.animation?.cancel();state.bodyAnimation?.cancel();
 if(commit)details.open=state.desired;
 details.classList.remove('motion-accordion');
}
function settle(){
 for(const [details,state] of accordions)finish(details,state);
 for(const animation of effects.values())animation.cancel();effects.clear();
}
function accordion(event){
 const summary=event.target.closest?.('summary'),details=summary?.parentElement;
 if(!summary||!details?.matches('details')||!details.closest('main')||!details.animate||!allowed()||event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
 const control=event.target.closest?.('a,button,input,select,textarea');
 if(control&&control!==summary)return;
 const previous=accordions.get(details),desired=previous?!previous.desired:!details.open;
 const currentHeight=details.getBoundingClientRect().height;
 if(!currentHeight)return;
 event.preventDefault();
 // Cancel before replacing the state so a rapid second tap starts where the first left off.
 if(previous)finish(details,previous,false);
 details.classList.remove('motion-accordion');
 details.open=false;const closedHeight=details.getBoundingClientRect().height;
 details.open=true;const expandedHeight=details.getBoundingClientRect().height;
 if(!closedHeight||!expandedHeight){details.open=desired;return}
 const body=details.querySelector('.details-body,.today-hotel-body,.weather-details,.timeline')||
 [...details.children].find(el=>el!==summary);
 // Very long sections use a brief fade instead of moving a screenful of text.
 if(expandedHeight>Math.min(1400,window.innerHeight*1.8)||Math.abs(expandedHeight-closedHeight)<2){
  details.open=desired;if(desired)effect(body,[{opacity:.5,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],180);return;
 }
 const state={desired,animation:null,bodyAnimation:null};accordions.set(details,state);
 details.classList.add('motion-accordion');
 try{
  state.animation=details.animate([{height:currentHeight+'px'},{height:(desired?expandedHeight:closedHeight)+'px'}],
   {duration:desired?260:210,easing:ease,fill:'both'});
  if(desired&&body?.animate)state.bodyAnimation=body.animate([{opacity:.35,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:210,easing:ease});
  state.animation.onfinish=()=>finish(details,state);
  state.animation.oncancel=()=>finish(details,state);
 }catch{finish(details,state)}
}
function social(post,kind,comment){
 if(!allowed())return;
 // Compare dataset values rather than interpolating identifiers in CSS selectors.
 if(kind==='like'){
  const button=[...document.querySelectorAll('.moment-like[data-post]')].find(el=>el.dataset.post===post);
  effect(button?.querySelector('span'),[{transform:'scale(1)'},{transform:'scale(1.35) rotate(-9deg)',offset:.4},{transform:'scale(1) rotate(0)'}],340);
 }else if(kind==='comment'){
  for(const el of document.querySelectorAll('.moment-comment[data-comment-id]')){
   if(el.dataset.commentId===comment)effect(el,[{opacity:.3,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],240);
  }
 }
}
function input(event){
 if(event.target.id!=='yen-amount'||!allowed()||converterFrame)return;
 converterFrame=requestAnimationFrame(()=>{converterFrame=0;effect(document.querySelector('#converted'),[{opacity:.65,transform:'translateY(2px)'},{opacity:1,transform:'translateY(0)'}],160)});
}
function ambient(){
 if(!window.IntersectionObserver)return;
 const nodes=new Set(document.querySelectorAll('.weather-scene,[data-kitsu-character],.moments-loader-scene,.moment-photo.is-loading'));
 // Reuse the observer, but release detached fragments after a view or feed refresh.
 ambientObserver??=new window.IntersectionObserver(entries=>{
  for(const entry of entries)if(ambientNodes.has(entry.target))entry.target.classList.toggle('motion-asleep',!entry.isIntersecting);
 },{rootMargin:'40px'});
 for(const node of ambientNodes)if(!nodes.has(node)){ambientObserver.unobserve(node);node.classList.remove('motion-asleep')}
 for(const node of nodes)if(!ambientNodes.has(node))ambientObserver.observe(node);
 ambientNodes=nodes;
}
function pause(){
 document.documentElement?.classList.toggle('motion-paused',document.hidden);
 if(document.hidden||reduced())settle();
}
document.addEventListener('click',accordion,true);
document.addEventListener('input',input);
document.addEventListener('visibilitychange',pause);
document.addEventListener('DOMContentLoaded',()=>{nav(true);pause();ambient()},{once:true});
window.addEventListener('resize',scheduleNav);window.addEventListener('orientationchange',scheduleNav);
reduction?.addEventListener?.('change',()=>{pause();nav(true)});
window.JAPAN_MOTION={nav,settle,social,ambient};
})();
