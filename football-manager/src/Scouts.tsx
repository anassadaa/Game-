import { useState } from 'react';
import type { GameState } from './game.ts';
import { MAX_SCOUTS, REGIONS, fireScout, hireScout, moveScout, scoutWage } from './scouts.ts';

type Up = (s: GameState, m?: string) => void;
export function ScoutsPanel({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [region, setRegion] = useState(REGIONS[0]!);
  const [sort, setSort] = useState<'xg90' | 'xa90' | 'week'>('xg90');
  const scouts = state.scouts ?? [];
  const reps = [...(state.scoutReports ?? [])].sort((a, b) => (sort === 'week' ? b.season * 100 + b.week - (a.season * 100 + a.week) : b[sort] - a[sort]));
  const locked = !!state.match;
  return (
    <section className="card">
      <p className="eyebrow">REGIONAL SCOUTS · {scouts.length}/{MAX_SCOUTS}</p>
      <h3>Scouting network</h3>
      {scouts.map((sc) => (
        <div key={sc.id} className="scout-row">
          <span><b>{sc.name}</b> <small>{'★'.repeat(sc.skill)} · £{scoutWage(sc.skill)}k/wk</small></span>
          <select aria-label={`Region for ${sc.name}`} disabled={locked} value={sc.region} onChange={(e) => onUpdate(moveScout(state, sc.id, e.target.value))}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="ghost" disabled={locked} onClick={() => onUpdate(fireScout(state, sc.id))}>Release</button>
        </div>
      ))}
      {scouts.length < MAX_SCOUTS && (
        <div className="scout-row">
          <select aria-label="Region for new scout" value={region} onChange={(e) => setRegion(e.target.value)}>
            {REGIONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <button className="secondary" disabled={locked} onClick={() => onUpdate(hireScout(state, region))}>Hire scout</button>
        </div>
      )}
      <p className="muted small">Each scout files two reports a week. Repeat looks raise knowledge and tighten the xG and rating estimates.</p>
      {!!reps.length && (
        <>
          <div className="seg-row">
            {(['xg90', 'xa90', 'week'] as const).map((k) => (
              <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{k === 'xg90' ? 'xG/90' : k === 'xa90' ? 'xA/90' : 'Newest'}</button>
            ))}
          </div>
          <div className="row-list">
            {reps.slice(0, 20).map((r) => {
              const c = state.clubs.find((x) => x.id === r.clubId);
              const p = state.rivals?.find((x) => x.id === r.playerId);
              return (
                <div key={r.playerId}>
                  <span>
                    <b>{r.name}</b> · {p?.position ?? '?'} {p?.age ?? ''}y · {c?.short ?? r.region}<br />
                    <small>xG/90 <b>{r.xg90.toFixed(2)}</b> · xA/90 <b>{r.xa90.toFixed(2)}</b> · OVR {r.est[0]}–{r.est[1]} · {r.verdict} · knowledge {r.knowledge}%</small>
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
