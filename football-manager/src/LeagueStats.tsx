import { useMemo, useState } from 'react';
import type { GameState } from './game.ts';
import { LEAGUES } from './world.ts';
import { STAT_CATS, leaderboard, statSeasons, teamBoard, type StatCat } from './leaguestats.ts';

const mv = (k: number) => (k >= 1000 ? `£${(k / 1000).toFixed(1)}m` : `£${k}k`);
const fmt = (cat: StatCat, v: number) => (cat === 'rating' ? v.toFixed(1) : String(v));

/** 3.5: league leaderboards (FotMob-style category chips, FBref/Transfermarkt-style rows). */
export function LeagueStats({ state, onOpen }: { state: GameState; onOpen: (id: string) => void }) {
  const mine = state.clubs.find((c) => c.id === state.clubId)?.division ?? 1;
  const [scope, setScope] = useState<'mine' | 'all' | number>('mine');
  const [cat, setCat] = useState<StatCat | 'gf' | 'ga'>('goals');
  const seasons = statSeasons(state);
  const [season, setSeason] = useState(state.season);
  const division = scope === 'mine' ? mine : scope === 'all' ? undefined : scope;
  const team = cat === 'gf' || cat === 'ga';
  const rows = useMemo(() => (team ? [] : leaderboard(state, cat as StatCat, { division, season }, 20)), [state, cat, division, season, team]);
  const teams = useMemo(() => (team ? teamBoard(state, cat as 'gf' | 'ga', { division }) : []), [state, cat, division, team]);
  const label = team ? (cat === 'gf' ? 'Team goals for' : 'Fewest goals against') : STAT_CATS.find((c) => c.id === cat)!.label;
  const lname = (d: number) => LEAGUES.find((l) => l.division === d)?.name ?? `League ${d}`;
  return (
    <section className="card lstats">
      <div className="ls-head">
        <div>
          <span className="eyebrow">LEAGUE LEADERS</span>
          <h3>{label}</h3>
          <p className="muted small">{division === undefined ? 'All leagues' : lname(division)} · Season {season}{season !== state.season ? ' (final)' : ''}</p>
        </div>
        {seasons.length > 1 && !team && (
          <select aria-label="Season" value={season} onChange={(e) => setSeason(+e.target.value)}>
            {seasons.map((x) => <option key={x} value={x}>Season {x}{x === state.season ? ' (now)' : ''}</option>)}
          </select>
        )}
      </div>
      <div className="ls-scope" role="tablist">
        <button className={scope === 'mine' ? 'on' : ''} onClick={() => setScope('mine')}>My league</button>
        <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>All leagues</button>
        <select aria-label="League" value={typeof scope === 'number' ? scope : ''} onChange={(e) => setScope(+e.target.value)}>
          <option value="" disabled>Pick a league…</option>
          {LEAGUES.map((l) => <option key={l.division} value={l.division}>{l.flag} {l.name}</option>)}
        </select>
      </div>
      <div className="ls-cats">
        {STAT_CATS.map((c) => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.short}</button>)}
        <button className={cat === 'gf' ? 'on' : ''} onClick={() => setCat('gf')}>Team GF</button>
        <button className={cat === 'ga' ? 'on' : ''} onClick={() => setCat('ga')}>Team GA</button>
      </div>
      {team ? (
        <ol className="ls-list">
          {teams.map((t, i) => (
            <li key={t.id} className={t.id === state.clubId ? 'me' : ''}>
              <span className="ls-rank">{i + 1}</span>
              <span className="ls-who"><b>{t.name}</b><small>{lname(t.division)} · {t.played} played</small></span>
              <span className="ls-val">{t.value}</span>
            </li>
          ))}
        </ol>
      ) : rows.length === 0 ? (
        <p className="empty-note">📊 No numbers yet — play a league match and the leaderboards fill up.</p>
      ) : (
        <ol className="ls-list">
          {rows.map((r, i) => (
            <li key={r.id} className={r.clubId === state.clubId ? 'me' : ''}>
              <button type="button" className="ls-row" data-pid={r.player ? r.id : undefined} disabled={!r.player} onClick={() => r.player && onOpen(r.id)}>
                <span className="ls-rank">{i + 1}</span>
                <span className="ls-who"><b>{r.name}</b><small>{r.club}</small><small>{r.position} · {r.age}y · <span className="mv">MV {mv(r.player?.price ?? r.price)}</span></small></span>
                <span className="ls-val">{fmt(cat as StatCat, r.value)}<small>{r.apps} apps</small></span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
