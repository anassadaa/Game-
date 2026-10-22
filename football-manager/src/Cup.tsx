import { CUP_PRIZE, CUP_ROUNDS, CUP_WEEKS, cupOpponent } from './game.ts';
import type { GameState } from './game.ts';

export function CupPanel({ state }: { state: GameState }) {
  const c = state.cup;
  if (!c) return null;
  const opp = cupOpponent(state);
  const inIt = c.alive.includes(state.clubId);
  const name = (id: string) => state.clubs.find((x) => x.id === id)?.short ?? id;
  return (
    <section className="card panel cup-panel">
      <span className="eyebrow">KNOCKOUT CUP · SEASON {c.season}</span>
      {c.round > 3 ? (
        <h3>🏆 Winners: {name(c.winners[0]?.clubId ?? '')}</h3>
      ) : inIt && opp ? (
        <h3>
          {CUP_ROUNDS[c.round]} vs {opp.name} · week {CUP_WEEKS[c.round]! + 1} · win £{CUP_PRIZE[c.round]}k
        </h3>
      ) : (
        <h3>Knocked out · {CUP_ROUNDS[c.round]} next in week {CUP_WEEKS[c.round]! + 1}</h3>
      )}
      <div className="cup-bracket">
        {CUP_ROUNDS.map((r, i) => (
          <span key={r} className={i < c.round ? 'done' : i === c.round ? 'now' : ''}>
            {r}
          </span>
        ))}
      </div>
      {c.log.map((l, i) => (
        <p key={i} className="muted">{l}</p>
      ))}
      <small className="muted">Cup trophies won: {c.wins} · ties are played automatically after the league match.</small>
    </section>
  );
}
