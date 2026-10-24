import { useState } from 'react';
import type { GameState } from './game.ts';
import { LEAGUES, leagueName } from './world.ts';
import { APPROACH_LIMIT, APPROACH_WINDOW, applyJob, canApply, jobChance, reputation, resign, stature } from './jobs.ts';
import type { Club } from './game.ts';
import type { JobResult } from './jobs.ts';

type Up = (s: GameState, m?: string) => void;
export function JobCentre({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [res, setRes] = useState<(JobResult & { club: string }) | null>(null);
  const [lg, setLg] = useState(0);
  const [sure, setSure] = useState(false);
  const rep = Math.round(reputation(state));
  const [q, setQ] = useState('');
  const [more, setMore] = useState(false);
  const isVac = (id: string) => (state.vacancies ?? []).some((v) => v.clubId === id);
  const needle = q.trim().toLowerCase();
  const pool = state.clubs
    .filter((c) => c.id !== state.clubId && (!lg || c.division === lg) && (!needle || c.name.toLowerCase().includes(needle) || c.short.toLowerCase().includes(needle)))
    .map((c) => ({ c, ...jobChance(state, c.id), vac: isVac(c.id), why: canApply(state, c.id) }));
  const order = (a: (typeof pool)[0], b: (typeof pool)[0]) => Number(b.vac) - Number(a.vac) || b.chance - a.chance || stature(b.c) - stature(a.c);
  const inRange = pool.filter((x) => stature(x.c) <= rep + 8).sort(order);
  const above = pool.filter((x) => stature(x.c) > rep + 8).sort(order);
  const cap = more ? 200 : 12;
  const row = (x: (typeof pool)[0]) => {
    const c: Club = x.c;
    return (
      <div key={c.id} className={`job-row${x.vac ? ' vacancy' : ''}`}>
        <span><b>{c.name}</b>{x.vac ? <em className="vac-tag"> 🪑 Vacancy</em> : null} · {leagueName(c.division)}<br />
          <small>Stature {stature(c)} · chance <b>{x.chance}%</b> · {x.factors.map((f) => `${f.label} ${f.value >= 0 ? '+' : ''}${f.value}`).join(' · ')}</small></span>
        <span className="job-act">
          <button className="secondary" disabled={!!x.why} title={x.why ?? undefined} onClick={() => { const [n, r] = applyJob(state, c.id); setRes({ ...r, club: c.name }); onUpdate(n, r.ok ? r.reason : undefined); }}>{x.vac ? 'Apply' : 'Approach'}</button>
          {x.why && <small className="job-why">{x.why}</small>}
        </span>
      </div>
    );
  };
  return (
    <section className="card">
      <p className="eyebrow">JOB CENTRE</p>
      <h3>Manager reputation {rep}/100</h3>
      <div className="ffp-bar"><i style={{ width: `${rep}%`, background: '#3e63dd' }} /></div>
      <p className="muted small">Apply for any club. Open jobs (🪑) are easiest. Clubs with a manager only switch if he is under pressure, so a club doing well will almost never say yes. One application per club per season, and at most {APPROACH_LIMIT} approaches for taken jobs every {APPROACH_WINDOW} weeks. A rejected approach can leak to your board.</p>
      <div className="job-filters">
        <input className="job-search" type="search" placeholder="Search clubs" aria-label="Search clubs" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="league-select" aria-label="Filter clubs by league" value={lg} onChange={(e) => setLg(+e.target.value)}>
          <option value={0}>All leagues</option>
          {LEAGUES.map((l) => <option key={l.division} value={l.division}>{l.flag} {l.name}</option>)}
        </select>
      </div>
      <h4 className="job-sec">Within your range ({inRange.length})</h4>
      {!inRange.length && <p className="muted small">No clubs match.</p>}
      <div className="row-list">{inRange.slice(0, cap).map(row)}</div>
      <h4 className="job-sec">Bigger clubs, a long shot ({above.length})</h4>
      <div className="row-list">{above.slice(0, cap).map(row)}</div>
      {(inRange.length > cap || above.length > cap) && <button className="text-button" onClick={() => setMore(true)}>Show all clubs</button>}
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
