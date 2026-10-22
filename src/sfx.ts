// Tiny WebAudio sound effects; no external assets.
let ctx:AudioContext|null=null;
const KEY='everstead-muted';
export const isMuted=()=>{try{return localStorage.getItem(KEY)==='1'}catch{return false}};
export const setMuted=(m:boolean)=>{try{localStorage.setItem(KEY,m?'1':'0')}catch{}};
function tone(freq:number,start:number,dur:number,type:OscillatorType='sine',vol=.12){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type=type;o.frequency.value=freq;const t=ctx.currentTime+start;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g).connect(ctx.destination);o.start(t);o.stop(t+dur+.02);}
export function play(kind:'build'|'day'|'reward'|'alert'){if(isMuted())return;try{ctx??=new (window.AudioContext||(window as any).webkitAudioContext)();if(ctx.state==='suspended')void ctx.resume();}catch{return;}
 if(kind==='build'){tone(180,0,.12,'square',.08);tone(240,.1,.14,'square',.08);tone(360,.2,.2,'triangle');}
 else if(kind==='day'){tone(440,0,.25,'sine',.07);tone(660,.08,.3,'sine',.05);}
 else if(kind==='reward'){[523,659,784,1047].forEach((f,i)=>tone(f,i*.08,.25,'triangle'));}
 else{tone(220,0,.2,'sawtooth',.06);tone(196,.2,.3,'sawtooth',.06);}}
