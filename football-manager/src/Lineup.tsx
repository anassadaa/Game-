import { useState } from 'react';
import type { GameState, Player } from './game.ts';
import { sharpness } from './training.ts';
import { BENCH, autoPick, bench, clearSlot, clearXI, fit, layout, moveTo, placeOf, setSlot, slotsFor, suitability, toggleBench, warnings } from './lineup.ts';

type Up = (s: GameState, m?: string) => void;
const surname = (n: string) => n.split(' ').slice(-1)[0];
const FIT_LABEL = { natural: 'Natural', awkward: 'Awkward', unsuitable: 'Unsuitable' } as const;

/** FM-mobile-style lineup picker: tap a slot, pick from a bottom sheet sorted by suitability. */
export function LineupPicker({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [open, setOpen] = useState<{ kind: 'xi'; i: number } | { kind: 'bench' } | null>(null);
  const locked = !!state.match;
  const slots = slotsFor(state.tactics.formation);
  const xi = layout(state);
  const bn = bench(state);
  const own = state.players.filter((p) => p.clubId === state.clubId);
  const reserves = own.filter((p) => !p.starting && !bn.some((b) => b.id === p.id)).sort((a, b) => b.rating - a.rating);
  const warn = warnings(state);
  const slot = open?.kind === 'xi' ? slots[open.i]! : undefined;
  const list = open?.kind === 'xi'
    ? [...own].sort((a, b) => suitability(b, slot!.pos) - suitability(a, slot!.pos))
    : open ? reserves : [];
  const where = (p: Player) => {
    const j = xi.findIndex((x) => x?.id === p.id);
    return j >= 0 ? `In XI · ${slots[j]!.label}` : bn.some((b) => b.id === p.id) ? 'Bench' : 'Reserve';
  };
  return (
    <section className="card lineup">
      <p className="eyebrow">STARTING XI · {state.tactics.formation}</p>
      <h3>Pick your team</h3>
      <div className="lu-actions">
        <button className="primary lu-big" disabled={locked} onClick={() => onUpdate(autoPick(state), 'Best XI and bench picked.')}>⚡ Auto-pick best XI</button>
        <button className="ghost lu-big" disabled={locked} onClick={() => onUpdate(clearXI(state), 'Lineup cleared. Tap a slot to pick.')}>Clear</button>
      </div>
      <div className="lu-pitch" role="group" aria-label="Formation slots">
        <span className="lu-line half" /><span className="lu-line box-top" /><span className="lu-line box-bottom" />
        {slots.map((sl, i) => {
          const p = xi[i];
          const f = p ? fit(p, sl.pos) : 'natural';
          const bad = p && (p.injured || f !== 'natural');
          return (
            <button key={i} className={`lu-slot ${p ? '' : 'empty'} ${bad ? 'warn' : ''}`} style={{ left: `${sl.x}%`, bottom: `${sl.y}%` }} disabled={locked}
              onClick={() => setOpen({ kind: 'xi', i })} aria-label={`${sl.label}: ${p ? `${p.name}, rating ${p.rating}` : 'empty'}`}>
              <b>{p ? p.rating : '+'}</b>
              <span>{p ? surname(p.name) : sl.label}</span>
              <small>{sl.label}{p?.injured ? ' 🚑' : f !== 'natural' ? ' ⚠️' : ''}</small>
            </button>
          );
        })}
      </div>
      {!!warn.length && (
        <ul className="lu-warn">{warn.map((w) => <li key={w.id}>{w.text}</li>)}</ul>
      )}
      <p className="eyebrow" style={{ marginTop: 14 }}>SUBSTITUTES · {bn.length}/{BENCH}</p>
      <div className="lu-list">
        {bn.map((p) => (
          <div key={p.id} className="lu-row">
            <PlayerInfo p={p} />
            <button className="ghost lu-btn" disabled={locked} onClick={() => onUpdate(toggleBench(state, p.id))}>Remove</button>
          </div>
        ))}
        {bn.length < BENCH && <button className="secondary lu-add" disabled={locked} onClick={() => setOpen({ kind: 'bench' })}>+ Add substitute</button>}
      </div>
      <p className="eyebrow" style={{ marginTop: 14 }}>RESERVES · {reserves.length}</p>
      <div className="lu-list">
        {reserves.map((p) => (
          <div key={p.id} className="lu-row">
            <PlayerInfo p={p} />
            <button className="ghost lu-btn" disabled={locked || bn.length >= BENCH} onClick={() => onUpdate(toggleBench(state, p.id))}>To bench</button>
          </div>
        ))}
      </div>
      {open && (
        <div className="lu-sheet-backdrop" onClick={() => setOpen(null)}>
          <section className="lu-sheet" role="dialog" aria-label={slot ? `Choose ${slot.label}` : 'Choose substitute'} onClick={(e) => e.stopPropagation()}>
            <header>
              <b>{slot ? `Choose ${slot.label}` : 'Add a substitute'}</b>
              <button className="ghost lu-btn" onClick={() => setOpen(null)}>Close</button>
            </header>
            {slot && open.kind === 'xi' && xi[open.i] && (
              <button className="ghost lu-add" onClick={() => { onUpdate(clearSlot(state, open.i)); setOpen(null); }}>Empty this slot</button>
            )}
            <div className="lu-sheet-list">
              {list.map((p) => {
                const f = slot ? fit(p, slot.pos) : undefined;
                const here = open.kind === 'xi' && xi[open.i]?.id === p.id;
                return (
                  <button key={p.id} className={`lu-pick ${here ? 'here' : ''}`} disabled={here}
                    onClick={() => {
                      if (open.kind === 'xi') onUpdate(setSlot(state, open.i, p.id), `${p.name} at ${slot!.label}.`);
                      else onUpdate(toggleBench(state, p.id), `${p.name} on the bench.`);
                      setOpen(null);
                    }}>
                    <PlayerInfo p={p} fitTo={f} where={where(p)} />
                  </button>
                );
              })}
              {!list.length && <p className="muted small">No one available.</p>}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
function PlayerInfo({ p, fitTo, where }: { p: Player; fitTo?: 'natural' | 'awkward' | 'unsuitable'; where?: string }) {
  return (
    <span className="lu-info">
      <span className="lu-rating">{p.rating}</span>
      <span className="lu-name">
        <b>{p.name}</b>
        <small>
          {p.position}{fitTo && <em className={`fit ${fitTo}`}>{FIT_LABEL[fitTo]}</em>}{where ? ` · ${where}` : ''}
          {p.injured ? ` · 🚑 ${p.injured}wk` : ''}
        </small>
        <small className="lu-stats">Fit {p.fitness}% · Sharp {sharpness(p)}% · Morale {p.morale}</small>
      </span>
    </span>
  );
}
/** Squad-tab sheet: put one player into any formation slot, the bench or the reserves. */
export function AssignSheet({ state, playerId, onUpdate, onClose }: { state: GameState; playerId: string; onUpdate: Up; onClose: () => void }) {
  const p = state.players.find((x) => x.id === playerId);
  if (!p) return null;
  const slots = slotsFor(state.tactics.formation), xi = layout(state), here = placeOf(state, p.id);
  const done = (s: GameState, m: string) => { onUpdate(s, m); onClose(); };
  return (
    <div className="lu-sheet-backdrop" onClick={onClose}>
      <section className="lu-sheet" role="dialog" aria-label={`Assign ${p.name}`} onClick={(e) => e.stopPropagation()}>
        <header>
          <span className="lu-info"><span className="lu-rating">{p.rating}</span><span className="lu-name"><b>{p.name}</b><small>{p.position} · now: {here}{p.injured ? ` · 🚑 ${p.injured}wk` : ''}</small></span></span>
          <button className="ghost lu-btn" onClick={onClose}>Close</button>
        </header>
        <div className="lu-sheet-list">
          <p className="eyebrow">STARTING XI · {state.tactics.formation}</p>
          <div className="as-grid">
            {slots.map((sl, i) => {
              const occ = xi[i], f = fit(p, sl.pos), mine = occ?.id === p.id;
              return (
                <button key={i} className={`as-slot ${mine ? 'here' : ''}`} disabled={mine || !!state.match}
                  onClick={() => done(setSlot(state, i, p.id), `${p.name} now plays ${sl.label}${occ ? `; ${occ.name} moves` : ''}.`)}>
                  <b>{sl.label}</b>
                  <em className={`fit ${f}`}>{FIT_LABEL[f]}</em>
                  <small>{mine ? 'Here now' : occ ? `swap ${surname(occ.name)} ${occ.rating}` : 'Empty'}</small>
                </button>
              );
            })}
          </div>
          <div className="lu-actions">
            <button className="secondary lu-big" disabled={here === 'Bench' || !!state.match} onClick={() => done(moveTo(state, p.id, 'bench'), `${p.name} named on the bench.`)}>Bench</button>
            <button className="ghost lu-big" disabled={here === 'Reserve' || !!state.match} onClick={() => done(moveTo(state, p.id, 'reserves'), `${p.name} drops to the reserves.`)}>Reserves</button>
          </div>
        </div>
      </section>
    </div>
  );
}
