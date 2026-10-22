import { CUP_PRIZE, CUP_ROUNDS, CUP_WEEKS, EURO_PRIZE, EURO_WEEKS, cupOpponent } from './game.ts';
import type { GameState } from './game.ts';

export function CupPanel({ state, euro = false }: { state: GameState; euro?: boolean }) {
  const c = euro ? state.euro : state.cup;
  const WEEKS = euro ? EURO_WEEKS : CUP_WEEKS,
    PRIZE = euro ? EURO_PRIZE : CUP_PRIZE;
  if (!c) return null;
  const opp = cupOpponent(state, c);
  const inIt = c.alive.includes(state.clubId);
  const name = (id: string) => state.clubs.find((x) => x.id === id)?.short ?? id;
  return (
    <section className="card panel cup-panel">
      <span className="eyebrow">{euro ? '⭐ CHAMPIONS CUP' : 'NATIONAL CUP'} · SEASON {c.season}</span>
      {c.round > 3 ? (
        <h3>🏆 Winners: {name(c.winners[0]?.clubId ?? '')}</h3>
      ) : inIt && opp ? (
        <h3>
          {CUP_ROUNDS[c.round]} vs {opp.name} · week {WEEKS[c.round]! + 1} · win £{PRIZE[c.round]}k
        </h3>
      ) : euro && !inIt && c.round === 0 ? (
        <h3>Not qualified · finish near the top of a big league to enter</h3>
      ) : (
        <h3>Knocked out · {CUP_ROUNDS[c.round]} next in week {WEEKS[c.round]! + 1}</h3>
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
      <small className="muted">Trophies won: {c.wins} · ties are played automatically after the league match.</small>
    </section>
  );
}
