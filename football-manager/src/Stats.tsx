import { useState } from 'react';
import type { GameState, Player } from './game.ts';
import { avgRating } from './highlights.ts';

const COLS: { id: string; label: string; f: (p: Player) => number; fmt?: (n: number) => string }[] = [
  { id: 'apps', label: 'Apps', f: (p) => p.apps ?? 0 },
  { id: 'goals', label: 'Gls', f: (p) => p.goals },
  { id: 'assists', label: 'Ast', f: (p) => p.assists },
  { id: 'avg', label: 'Avg', f: (p) => avgRating(p), fmt: (n) => (n ? n.toFixed(2) : '–') },
  { id: 'motm', label: '★', f: (p) => p.motm ?? 0 },
];
export function StatsPanel({ state }: { state: GameState }) {
  const [sort, setSort] = useState('goals');
  const col = COLS.find((c) => c.id === sort)!;
  const rows = state.players.filter((p) => p.clubId === state.clubId).sort((a, b) => col.f(b) - col.f(a) || b.rating - a.rating).slice(0, 12);
  const trophies = state.trophies ?? [], awards = state.awards ?? [];
  return (
    <>
      <section className="card">
        <p className="eyebrow">TROPHY CABINET</p>
        <h3>{trophies.length ? `${trophies.length} trophies` : 'An empty cabinet — for now'}</h3>
        <div className="cabinet">
          {trophies.map((t, i) => (
            <div key={i} className="trophy">
              <span>🏆</span>
              <b>{t.name}</b>
              <small>Season {t.season} · {t.club}</small>
            </div>
          ))}
        </div>
      </section>
      <section className="card">
        <p className="eyebrow">SEASON STATS</p>
        <table className="stats-t">
          <thead>
            <tr>
              <th>Player</th>
              {COLS.map((c) => (
                <th key={c.id}>
                  <button className={sort === c.id ? 'on' : ''} onClick={() => setSort(c.id)}>{c.label}</button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td><small>{p.position}</small> {p.name}</td>
                {COLS.map((c) => <td key={c.id}>{c.fmt ? c.fmt(c.f(p)) : c.f(p)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        {!!awards.length && (
          <>
            <h3>Awards</h3>
            <div className="row-list">
              {awards.slice(0, 12).map((a, i) => (
                <div key={i}><span>🏅 <b>{a.award}</b> S{a.season}: {a.player} <small>({a.detail})</small></span></div>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
