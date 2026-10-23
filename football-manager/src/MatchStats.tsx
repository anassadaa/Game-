import type { GameState } from './game.ts';

export function MatchStatsPanel({ state }: { state: GameState }) {
  const st = state.match?.stats;
  if (!st) return null;
  const rows: [string, number, number][] = [
    ['Possession %', st.poss, 100 - st.poss],
    ['Shots', st.shots[0], st.shots[1]],
    ['On target', st.on[0], st.on[1]],
    ['Fouls', st.fouls[0], st.fouls[1]],
  ];
  return (
    <section className="card match-stats">
      <p className="eyebrow">MATCH STATS</p>
      {rows.map(([k, a, b]) => (
        <div key={k} className="ms-row">
          <b>{a}</b>
          <div className="ms-bar"><i style={{ width: `${a + b ? (a / (a + b)) * 100 : 50}%` }} /></div>
          <b>{b}</b>
          <small>{k}</small>
        </div>
      ))}
    </section>
  );
}
