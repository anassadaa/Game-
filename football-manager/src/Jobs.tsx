import { useState } from 'react';
import type { GameState } from './game.ts';
import { LEAGUES, leagueName } from './world.ts';
import { applyJob, jobChance, reputation, resign, stature } from './jobs.ts';
import type { JobResult } from './jobs.ts';

type Up = (s: GameState, m?: string) => void;
export function JobCentre({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [res, setRes] = useState<(JobResult & { club: string }) | null>(null);
  const [lg, setLg] = useState(0);
  const [sure, setSure] = useState(false);
  const rep = Math.round(reputation(state));
  const vac = (state.vacancies ?? []).filter((v) => !lg || state.clubs.find((c) => c.id === v.clubId)?.division === lg);
  return (
    <section className="card">
      <p className="eyebrow">JOB CENTRE</p>
      <h3>Manager reputation {rep}/100</h3>
      <div className="ffp-bar"><i style={{ width: `${rep}%`, background: '#3e63dd' }} /></div>
      <p className="muted small">Reputation rises with wins, trophies and beating expectations, and falls with defeats, underperformance and sackings.</p>
      <select className="league-select" aria-label="Filter vacancies by league" value={lg} onChange={(e) => setLg(+e.target.value)}>
        <option value={0}>All leagues</option>
        {LEAGUES.map((l) => <option key={l.division} value={l.division}>{l.flag} {l.name}</option>)}
      </select>
      {!vac.length && <p className="muted small">No vacancies right now. Struggling clubs sack their managers from week 5 onward.</p>}
      <div className="row-list">
        {vac.map((v) => {
          const c = state.clubs.find((x) => x.id === v.clubId)!;
          const { chance, factors } = jobChance(state, c.id);
          const done = state.applied?.includes(c.id);
          return (
            <div key={v.clubId} className="job-row">
              <span><b>{c.name}</b> · {leagueName(c.division)}<br />
                <small>Stature {stature(c)} · chance <b>{chance}%</b> · {factors.map((f) => `${f.label} ${f.value >= 0 ? '+' : ''}${f.value}`).join(' · ')}</small></span>
              <button className="secondary" disabled={!!state.match || done} onClick={() => { const [n, r] = applyJob(state, c.id); setRes({ ...r, club: c.name }); onUpdate(n, r.ok ? r.reason : undefined); }}>{done ? 'Applied' : 'Apply'}</button>
            </div>
          );
        })}
      </div>
      {res && (
        <div className={`job-result ${res.ok ? 'good' : 'bad'}`} role="status">
          <b>{res.club}: {res.ok ? 'Appointed! ✅' : 'Rejected ❌'}</b> ({res.chance}% chance)<br />
          <small>🎙️ Interview: {res.interview}</small><br />
          <small>{res.reason}</small>
        </div>
      )}
      {!state.sacked && (sure
        ? <div className="row-btns"><button className="danger" onClick={() => { setSure(false); onUpdate(resign(state), 'You resigned.'); }}>Confirm resignation</button><button className="ghost" onClick={() => setSure(false)}>Cancel</button></div>
        : <button className="text-button" disabled={!!state.match} onClick={() => setSure(true)}>Resign from {state.clubs.find((c) => c.id === state.clubId)?.short}</button>)}
    </section>
  );
}
