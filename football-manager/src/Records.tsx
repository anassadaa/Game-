import type { GameState } from './game.ts';
import { leagueName } from './world.ts';
import { ACHIEVEMENTS } from './records.ts';

export function RecordsCard({ state }: { state: GameState }) {
  const r = state.records, have = new Map((state.achievements ?? []).map((a) => [a.id, a.season]));
  const sc = (x?: { us: number; them: number; opp: string; season: number }) => (x ? `${x.us}–${x.them} vs ${x.opp} (S${x.season})` : '—');
  const rows: [string, string][] = [
    ['Biggest win', sc(r?.bigWin)],
    ['Heaviest defeat', sc(r?.bigLoss)],
    ['Longest winning run', `${r?.bestWinRun ?? 0}`],
    ['Longest unbeaten run', `${r?.bestUnbeaten ?? 0}`],
    ['Most league points', r?.mostPoints ? `${r.mostPoints.pts} (S${r.mostPoints.season})` : '—'],
    ['Best finish', r?.bestFinish ? `${r.bestFinish.pos}${['st', 'nd', 'rd'][r.bestFinish.pos - 1] ?? 'th'} · ${leagueName(r.bestFinish.division)} (S${r.bestFinish.season})` : '—'],
  ];
  return (
    <section className="card records-card">
      <span className="eyebrow">📜 CLUB RECORDS</span>
      <dl className="rec-list">{rows.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}</dl>
      <h3>Achievements · {have.size}/{ACHIEVEMENTS.length}</h3>
      <div className="ach-grid">
        {ACHIEVEMENTS.map((a) => (
          <div key={a.id} className={`ach ${have.has(a.id) ? 'on' : 'off'}`} title={a.desc}>
            <span className="ach-i">{have.has(a.id) ? a.icon : '🔒'}</span>
            <b>{a.title}</b><small>{have.has(a.id) ? `Season ${have.get(a.id)}` : a.desc}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
import { legacy, seasonHighlights } from './hof.ts';
export function HallCard({ state }: { state: GameState }) {
  const l = legacy(state), hof = state.hof ?? [];
  return (
    <section className="card hof-card">
      <span className="eyebrow">🏛️ HALL OF FAME</span>
      <h3>{l.tier} · {l.score} legacy pts</h3>
      {l.next && <div className="hof-bar"><i style={{ width: `${Math.min(100, (l.score / l.next) * 100)}%` }} /></div>}
      <p className="small">{l.next ? `${l.next - l.score} pts to the next tier. ` : ''}Wins, trophies, achievements and legends all count.</p>
      {hof.length ? (
        <ul className="hof-list">{hof.map((h) => (<li key={h.id}><b>{h.name}</b><span>{h.position} · {h.apps} apps · {h.goals} goals · in S{h.season}</span></li>))}</ul>
      ) : (<p className="small">No legends yet: players join after 80 appearances, or 40 goals.</p>)}
    </section>
  );
}
export function SeasonHighlights({ state, season }: { state: GameState; season: number }) {
  const h = seasonHighlights(state, season);
  const items = [
    ...h.trophies.map((t) => `🏆 ${t}`),
    ...h.achievements.map((a) => `${a.icon} ${a.title}`),
    ...h.legends.map((n) => `🏛️ ${n} joins the Hall of Fame`),
    ...h.awards.map((a) => `🏅 ${a.award}: ${a.player}`),
  ];
  if (!items.length) return null;
  return <ul className="review-hl">{items.map((x) => <li key={x}>{x}</li>)}</ul>;
}
