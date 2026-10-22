import { useState } from 'react';
import type { GameState } from './game.ts';
import { ROLES, assistantAdvice, canHire, compensation, hireStaff, pull, renewStaff, roleLabel, sackStaff, staff, staffBudget, staffCount, staffLimit, staffWages } from './staff.ts';
import type { StaffRole } from './staff.ts';

type Up = (s: GameState, m?: string) => void;
export function StaffRoom({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [role, setRole] = useState<StaffRole | ''>('');
  const [msg, setMsg] = useState('');
  const locked = !!state.match;
  const mine = staff(state);
  const market = (state.staffMarket ?? []).filter((x) => !role || x.role === role);
  const adv = assistantAdvice(state);
  return (
    <section className="card">
      <p className="eyebrow">BACKROOM STAFF · {staffCount(state)}/{staffLimit(state)}</p>
      <h3>Staff</h3>
      <p className="muted small">Wages £{staffWages(state)}k of £{staffBudget(state)}k/wk · your pull {pull(state)} · limit grows with training and medical facilities. Scouts count toward it.</p>
      {adv && <div className="job-result"><b>Assistant's advice</b><p className="small">🗣 {adv.talk}</p><p className="small">🔎 {adv.opposition}</p></div>}
      {!mine.length && <p className="muted small">No staff yet. Hire coaches, a physio, a head of youth and an assistant below.</p>}
      {mine.map((x) => (
        <div key={x.id} className="job-row">
          <span><b>{x.name}</b><br /><small>{roleLabel(x.role)} · {x.rating}/20 · £{x.wage}k/wk · {x.contract}y · rep {x.rep}</small></span>
          <span className="staff-btns">
            <button className="ghost" disabled={locked} onClick={() => onUpdate(renewStaff(state, x.id), `${x.name} extended.`)}>Extend</button>
            <button className="ghost" disabled={locked} onClick={() => onUpdate(sackStaff(state, x.id), `${x.name} sacked.`)}>Sack £{compensation(x)}k</button>
          </span>
        </div>
      ))}
      <p className="eyebrow" style={{ marginTop: 12 }}>STAFF MARKET</p>
      <select className="league-select" aria-label="Filter staff by role" value={role} onChange={(e) => setRole(e.target.value as StaffRole | '')}>
        <option value="">All roles</option>
        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
      </select>
      {market.map((x) => {
        const why = canHire(state, x);
        return (
          <div key={x.id} className="job-row">
            <span><b>{x.name}</b><br /><small>{roleLabel(x.role)} · {x.rating}/20 · £{x.wage}k/wk · {x.contract}y · rep {x.rep}</small><br /><small className="muted">{ROLES.find((r) => r.id === x.role)!.blurb}</small></span>
            <button className="secondary" disabled={locked} onClick={() => { if (why) setMsg(why); else { setMsg(''); onUpdate(hireStaff(state, x.id), `${x.name} hired.`); } }}>{why ? 'Why not?' : 'Hire'}</button>
          </div>
        );
      })}
      {!market.length && <p className="muted small">The market refreshes every four weeks.</p>}
      {msg && <p className="small job-result">{msg}</p>}
    </section>
  );
}
export function AssistantTip({ state }: { state: GameState }) {
  const a = assistantAdvice(state);
  return a ? <p className="small muted">🗣 Assistant: {a.talk}</p> : null;
}
