import { useEffect, useState } from 'react';
import { haptic, keepAwake } from './native';
import type { GameState } from './game.ts';
import { highlights } from './highlights.ts';
import { Match3D } from './Match3D';

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
/** Floodlit 3D replay. The match engine is unchanged; this only draws it. */
export function Highlights({ state, onSkip }: { state: GameState; onSkip?: () => void }) {
  const [speed, setSpeedRaw] = useState(loadSpeed);
  const setSpeed = (v: number) => {
    setSpeedRaw(v);
    saveSpeed(v);
  };
  const list = highlights(state);
  const e = list[list.length - 1];
  useEffect(() => { void keepAwake(true); return () => void keepAwake(false); }, []);
  useEffect(() => { if (e?.kind === 'goal') void haptic('goal'); }, [e?.minute, e?.kind, e?.text]);
  const complete = !!state.match?.complete;
  useEffect(() => { if (complete) void haptic('whistle'); }, [complete]);
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
  return (
    <div className="hl">
      <Match3D state={state} speed={speed} />
      {!e && <div className="hl-empty">No highlights yet — the sides are still building the move.</div>}
      {controls}
    </div>
  );
}