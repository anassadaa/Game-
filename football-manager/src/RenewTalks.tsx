import { useState } from 'react';
import type { GameState } from './game.ts';
import { offerRenewal, temperament, talksLocked, talksOf, wageDemand } from './contracts.ts';

/** 3.8: contract renewal talks — he names a figure with reasons; you offer, he accepts, counters or walks. */
export function RenewTalks({ state, playerId, clause, onUpdate, onClose }: { state: GameState; playerId: string; clause?: number; onUpdate: (s: GameState, msg?: string) => void; onClose: () => void }) {
  const p = state.players.find((x) => x.id === playerId);
  const [years, setYears] = useState(3);
  const d = p ? wageDemand(state, p, years) : null;
  const ask = d ? (clause ? Math.max(1, Math.round(d.ask * 0.95)) : d.ask) : 1;
  const [wage, setWage] = useState(ask);
  const [reply, setReply] = useState<{ kind: string; text: string } | null>(null);
  if (!p || !d) return null;
  const change = Math.round((ask / Math.max(1, p.wage) - 1) * 100);
  const session = talksOf(state, p.id), locked = talksLocked(state, p.id);
  const counter = session && !session.lockUntil && session.years === years ? session.counter : undefined;
  const tm = temperament(state, p, session?.insults ?? 0);
  const roundsLeft = Math.max(0, tm.rounds - (session && !session.lockUntil ? session.rounds : 0));
  const offer = (amount = wage) => {
    const r = offerRenewal(state, p.id, years, amount, clause);
    setReply({ kind: r.result, text: r.message });
    if (r.state !== state) onUpdate(r.state, r.result === 'accepted' ? r.message : undefined);
    if (r.result === 'accepted') onClose();
  };
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="help-modal renew-talks" role="dialog" aria-label="Contract talks" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" aria-label="Close" onClick={onClose}>×</button>
        <span className="eyebrow">CONTRACT TALKS</span>
        <h2>{p.name}</h2>
        <p className="muted small">{p.age} · {p.position} · {p.rating} ({p.potential} pot) · {p.personality ?? 'Professional'} · {p.contract ?? 0}y left</p>
        <div className="renew-ask">
          <span>Now <b>£{p.wage}k/wk</b></span>
          <span>He asks <b>£{ask}k/wk</b> <em className={change >= 0 ? 'up' : 'down'}>{change >= 0 ? '+' : ''}{change}%</em></span>
        </div>
        <label className="deal-field">Contract: <b>{years} year{years > 1 ? 's' : ''}</b>
          <input type="range" min={1} max={5} value={years} onChange={(e) => { const y = +e.target.value; setYears(y); const n = wageDemand(state, p, y).ask; setWage(clause ? Math.max(1, Math.round(n * 0.95)) : n); }} />
        </label>
        <label className="deal-field">Your offer: <b>£{wage}k/wk</b>
          <input type="range" min={1} max={Math.max(ask * 2, p.wage * 2, 4)} value={wage} onChange={(e) => setWage(+e.target.value)} />
        </label>
        {reply && <p className={`renew-reply ${reply.kind}`}>{reply.text}</p>}
        {locked > 0 && <p className="renew-reply refused">Talks locked for {locked} more week{locked > 1 ? 's' : ''}. Only his full ask (£{ask}k) will sign him.</p>}
        {counter !== undefined && !locked && <div className="renew-counter"><span>His counter: <b>£{counter}k/wk</b></span><button className="secondary" disabled={!!state.match} onClick={() => offer(counter)}>Accept his counter</button></div>}
        {!locked && <p className="muted small">{roundsLeft} round{roundsLeft === 1 ? '' : 's'} left before he walks out.</p>}
        <div className="row-btns">
          <button className="ghost" onClick={() => setWage(Math.max(1, Math.round(wage * 0.95)))}>−5%</button>
          <button className="ghost" onClick={() => setWage(Math.round(wage * 1.05) + 1)}>+5%</button>
          <button className="primary" disabled={!!state.match} onClick={() => offer()}>{locked ? `Pay his ask £${ask}k` : `Offer £${wage}k`}</button>
        </div>
        <details className="renew-why" open>
          <summary>Why this figure</summary>
          <ul>{d.reasons.filter((r) => r.pct !== 0).map((r) => <li key={r.label}><span>{r.label}</span><b className={r.pct > 0 ? 'up' : 'down'}>{r.pct > 0 ? '+' : ''}{r.pct}%</b></li>)}
            {clause ? <li><span>Release clause £{clause}k accepted</span><b className="down">-5%</b></li> : null}</ul>
        </details>
        <details className="renew-why">
          <summary>How he negotiates</summary>
          <ul>{tm.reasons.map((r) => <li key={r}><span>{r}</span></li>)}</ul>
        </details>
      </section>
    </div>
  );
}
