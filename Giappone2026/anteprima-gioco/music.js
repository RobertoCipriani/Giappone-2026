/* Original 126 BPM pentatonic soundtrack: synthesized plucked strings, flute and taiko.
 * No third-party recordings, remote audio files or microphone access. */
(() => {
'use strict';
let ac=null,master=null,musicBus=null,fxBus=null,echo=null,enabled=true,state='home',timer=null,next=0,step=0,scheduled=0;
const voices=new Set(),plucks=new Map(),sixteenth=60/126/4;
function track(node,when,cleanup=()=>{}){voices.add(node);node.onended=()=>{voices.delete(node);try{node.disconnect();cleanup();}catch{}};node.start(when);return node;}
function init(){if(ac)return true;try{ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.75;master.connect(ac.destination);musicBus=ac.createGain();musicBus.gain.value=.65;musicBus.connect(master);fxBus=ac.createGain();fxBus.gain.value=.20;fxBus.connect(master);const delay=ac.createDelay(.6),feedback=ac.createGain(),wet=ac.createGain();delay.delayTime.value=60/126*.75;feedback.gain.value=.22;wet.gain.value=.20;musicBus.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(master);echo=wet;return true;}catch{return false;}}
function envelope(target,at,peak,attack,decay){const g=ac.createGain();g.connect(target);g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),at+attack);g.gain.exponentialRampToValueAtTime(.0001,at+attack+decay);return g;}
function frequency(note){return 440*2**((note-69)/12);}
function pluck(note,at,velocity=.7){const freq=frequency(note),key=note;if(!plucks.has(key)){const duration=1.1,buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0),n=Math.floor(ac.sampleRate/freq);let r=note*1417+7;for(let i=0;i<n;i++){r=(r*1664525+1013904223)>>>0;data[i]=(r/4294967296*2-1)*.65;}for(let i=n;i<data.length;i++)data[i]=.496*(data[i-n]+data[i-n+1]);plucks.set(key,buffer);}const s=ac.createBufferSource();s.buffer=plucks.get(key);const g=envelope(musicBus,at,velocity,.004,.85);s.connect(g);track(s,at,()=>g.disconnect());s.stop(at+1.07);}
function flute(note,at,duration=.7,velocity=.19){const f=frequency(note),o=ac.createOscillator(),h=ac.createOscillator(),v=ac.createOscillator(),vg=ac.createGain(),hg=ac.createGain(),g=envelope(musicBus,at,velocity,.065,duration);o.type='sine';o.frequency.value=f;h.type='sine';h.frequency.value=f*2;hg.gain.value=.12;h.connect(hg);hg.connect(g);o.connect(g);v.frequency.value=5.2;vg.gain.value=f*.003;v.connect(vg);vg.connect(o.frequency);track(o,at,()=>{g.disconnect();hg.disconnect();vg.disconnect();});track(h,at);track(v,at);o.stop(at+duration+.1);h.stop(at+duration+.1);v.stop(at+duration+.1);}
function drum(at,heavy=false){const o=ac.createOscillator(),g=envelope(musicBus,at,heavy?.55:.27,.003,heavy?.32:.15);o.type='sine';o.frequency.setValueAtTime(heavy?116:190,at);o.frequency.exponentialRampToValueAtTime(heavy?43:73,at+.15);o.connect(g);track(o,at,()=>g.disconnect());o.stop(at+.4);}
function wood(at,accent=false){const o=ac.createOscillator(),g=envelope(musicBus,at,accent?.10:.043,.002,.045);o.type='triangle';o.frequency.setValueAtTime(accent?1120:1780,at);o.frequency.exponentialRampToValueAtTime(700,at+.04);o.connect(g);track(o,at,()=>g.disconnect());o.stop(at+.065);}
const motifs=[
 [74,null,76,null,79,null,81,79,76,null,74,null,71,null,74,null],
 [74,null,79,null,81,null,83,null,81,79,76,null,74,null,null,null],
 [79,null,81,79,76,null,74,null,71,null,74,null,76,null,79,null],
 [81,null,79,null,76,null,74,null,71,null,69,null,71,74,null,null],
 [86,null,83,null,81,null,79,81,83,null,81,null,79,null,76,null],
 [79,null,81,null,83,null,86,null,83,81,79,null,76,null,74,null],
 [76,null,79,81,79,null,76,null,74,null,71,null,74,null,76,null],
 [79,null,76,null,74,null,71,null,69,null,71,null,74,null,null,null]
];
function schedule(){if(!ac||!enabled||!['playing','countdown'].includes(state)||ac.state!=='running')return;while(next<ac.currentTime+.13){const bar=Math.floor(step/16)%16,n=step%16,note=motifs[bar%8][n],t=next;if(note!==null)pluck(note,t,bar>=8?.61:.70);if(n===0||n===8)drum(t,true);if(n===4||n===12)drum(t,false);if(n%2===0)wood(t,n===6||n===14);if(n===0&&bar%2===0)flute([74,79,81,76][Math.floor(bar/2)%4]+12,t,1.1,.13);if(n===8&&bar>=8)flute([81,79,76,74][bar%4],t,.72,.10);step++;scheduled++;next+=sixteenth;}}
function silence(){if(timer){clearInterval(timer);timer=null;}if(ac){for(const s of voices){try{s.stop(ac.currentTime+.025);}catch{}}if(echo)echo.gain.setTargetAtTime(0,ac.currentTime,.025);}}
function synchronize(){if(!ac)return;if(enabled&&['playing','countdown'].includes(state)&&ac.state==='running'){if(timer)return;echo.gain.setTargetAtTime(.20,ac.currentTime,.1);next=ac.currentTime+.065;timer=setInterval(schedule,25);schedule();}else silence();}
async function unlock(on=true){enabled=on;if(!init())return false;try{if(ac.state==='suspended')await ac.resume();master.gain.setTargetAtTime(enabled?.75:0,ac.currentTime,.05);synchronize();return ac.state==='running';}catch{return false;}}
function setEnabled(on){enabled=!!on;if(ac)master.gain.setTargetAtTime(enabled?.75:0,ac.currentTime,.035);if(enabled)unlock(true);else silence();}
function setState(s){state=s;synchronize();}
function fx(type){if(!enabled||!ac||ac.state!=='running')return;const t=ac.currentTime,o=ac.createOscillator(),tone={coin:[960,1400,.085],jump:[230,480,.16],hit:[135,65,.18],win:[540,1080,.45],mochi:[440,880,.15],tap:[330,440,.06]}[type]||[330,440,.06],g=envelope(fxBus,t,type==='hit'?.38:.25,.004,tone[2]);o.type=type==='hit'?'triangle':'sine';o.frequency.setValueAtTime(tone[0],t);o.frequency.exponentialRampToValueAtTime(tone[1],t+tone[2]);o.connect(g);track(o,t,()=>g.disconnect());o.stop(t+tone[2]+.015);}
document.addEventListener('visibilitychange',()=>{if(document.hidden){silence();}else synchronize();});
window.KitsuAudio={unlock,setEnabled,setState,fx,stats:()=>({enabled,state,playing:!!timer,contextState:ac?.state||'not-started',voices:voices.size,scheduledSteps:scheduled,bpm:126,original:true})};
})();
