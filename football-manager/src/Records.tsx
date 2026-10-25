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
