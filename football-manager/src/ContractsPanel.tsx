import { useState } from 'react';
import { renewContract, type GameState } from './game.ts';
import { contractRows } from './contracts.ts';
import { RenewTalks } from './RenewTalks.tsx';

const money = (k: number) => (k >= 1000 ? `£${(k / 1000).toFixed(1)}m` : `£${Math.round(k)}k`);

/** 3.9: Squad › Contracts — every deal at a glance; renew anyone early or open talks. */
export function ContractsPanel({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, msg?: string) => void }) {
  const [talks, setTalks] = useState<string | null>(null);
  const rows = contractRows(state);
  const expiring = rows.filter((r) => r.left <= 1).length;
  return (
    <section className="panel contracts-panel">
      <span className="eyebrow">CONTRACTS</span>
      <h2>Squad contracts</h2>
      <p className="muted small">{expiring} expiring this season or next · {money(rows.reduce((a, r) => a + r.wage, 0))}/wk total. Renew early to lock a player in — the longer he has left, the smaller the raise he wants.</p>
      <ul className="contract-list">
        {rows.map((r) => (
          <li key={r.id} className={r.left <= 0 ? 'expiring' : r.left === 1 ? 'soon' : ''}>
            <div className="contract-who">
              <b>{r.name}</b>
              <small>{r.position} · {r.age}y · MV {money(r.mv)}</small>
            </div>
            <div className="contract-terms">
              <span className="contract-left">{r.left}y left</span>
              <small>{money(r.wage)}/wk</small>
            </div>
            <div className="contract-actions">
              <button className="text-button renew-quick" disabled={!r.years || !!state.match}
                onClick={() => { const n = renewContract(state, r.id, r.years); onUpdate(n, n === state ? undefined : `${r.name} signs for ${r.years} years at £${n.players.find((x) => x.id === r.id)?.wage}k/wk.`); }}>
                {r.years ? `Renew ${r.years}y · ${money(r.ask)}` : 'Max length'}
              </button>
              <button className="text-button" onClick={() => setTalks(r.id)}>Talks</button>
            </div>
          </li>
        ))}
      </ul>
      {talks && <RenewTalks state={state} playerId={talks} onUpdate={onUpdate} onClose={() => setTalks(null)} />}
    </section>
  );
}
