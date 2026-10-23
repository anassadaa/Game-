import { useState } from 'react';
import type { GameState, Player } from './game.ts';
import { acceptBid, rejectBid } from './game.ts';
import { BudgetLine } from './BudgetLine.tsx';
import { offerBlock } from './budget.ts';
import { agentMsgs, agentText, ceiling, counterBid, declineMsg, findPlayer, freeAsk, signFreeAgent } from './agents.ts';

type Up = (s: GameState, m?: string) => void;
/** Home-tab inbox: agent pitches, free-agent approaches and AI bids for your players. */
export function Inbox({ state, onUpdate, onTalks }: { state: GameState; onUpdate: Up; onTalks: (p: Player, wage: number) => void }) {
  const [counter, setCounter] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const locked = !!state.match;
  const msgs = agentMsgs(state);
  const bids = state.bids ?? [];
  const say = (r: [GameState, string]) => { setMsg(r[1]); onUpdate(r[0], r[1]); };
  return (
    <section className="card inbox">
      <p className="eyebrow">INBOX · {msgs.length + bids.length}</p>
      <h3>Agents &amp; offers</h3>
      {!msgs.length && !bids.length && <p className="muted small">No messages. Agents get in touch more as your reputation grows.</p>}
      {bids.map((b) => {
        const p = state.players.find((x) => x.id === b.playerId);
        if (!p) return null;
        const buyer = state.clubs.find((c) => c.id === b.clubId)?.name ?? b.clubId;
        const v = counter[b.id] ?? String(Math.round(b.fee * 1.2));
        return (
          <div key={b.id} className="job-row inbox-msg">
            <span>💰 <b>{buyer}</b> offer <b>£{b.fee}k</b> for {p.name}<br /><small>{p.position} {p.rating} · value £{p.price}k</small></span>
            <span className="staff-btns">
              <button className="secondary" disabled={locked} onClick={() => say(acceptBid(state, b.id))}>Accept</button>
              <button className="ghost" disabled={locked} onClick={() => { setMsg('Bid rejected.'); onUpdate(rejectBid(state, b.id), 'Bid rejected.'); }}>Reject</button>
              <input className="counter-input" inputMode="numeric" aria-label={`Counter fee for ${p.name}`} value={v} onChange={(e) => setCounter({ ...counter, [b.id]: e.target.value.replace(/\D/g, '') })} />
              <button className="ghost" disabled={locked || !+v} onClick={() => say(counterBid(state, b.id, +v))}>Counter</button>
            </span>
          </div>
        );
      })}
      {msgs.map((m) => {
        const p = findPlayer(state, m.playerId);
        if (!p) return null;
        return (
          <div key={m.id} className="job-row inbox-msg">
            <span>{m.kind === 'agent' ? '📞' : '✉️'} {agentText(state, m)}<br /><small>{p.position} {p.rating} · age {p.age}{m.kind === 'free' ? ' · no transfer fee' : ''}</small></span>
            <span className="staff-btns">
              <button className="secondary" disabled={locked} onClick={() => m.kind === 'agent' ? onTalks(p, m.wage) : say(signFreeAgent(state, p.id, { wage: m.wage, years: 2, bonus: 0 }))}>{m.kind === 'agent' ? 'Open talks' : 'Sign'}</button>
              <button className="ghost" disabled={locked} onClick={() => onUpdate(declineMsg(state, m.id), 'Declined.')}>Decline</button>
            </span>
          </div>
        );
      })}
      {msg && !open && <p className="small job-result">{msg}</p>}
    </section>
  );
}
/** Free agents: released players plus the pool. No fee, only wages and a signing bonus. */
export function FreeAgents({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [open, setOpen] = useState('');
  const [o, setO] = useState({ wage: '0', years: '2', bonus: '0' });
  const [msg, setMsg] = useState('');
  const locked = !!state.match;
  const cap = ceiling(state);
  const list = [...state.market].sort((a, b) => b.rating - a.rating);
  return (
    <section className="card">
      <p className="eyebrow">FREE AGENTS · {list.length}</p>
      <h3>Free agents</h3>
      <p className="muted small">No transfer fee: just wages and a signing bonus. Players rated above about {cap + 3} won't consider you yet.</p>
      {list.map((p) => (
        <div key={p.id} className="job-row" style={{ flexWrap: 'wrap' }}>
          <span><b>{p.name}</b>{p.released && <small className="muted"> · released</small>}<br /><small>{p.position} {p.rating} · age {p.age} · wants ~£{freeAsk(state, p)}k/wk</small></span>
          <button className="secondary" disabled={locked} title={locked ? 'Not during a match' : undefined} onClick={() => { setOpen(open === p.id ? '' : p.id); setMsg(''); setO({ wage: String(freeAsk(state, p)), years: '2', bonus: '0' }); }}>{open === p.id ? 'Close' : 'Offer'}</button>
          {open === p.id && (
            <div className="free-offer">
              <label>Wage £k/wk<input inputMode="numeric" value={o.wage} onChange={(e) => setO({ ...o, wage: e.target.value.replace(/\D/g, '') })} /></label>
              <label>Years<select value={o.years} onChange={(e) => setO({ ...o, years: e.target.value })}>{[1, 2, 3, 4, 5].map((y) => <option key={y}>{y}</option>)}</select></label>
              <label>Bonus £k<input inputMode="numeric" value={o.bonus} onChange={(e) => setO({ ...o, bonus: e.target.value.replace(/\D/g, '') })} /></label>
              {(() => { const why = offerBlock(state, p, 0) ?? (+o.bonus > state.budget ? `Over budget by £${+o.bonus - state.budget}k` : !(+o.wage > 0) ? 'Enter a wage' : null); return (<>
              <BudgetLine state={state} extraWage={+o.wage || 0} />
              {why && <p className="offer-why" role="alert">⛔ {why}</p>}
              <button className="secondary" disabled={!!why} onClick={() => { const r = signFreeAgent(state, p.id, { wage: +o.wage, years: +o.years, bonus: +o.bonus }); setMsg(r[1]); if (r[0] !== state) { setOpen(''); onUpdate(r[0], r[1]); } }}>{why ? `Can't submit: ${why}` : 'Submit offer'}</button>
              {msg && <p className="small job-result" role="status">{msg}</p>}
              </>); })()}
            </div>
          )}
        </div>
      ))}
      {msg && !open && <p className="small job-result">{msg}</p>}
    </section>
  );
}
