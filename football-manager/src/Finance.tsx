import type { GameState } from './game.ts';
import { renewContract } from './game.ts';
import { ffpLimit, ffpNet } from './finance.ts';

type Up = (s: GameState, m?: string) => void;
export function FinancePanel({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const net = ffpNet(state), limit = ffpLimit(state);
  const pct = Math.max(0, Math.min(100, Math.round((net / limit) * 100)));
  const own = state.players.filter((p) => p.clubId === state.clubId && !p.loan);
  const clauses = own.filter((p) => p.clause);
  const owed = own.filter((p) => p.sellOn);
  const expiring = own.filter((p) => !p.clause && (p.contract ?? 2) <= 1).sort((a, b) => b.rating - a.rating).slice(0, 4);
  return (
    <section className="card">
      <p className="eyebrow">FINANCIAL FAIR PLAY</p>
      <h3>Net spend £{net}k / £{limit}k</h3>
      <div className="ffp-bar"><i style={{ width: `${pct}%`, background: pct >= 100 ? '#e5484d' : pct >= 75 ? '#f5a524' : '#30a46c' }} /></div>
      <p className="muted small">
        Transfer fees and agent fees count against income from sales. Breaching the limit at season end means a fine, a board warning and a one-season embargo on club signings.
        {state.embargo ? ' ⛔ Embargo active this season.' : ''}{state.ffp?.fines ? ` Lifetime fines £${state.ffp.fines}k.` : ''}
      </p>
      {!!clauses.length && (<><p className="eyebrow">RELEASE CLAUSES</p><div className="row-list">{clauses.map((p) => <div key={p.id}><span>{p.name} · <b>£{p.clause}k</b>{p.clause! <= p.price * 1.6 ? ' · ⚠️ at risk' : ''}</span></div>)}</div></>)}
      {!!expiring.length && (
        <><p className="eyebrow">RENEW WITH A CLAUSE</p>
          <p className="muted small">A release clause makes players accept a smaller raise (+8% instead of +15%), but clubs can trigger it in a window.</p>
          <div className="row-list">{expiring.map((p) => (
            <div key={p.id}><span>{p.name} ({p.rating}) · {p.contract ?? 0}y left</span>
              <span className="row-btns">
                <button className="ghost" disabled={!!state.match} onClick={() => onUpdate(renewContract(state, p.id, 3, Math.round(p.price * 2)), `${p.name} renews with a £${Math.round(p.price * 2)}k clause.`)}>3y · 2x clause</button>
              </span></div>))}</div></>
      )}
      {(!!owed.length || !!state.sellOns?.length) && (
        <><p className="eyebrow">SELL-ON CLAUSES</p><div className="row-list">
          {owed.map((p) => <div key={p.id}><span>We owe {p.sellOn!.pct}% of {p.name}'s next sale to {state.clubs.find((c) => c.id === p.sellOn!.clubId)?.short}</span></div>)}
          {state.sellOns?.map((x) => <div key={x.playerId}><span>We get {x.pct}% when {x.name} moves on</span></div>)}
        </div></>
      )}
    </section>
  );
}
