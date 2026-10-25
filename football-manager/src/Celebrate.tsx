import { useEffect, useState } from 'react';
import { confetti, type Celebration } from './fun.ts';
import { haptic } from './native';

const SOUND_KEY = 'touchline-sound';
export const soundOn = () => { try { return localStorage.getItem(SOUND_KEY) === '1'; } catch { return false; } };
export const setSound = (on: boolean) => { try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch { /* ignore */ } };

/** Short synthesized fanfare; only when the player switched sound on. */
export function chime(big = false) {
  if (!soundOn()) return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    (big ? [523, 659, 784, 1046] : [659, 880]).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = f; o.type = 'triangle';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.12 + 0.3);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.12); o.stop(ctx.currentTime + i * 0.12 + 0.32);
    });
    setTimeout(() => void ctx.close(), 1500);
  } catch { /* audio unavailable */ }
}

export function Celebrate({ items, onDone }: { items: Celebration[]; onDone: () => void }) {
  const c = items[0];
  const [sound, setS] = useState(soundOn);
  useEffect(() => {
    if (!c) return;
    chime(c.big); void haptic('goal');
    const id = setTimeout(onDone, c.big ? 4200 : 2400);
    return () => clearTimeout(id);
  }, [c?.title, c?.text]);
  if (!c) return null;
  return (
    <div className={`celebrate ${c.big ? 'big' : 'small'}`} role="status" aria-live="polite" onClick={onDone}>
      {c.big && <div className="confetti" aria-hidden="true">{confetti(c.title + c.text).map((p, i) => <i key={i} style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, background: `hsl(${p.hue} 85% 55%)`, transform: `rotate(${p.rot}deg)` }} />)}</div>}
      <div className="celebrate-card" onClick={(e) => e.stopPropagation()}>
        <h3>{c.title}</h3>
        <p>{c.text}</p>
        <div className="celebrate-row">
          <button className="text-button" onClick={() => { setSound(!sound); setS(!sound); }} aria-pressed={sound}>{sound ? '🔊 Sound on' : '🔈 Sound off'}</button>
          <button className="primary" onClick={onDone}>{items.length > 1 ? 'Next' : 'Brilliant'}</button>
        </div>
      </div>
    </div>
  );
}
