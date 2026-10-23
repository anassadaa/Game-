import { useEffect, useState } from 'react';
import { haptic, keepAwake } from './native';
import type { GameState } from './game.ts';
import { highlightPath, highlights } from './highlights.ts';

export const SPEEDS = [1, 2, 4, 8, 16, 32] as const;
const SPEED_KEY = 'touchline-hl-speed';
export function loadSpeed(): number {
  try {
    const v = Number(localStorage.getItem(SPEED_KEY));
    return (SPEEDS as readonly number[]).includes(v) ? v : 1;
  } catch {
    return 1;
  }
}
function saveSpeed(v: number) {
  try {
    localStorage.setItem(SPEED_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}
/** Tiny 2D replay of the match's chances and goals. */
export function Highlights({ state, onSkip }: { state: GameState; onSkip?: () => void }) {
  const [speed, setSpeedRaw] = useState(loadSpeed);
  const setSpeed = (v: number) => {
    setSpeedRaw(v);
    saveSpeed(v);
  };
  const list = highlights(state);
  const [idx, setIdx] = useState(Math.max(0, list.length - 1));
  const [t, setT] = useState(0);
  useEffect(() => setIdx(Math.max(0, list.length - 1)), [list.length]);
  const e = list[idx];
  useEffect(() => { void keepAwake(true); return () => void keepAwake(false); }, []);
  useEffect(() => { if (e?.kind === 'goal') void haptic('goal'); }, [idx, e?.kind]);
  const complete = !!state.match?.complete;
  useEffect(() => { if (complete) void haptic('whistle'); }, [complete]);
  useEffect(() => {
    setT(0);
    if (!e) return;
    const id = setInterval(() => setT((v) => (v >= 1 ? 1 : Math.min(1, v + 0.02 * speed))), 50);
    return () => clearInterval(id);
  }, [idx, e?.minute, e?.text, speed]);
  useEffect(() => {
    if (t < 1 || idx >= list.length - 1) return;
    const id = setTimeout(() => setIdx((i) => i + 1), 900 / speed);
    return () => clearTimeout(id);
  }, [t, idx, list.length, speed]);
  const controls = (
    <div className="hl-speed" role="group" aria-label="Playback speed">
      {SPEEDS.map((v) => (
        <button key={v} className={v === speed ? 'active' : ''} onClick={() => setSpeed(v)}>
          {v}x
        </button>
      ))}
      {onSkip && !state.match?.complete && (
        <button className="hl-skip" onClick={onSkip}>
          Sim to result ⏭
        </button>
      )}
    </div>
  );
  if (!e) return <div className="hl">{controls}<div className="hl-empty">No highlights yet — chances will replay here.</div></div>;
  const pts = highlightPath(e, idx);
  const seg = Math.min(pts.length - 2, Math.floor(t * (pts.length - 1)));
  const f = t * (pts.length - 1) - seg;
  const a = pts[seg]!, b = pts[seg + 1]!;
  const x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
  const done = t >= 1;
  return (
    <div className="hl">
      <svg viewBox="0 0 100 64" className="hl-pitch" role="img" aria-label="Highlight replay">
        <rect x="0" y="0" width="100" height="64" fill="#1f6b3a" />
        <g stroke="#ffffff88" strokeWidth="0.4" fill="none">
          <rect x="1" y="1" width="98" height="62" />
          <line x1="50" y1="1" x2="50" y2="63" />
          <circle cx="50" cy="32" r="8" />
          <rect x="1" y="18" width="14" height="28" />
          <rect x="85" y="18" width="14" height="28" />
        </g>
        <polyline points={pts.slice(0, seg + 1).map((p) => `${p.x},${p.y * 0.64}`).join(' ') + ` ${x},${y * 0.64}`} stroke={e.side === 'us' ? '#ffd54a' : '#ff6b6b'} strokeWidth="0.6" fill="none" strokeDasharray="1.5 1" />
        {pts.slice(1, -1).map((p, i) => <circle key={i} cx={p.x} cy={p.y * 0.64} r="1.6" fill={e.side === 'us' ? '#2f80ed' : '#e14d4d'} />)}
        <circle cx={x} cy={y * 0.64} r="1.2" fill="#fff" />
        {done && e.kind === 'goal' && <text x="50" y="12" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="800">GOAL!</text>}
      </svg>
      <div className="hl-bar">
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} disabled={idx === 0} aria-label="Previous highlight">‹</button>
        <small>{e.minute}′ {e.text}</small>
        <button onClick={() => setIdx((i) => Math.min(list.length - 1, i + 1))} disabled={idx >= list.length - 1} aria-label="Next highlight">›</button>
      </div>
      {controls}
    </div>
  );
}
