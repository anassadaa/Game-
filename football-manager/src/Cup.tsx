import { CUP_PRIZE, CUP_ROUNDS, CUP_WEEKS, EURO_PRIZE, EURO_WEEKS, LCUP_PRIZE, LCUP_WEEKS, cupOpponent } from './game.ts';
import type { Cup, GameState } from './game.ts';

export type CupKind = 'cup' | 'euro' | 'lcup';
export const COMPS: Record<CupKind, { title: string; weeks: number[]; prize: number[]; continental: boolean; entry: string }> = {
  cup: { title: 'NATIONAL CUP', weeks: CUP_WEEKS, prize: CUP_PRIZE, continental: false, entry: '' },
  lcup: { title: '🥈 LEAGUE CUP', weeks: LCUP_WEEKS, prize: LCUP_PRIZE, continental: false, entry: '' },
  euro: { title: '⭐ CHAMPIONS CUP', weeks: EURO_WEEKS, prize: EURO_PRIZE, continental: true, entry: 'finish near the top of a big league to enter' },
};

export function CupPanel({ state, euro = false, kind }: { state: GameState; euro?: boolean; kind?: CupKind }) {
  const k: CupKind = kind ?? (euro ? 'euro' : 'cup');
  const meta = COMPS[k];
  const c = state[k] as Cup | undefined;
  const WEEKS = meta.weeks,
    PRIZE = meta.prize;
  if (!c) return null;
  const opp = cupOpponent(state, c);
  const inIt = c.alive.includes(state.clubId);
  const name = (id: string) => state.clubs.find((x) => x.id === id)?.short ?? id;
  return (
    <section className={`card panel cup-panel cup-${k}`}>
      <span className="eyebrow">{meta.title} · SEASON {c.season}</span>
      {c.round > 3 ? (
        <h3>🏆 Winners: {name(c.winners[0]?.clubId ?? '')}</h3>
      ) : inIt && opp ? (
        <h3>
          {CUP_ROUNDS[c.round]} vs {opp.name} · week {WEEKS[c.round]! + 1} · win £{PRIZE[c.round]}k
        </h3>
      ) : meta.continental && !inIt && c.round === 0 ? (
        <h3>Not qualified · {meta.entry}</h3>
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
