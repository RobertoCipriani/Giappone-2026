// Trip app adaptation: real multi-touch input without synthetic keyboard events.
export function mountTouch({getInput,getState,pause,resume,audio}) {
  const root=document.createElement('div');root.className='trip-controls';
  root.innerHTML='<div class="trip-utility"><button type="button" data-trip-pause aria-label="Metti in pausa">Ⅱ</button><button type="button" data-trip-sound aria-label="Disattiva audio" aria-pressed="false">♫</button></div><div class="trip-drive"><div class="trip-steer"><button data-drive="left" aria-label="Sterza a sinistra">◀</button><button data-drive="right" aria-label="Sterza a destra">▶</button></div><div class="trip-actions"><button data-drive="drift" aria-label="Tieni premuto per derapare">↻<small>DERAPA</small></button><button data-drive="item" aria-label="Usa oggetto">🎁<small>OGGETTO</small></button></div><div class="trip-pedals"><button data-drive="brake" aria-label="Frena">▰<small>FRENO</small></button><button class="trip-gas" data-drive="accelerate" aria-label="Tieni premuto per accelerare">↑<small>GAS</small></button></div></div>';
  document.body.appendChild(root);
  const held=new Map(),reset=()=>{held.clear();getInput()?.reset();root.querySelectorAll('.held').forEach(b=>b.classList.remove('held'))};
  root.querySelectorAll('[data-drive]').forEach(button=>{
    button.addEventListener('pointerdown',e=>{e.preventDefault();if(!['intro','countdown','racing'].includes(getState()))return;button.setPointerCapture(e.pointerId);held.set(e.pointerId,{action:button.dataset.drive,button});getInput()?.setTouch(button.dataset.drive,true);button.classList.add('held')});
    const release=e=>{const press=held.get(e.pointerId);if(!press)return;held.delete(e.pointerId);if(![...held.values()].some(x=>x.action===press.action)){getInput()?.setTouch(press.action,false);press.button.classList.remove('held')}};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release);
  });
  root.querySelector('[data-trip-pause]').addEventListener('click',()=>{reset();getState()==='paused'?resume():pause()});
  const sound=root.querySelector('[data-trip-sound]');sound.addEventListener('click',()=>{const muted=audio.toggleMute();sound.textContent=muted?'×♫':'♫';sound.setAttribute('aria-pressed',String(muted));sound.setAttribute('aria-label',muted?'Attiva audio':'Disattiva audio')});
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset()});
  new MutationObserver(()=>{if(!['intro','countdown','racing'].includes(getState()))reset()}).observe(document.body,{attributes:true,attributeFilter:['data-state']});
}
