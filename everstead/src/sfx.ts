// Tiny WebAudio sound effects and ambient music; no external assets.
// Mobile browsers (Android Chrome, iOS Safari) only allow audio after a user
// gesture, so the context is created and resumed on the first tap/key press.
let ctx:AudioContext|null=null;let master:GainNode|null=null;
const KEY='everstead-muted',MKEY='everstead-music',VKEY='everstead-volume';
const get=(k:string)=>{try{return localStorage.getItem(k)}catch{return null}};
const put=(k:string,v:string)=>{try{localStorage.setItem(k,v)}catch{}};
export const isMuted=()=>get(KEY)==='1';
export const setMuted=(m:boolean)=>{put(KEY,m?'1':'0');if(m)stopMusic();else if(musicOn())startMusic();};
export const getVolume=()=>{const v=Number(get(VKEY));return get(VKEY)===null||isNaN(v)?80:Math.max(0,Math.min(100,v))};
export const setVolume=(v:number)=>{put(VKEY,String(v));if(master&&ctx)master.gain.setTargetAtTime(v/100,ctx.currentTime,.05);};
export const musicOn=()=>get(MKEY)!=='0';
export const setMusic=(on:boolean)=>{put(MKEY,on?'1':'0');if(on)startMusic();else stopMusic();};
function ensure():AudioContext|null{
 try{if(!ctx){const C=window.AudioContext||(window as any).webkitAudioContext;if(!C)return null;ctx=new C();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-10;comp.knee.value=6;comp.ratio.value=4;comp.attack.value=.003;comp.release.value=.2;master=ctx.createGain();master.gain.value=getVolume()/100;master.connect(comp).connect(ctx.destination);}
  if(ctx.state!=='running')void ctx.resume();return ctx;}catch{return null}}
function unlock(){const c=ensure();if(!c)return;
 // play a silent buffer: required by some Android/iOS builds to fully unlock output
 try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);}catch{}
 if(musicOn()&&!isMuted())startMusic();
 if(c.state==='running')for(const ev of EVENTS)window.removeEventListener(ev,unlock,true);}
const EVENTS=['pointerdown','touchstart','touchend','mousedown','keydown','click'];
if(typeof window!=='undefined')for(const ev of EVENTS)window.addEventListener(ev,unlock,{capture:true,passive:true});
function tone(freq:number,start:number,dur:number,type:OscillatorType='sine',vol=.3){if(!ctx||!master)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;const t=ctx.currentTime+start+.02;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(master);o.onended=()=>{o.disconnect();g.disconnect()};o.start(t);o.stop(t+dur+.05);}
export function play(kind:'build'|'day'|'reward'|'alert'){if(isMuted())return;const c=ensure();if(!c)return;
 const go=()=>{
 if(kind==='build'){tone(180,0,.14,'square',.5);tone(240,.1,.16,'square',.5);tone(360,.2,.25,'triangle',.8);}
 else if(kind==='day'){tone(440,0,.3,'sine',.75);tone(660,.08,.35,'sine',.55);}
 else if(kind==='reward'){[523,659,784,1047].forEach((f,i)=>tone(f,i*.08,.3,'triangle',.8));}
 else{tone(220,0,.25,'sawtooth',.45);tone(196,.22,.35,'sawtooth',.45);}};
 if(c.state==='running')go();else c.resume().then(go,()=>{});}
// Ambient music: soft pentatonic pads + sparse plucks, looping forever.
let music:{gain:GainNode,timer:number}|null=null;
const CHORDS=[[220,277.2,329.6],[196,246.9,293.7],[174.6,220,261.6],[196,246.9,329.6]];
const SCALE=[440,493.9,554.4,659.3,740,880];
export function startMusic(){if(music||isMuted()||!musicOn())return;const c=ensure();if(!c||!master)return;
 const gain=c.createGain();gain.gain.value=0;gain.connect(master);gain.gain.linearRampToValueAtTime(.5,c.currentTime+3);
 let step=0,next=c.currentTime+.1;
 const sched=()=>{while(next<c.currentTime+4){const ch=CHORDS[step%CHORDS.length];
  for(const f of ch){const o=c.createOscillator(),g=c.createGain();o.type='sine';o.frequency.value=f/2;g.gain.setValueAtTime(.0001,next);g.gain.linearRampToValueAtTime(.3,next+1.5);g.gain.linearRampToValueAtTime(.0001,next+4.2);o.onended=()=>{o.disconnect();g.disconnect()};o.connect(g).connect(gain);o.start(next);o.stop(next+4.3);}
  for(let i=0;i<2;i++){const t=next+.5+i*1.7+((step*7+i*3)%5)*.1,f=SCALE[(step*5+i*2)%SCALE.length];const o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=f;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.35,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+1.4);o.onended=()=>{o.disconnect();g.disconnect()};o.connect(g).connect(gain);o.start(t);o.stop(t+1.5);}
  next+=4;step++;}};
 sched();music={gain,timer:window.setInterval(sched,1000)};}
export function stopMusic(){if(!music||!ctx)return;const m=music;music=null;clearInterval(m.timer);m.gain.gain.cancelScheduledValues(ctx.currentTime);m.gain.gain.setValueAtTime(m.gain.gain.value,ctx.currentTime);m.gain.gain.linearRampToValueAtTime(0,ctx.currentTime+.8);setTimeout(()=>m.gain.disconnect(),1000);}
