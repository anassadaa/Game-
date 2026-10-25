import type { GameState } from './game.ts';
import { ST_DISCOUNTS, TICKET_LEVELS, attendance, canSellSeasonTickets, homeGate, seasonTicketQuote, sellSeasonTickets, setTicketPrice, ticketShare, tickets } from './tickets.ts';

type Up = (s: GameState, m?: string) => void;
export function TicketsCard({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const t = tickets(state), block = canSellSeasonTickets(state), st = t.st?.season === state.season ? t.st : undefined;
  const cur = TICKET_LEVELS[t.price - 1]!;
  return (
    <section className="card tickets-card">
      <span className="eyebrow">🎟️ MATCHDAY</span>
      <h3>Ticket prices · {cur.label}</h3>
      <div className="segmented big-seg" role="radiogroup" aria-label="Ticket price">
        {TICKET_LEVELS.map((l) => (
          <button key={l.id} role="radio" aria-checked={t.price === l.id} className={t.price === l.id ? 'active' : ''} disabled={!!state.match} onClick={() => onUpdate(setTicketPrice(state, l.id), `Tickets: ${l.label}.`)}>{'£'.repeat(l.id)}</button>
        ))}
      </div>
      <p className="muted small">Crowd ~{Math.round(attendance(state) * 100)}% full · home gate ~£{homeGate(state)}k · fans {cur.fans > 0 ? `+${cur.fans}` : cur.fans < 0 ? cur.fans : '±0'} per home game</p>
      <h4>Season tickets</h4>
      {st ? (
        <p className="small">✅ Sold at {st.discount}% off: {Math.round(st.share * 100)}% of seats, £{st.upfront}k banked. Home gates are smaller this season.</p>
      ) : block ? (
        <p className="muted small">{block}.</p>
      ) : (
        <div className="st-grid">
          {ST_DISCOUNTS.map((d) => { const q = seasonTicketQuote(state, d); return (
            <button key={d} className="secondary st-btn" onClick={() => onUpdate(sellSeasonTickets(state, d), `Season tickets on sale at ${d}% off.`)}>
              <b>{d}% off</b><small>£{q.upfront}k now · {Math.round(q.share * 100)}% seats{q.fans ? ` · fans +${q.fans}` : ''}</small>
            </button>); })}
        </div>
      )}
      {!st && !block && <p className="muted small">Cash now, smaller gates later. Bigger discounts sell more and please fans. Share now: {Math.round(ticketShare(state) * 100)}%.</p>}
    </section>
  );
}
import { SPONSOR_TERMS, signSponsor, sponsorDeal, sponsorOffers } from './sponsors.ts';
export function SponsorCard({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const d = sponsorDeal(state);
  return (
    <section className="card sponsor-card">
      <span className="eyebrow">🤝 SHIRT SPONSOR · SEASON {state.season}</span>
      {d ? (
        <><h3>{d.name}</h3><p className="small">£{d.weekly}k a week{d.bonus ? ` · £${d.bonus}k bonus: ${SPONSOR_TERMS[d.kind].replace(/^.*?if /, 'if ')}` : ''}. New offers next season.</p></>
      ) : (
        <>
          <h3>Pick a deal for this season</h3>
          <div className="sp-list">
            {sponsorOffers(state).map((o) => (
              <button key={o.id} className="secondary sp-btn" disabled={!!state.match} onClick={() => onUpdate(signSponsor(state, o.id), `${o.name} signed.`)}>
                <b>{o.name}</b><small>{SPONSOR_TERMS[o.kind]}</small><span>£{o.weekly}k/wk{o.bonus ? ` + £${o.bonus}k bonus` : ''}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
import { fanMood } from './fans.ts';
export function FanCard({ state }: { state: GameState }) {
  const m = fanMood(state), l = state.fanLog?.last;
  return (
    <section className="card fan-card">
      <span className="eyebrow">📣 SUPPORTERS</span>
      <h3><span className="fan-i">{m.icon}</span> {m.label} · {state.fans}/100</h3>
      <div className="hof-bar"><i style={{ width: `${state.fans}%`, background: m.color }} /></div>
      <p className="small">Wins, cheap tickets and keeping promises lift the mood. Below 25 the fans protest and the board lose trust; above 88 they sing your name.</p>
      {l && <p className="small">Last: {l.kind === 'protest' ? '📣 protest' : '🎶 chant'} in season {l.season}, week {l.week + 1}{state.fanLog!.protests ? ` · ${state.fanLog!.protests} protest(s) so far` : ''}.</p>}
    </section>
  );
}
import { scenarioInfo } from './scenario.ts';
export function ScenarioCard({ state }: { state: GameState }) {
  const sc = state.scenario; if (!sc) return null;
  const i = scenarioInfo(sc.id)!;
  const st = sc.status === 'won' ? '✅ Complete' : sc.status === 'failed' ? '❌ Failed' : `⏳ Ends after season ${sc.deadline}`;
  return (
    <section className={`card scenario-card ${sc.status}`}>
      <span className="eyebrow">🎯 CHALLENGE · {i.label.toUpperCase()}</span>
      <h3>{i.goal}</h3>
      <p className="small">{st}</p>
    </section>
  );
}
import { MEETING_ASKS, boardMood, meetingOpen, requestMeeting } from './meeting.ts';
export function MeetingCard({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  if (!state.board) return null;
  const m = state.meeting?.season === state.season ? state.meeting : undefined, open = meetingOpen(state), mood = boardMood(state);
  return (
    <section className="card meeting-card">
      <span className="eyebrow">🏛️ REQUEST A BOARD MEETING</span>
      {m ? (
        <p className="small">Met in week {m.week + 1}: {MEETING_ASKS.find((a) => a.id === m.ask)!.label} — {m.ok ? '✅ agreed' : '❌ refused'}. Next meeting next season.</p>
      ) : open ? (
        <>
          <p className="small">Board mood: <b>{mood >= 60 ? 'Receptive' : 'Cold'}</b> ({mood}). One request per season.</p>
          <div className="pp-list">
            {MEETING_ASKS.map((a) => (
              <button key={a.id} className="secondary pp-btn" onClick={() => onUpdate(requestMeeting(state, a.id), 'Board meeting held.')}>
                <span>{a.label}</span><small>{a.blurb}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="small">The board take meetings between weeks 5 and 15.</p>
      )}
    </section>
  );
}
