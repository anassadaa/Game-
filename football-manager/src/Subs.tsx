import { useState } from 'react';
import type { GameState, Player } from './game.ts';
import { copy } from './game.ts';
import { sharpness } from './training.ts';
import { MAX_SUBS, MAX_WINDOWS, TIRED, canSub, makeSub, subAdvice, subsBench, subsUsed, windowsUsed } from './subs.ts';
import { fit, layout, slotsFor } from './lineup.ts';

type Up = (s: GameState, m?: string) => void;
/** Match-centre substitutions: tap the player going off, then the one coming on. */
export function SubsPanel({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [open, setOpen] = useState(false);
  const [off, setOff] = useState<string | null>(null);
  const m = state.match;
  if (!m) return null;
  const used = subsUsed(state), why = canSub(state);
  const xi = layout(state), slots = slotsFor(state.tactics.formation);
  const bench = subsBench(state);
  const offP = state.players.find((p) => p.id === off);
  const advice = subAdvice(state);
  const flagged = state.players.filter((p) => p.clubId === state.clubId && p.starting && (p.injured || p.fitness < TIRED)).length;
  const toggleAuto = () => { const b = copy(state); b.autoSubs = !b.autoSubs; onUpdate(b, b.autoSubs ? 'Auto subs on: the assistant makes changes when you sim.' : 'Auto subs off.'); };
  return (
    <div className="subs-bar">
      {!m.complete && (
        <button className="secondary subs-btn" onClick={() => { setOpen(true); setOff(null); }}>
          🔁 Subs {used}/{MAX_SUBS}{flagged ? ` · ⚠️ ${flagged}` : ''}
        </button>
      )}
      {!m.complete && (m.down ?? []).map((id) => {
        const p = state.players.find((x) => x.id === id && x.starting);
        return p ? <p key={id} className="subs-alert">🚑 {p.name} is injured — sub him off or play on with 10.</p> : null;
      })}
      <label className="subs-auto">
        <input type="checkbox" checked={!!state.autoSubs} onChange={toggleAuto} /> Auto subs when simulating
      </label>
      {open && (
        <div className="lu-sheet-backdrop" onClick={() => setOpen(false)}>
          <section className="lu-sheet" role="dialog" aria-label="Substitutions" onClick={(e) => e.stopPropagation()}>
            <header>
              <b>⏸ {m.minute}′ · Subs {used}/{MAX_SUBS} · windows {windowsUsed(state)}/{MAX_WINDOWS}{m.minute === 45 ? ' (half-time is free)' : ''}</b>
              <button className="ghost lu-btn" onClick={() => setOpen(false)}>Resume</button>
            </header>
            {why && <p className="lu-warn" style={{ listStyle: 'none' }}>{why}</p>}
            {!why && advice.length > 0 && (
              <p className="small muted">🗣 Assistant: {advice.map((a) => `${a.off.name} is ${a.why} — bring on ${a.on.name}`).join('; ')}.</p>
            )}
            <div className="lu-sheet-list">
              <p className="eyebrow">{off ? `COMING ON FOR ${offP?.name.toUpperCase()}` : '1 · TAP THE PLAYER GOING OFF'}</p>
              {!off && xi.map((p, i) => p && (
                <button key={p.id} className="lu-pick" disabled={!!why} onClick={() => setOff(p.id)}>
                  <Row p={p} tag={slots[i]!.label} />
                </button>
              ))}
              {off && (
                <>
                  <button className="ghost lu-add" onClick={() => setOff(null)}>‹ Choose a different player</button>
                  {bench.map((p) => (
                    <button key={p.id} className="lu-pick" onClick={() => { const [b, msg] = makeSub(state, off, p.id); onUpdate(b, msg); setOff(null); if (b !== state) setOpen(false); }}>
                      <Row p={p} tag={offP ? fitLabel(p, offP) : ''} />
                    </button>
                  ))}
                  {!bench.length && <p className="muted small">No one left on the bench.</p>}
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
const fitLabel = (p: Player, off: Player) => ({ natural: 'Natural', awkward: 'Awkward', unsuitable: 'Unsuitable' })[fit(p, off.position)];
function Row({ p, tag }: { p: Player; tag: string }) {
  const tired = p.fitness < TIRED;
  return (
    <span className="lu-info">
      <span className="lu-rating">{p.rating}</span>
      <span className="lu-name">
        <b>{p.name} {p.injured ? '🚑' : tired ? '🔋' : ''}</b>
        <small>{p.position} · {tag}{p.injured ? ' · injured' : tired ? ' · tired' : ''}</small>
        <small className="lu-stats">Fit {Math.round(p.fitness)}% · Sharp {sharpness(p)}% · Morale {p.morale}</small>
      </span>
    </span>
  );
}
