import type { GameState } from './game.ts';
import { dismissReview, fixtureList } from './fixtures.ts';
import { leagueName } from './world.ts';

export function FixturesCard({ state }: { state: GameState }) {
  const list = fixtureList(state);
  return (
    <section className="card fixtures-card">
      <div className="section-heading"><div><span className="eyebrow">THE ROAD AHEAD</span><h2>Fixtures & results</h2></div></div>
      <ol className="fixture-list">
        {list.map((f) => (
          <li key={f.week} className={f.current ? 'current' : ''}>
            <span className="fx-week">W{f.week + 1}</span>
            <span className="fx-ha">{f.home ? 'H' : 'A'}</span>
            <span className="fx-opp">{f.oppName}</span>
            {f.result ? (
              <b className={`fx-res ${f.result.outcome}`}>{f.result.us}–{f.result.them} {f.result.outcome}</b>
            ) : (
              <small className="fx-res">{f.current ? 'Next' : '—'}</small>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function ReviewModal({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const r = state.review;
  if (!r || state.sacked) return null;
  const ord = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10 < 4 ? n % 10 : 0]}`;
  return (
    <div className="modal-backdrop">
      <section className="help-modal review-modal" role="dialog" aria-label="Season review">
        <span className="eyebrow">SEASON {r.season} REVIEW · {leagueName(r.division)}</span>
        <h2>{r.outcome === 'Stayed the course' ? `${ord(r.position)} of ${r.size}` : `${r.outcome} · ${ord(r.position)}`}</h2>
        <div className="review-grid">
          <span>Record<b>{r.wins}W {r.draws}D {r.losses}L</b></span>
          <span>Points<b>{r.points}</b></span>
          <span>Goals<b>{r.gf}–{r.ga}</b></span>
          {r.scorer && <span>Top scorer<b>{r.scorer}</b></span>}
          {r.best && <span>Best win<b>{r.best}</b></span>}
          {r.worst && <span>Worst defeat<b>{r.worst}</b></span>}
        </div>
        <p className="review-verdict">{r.verdict}</p>
        <button className="primary wide" onClick={() => onUpdate(dismissReview(state))}>On to next season</button>
      </section>
    </div>
  );
}
