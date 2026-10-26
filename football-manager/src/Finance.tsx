import { commercialWeekly, sponsorDeal, sponsorValue, yearsLeft } from './sponsors.ts';
import { cashLabel } from './BudgetLine.tsx';
import type { GameState } from './game.ts';
import { renewContract } from './game.ts';
import { salaryList, wageBill, wageBreakdown, wageLimit, wageRoom } from './budget.ts';
import { ffpLimit, ffpNet, ledger, totalIn, totalOut } from './finance.ts';

type Up = (s: GameState, m?: string) => void;
export function FinancePanel({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const net = ffpNet(state), limit = ffpLimit(state);
  const pct = Math.max(0, Math.min(100, Math.round((net / limit) * 100)));
  const own = state.players.filter((p) => p.clubId === state.clubId && !p.loan);
  const clauses = own.filter((p) => p.clause);
  const owed = own.filter((p) => p.sellOn);
  const expiring = own.filter((p) => !p.clause && (p.contract ?? 2) <= 1).sort((a, b) => b.rating - a.rating).slice(0, 4);
  const bill = wageBill(state), wl = wageLimit(state), room = wageRoom(state);
  const wpct = Math.min(100, Math.round((bill / wl) * 100));
  return (
    <section className="card" id="finances">
      <p className="eyebrow">BUDGETS</p>
      <h3>Transfer budget {state.budget < 0 ? <span className="neg">£0 · {cashLabel(state.budget)}</span> : `£${state.budget}k`}</h3>
      <div className="wage-budget">
        <p><b>Wage bill £{bill}k / £{wl}k a week</b> · <span className={room < 0 ? 'neg' : 'pos'}>{room >= 0 ? `£${room}k left` : `£${-room}k over budget`}</span></p>
        {(() => { const d = sponsorDeal(state), y = yearsLeft(state); return <p className="small sp-fin">👕 Shirt sponsor: {d ? <><b>{d.name}</b> · £{d.weekly}k/wk · {y} season{y === 1 ? '' : 's'} left</> : <>none signed (market value £{sponsorValue(state).weekly}k/wk)</>} · commercial £{commercialWeekly(state)}k/wk</p>; })()}
        <div className="ffp-bar"><i style={{ width: `${wpct}%`, background: room < 0 ? '#e5484d' : wpct >= 85 ? '#f5a524' : '#30a46c' }} /></div>
        {(() => { const w = wageBreakdown(state); const sign = (n: number) => (n >= 0 ? `+£${n}k` : `−£${-n}k`); return (
        <div className="wage-why">
          <p className="eyebrow">HOW THE BOARD SET IT</p>
          <dl>
            <dt>Income / week</dt><dd>£{w.incomeWk}k</dd>
            <dt>Costs / week (wages, running, signings)</dt><dd>£{w.costsWk}k</dd>
            <dt>Profit / loss per week</dt><dd className={w.pnlWk < 0 ? 'neg' : 'pos'}>{sign(w.pnlWk)}</dd>
            <dt>Share of income for wages</dt><dd>{Math.round(w.share * 100)}%</dd>
            <dt>Bank balance {state.budget < 0 ? '(debt)' : ''}</dt><dd>×{w.balance.toFixed(2)}</dd>
            <dt>Difficulty</dt><dd>×{w.difficulty.toFixed(2)}</dd>
            <dt>Board target</dt><dd><b>£{w.target}k/wk</b></dd>
          </dl>
          <p className="muted small">
            {w.fromHistory ? `Based on ${w.weeks >= 4 ? `this season so far (${w.weeks} weeks) blended with ` : ''}last season's accounts.` : 'No accounts yet, so the board uses projected TV, gate, sponsor and prize money.'}{' '}
            The board gives 62% of income to wages, more when you make a profit and less when you make a loss (55–70%). Cash in the bank raises it, debt cuts it.
            It reviews the budget every 4 weeks and at the start of each season, moving part of the way to the target. The budget is advice only: going over never blocks a deal, but wages come out of your funds every week.
          </p>
        </div>); })()}
        <details className="salary-list" open>
          <summary>Salaries ({salaryList(state).length} players)</summary>
          <div className="row-list">{salaryList(state).map((x) => (
            <div key={x.id} data-pid={x.id}><span>{x.position} <b>{x.name}</b> · {x.years}y left</span><b>£{x.wage}k/wk</b></div>
          ))}</div>
        </details>
      </div>
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

export const IN_LABEL = { gate: 'Matchday gate', tv: 'TV rights', sponsor: 'Sponsorship', prize: 'Prize money', sales: 'Player sales', other: 'Other income', funding: 'Loans & equity funding' } as const;
export const OUT_LABEL = { wages: 'Wages & bonuses', running: 'Staff, scouts & upkeep', signings: 'Signings & upgrades', capital: 'Loan repayments & dividends' } as const;
export function LedgerCard({ state }: { state: GameState }) {
  const l = ledger(state), inc = totalIn(l), out = totalOut(l), net = inc - out;
  const max = Math.max(1, inc, out);
  const peak = Math.max(1, ...l.weeks.map((w) => Math.abs(w.net)));
  return (
    <section className="card ledger-card">
      <p className="eyebrow">FINANCES · SEASON {l.season}</p>
      <h3><span className={state.budget < 0 ? 'neg' : ''}>{state.budget < 0 ? cashLabel(state.budget) : `£${state.budget}k cash`}</span> · <span className={net >= 0 ? 'pos' : 'neg'}>{net >= 0 ? '+' : '−'}£{Math.abs(net)}k</span> net cash flow this season</h3>
      <div className="ledger-bars">
        <div><span>Cash in £{inc}k</span><i className="in" style={{ width: `${(inc / max) * 100}%` }} /></div>
        <div><span>Cash out £{out}k</span><i className="out" style={{ width: `${(out / max) * 100}%` }} /></div>
      </div>
      <div className="ledger-cols">
        <dl>{(Object.keys(IN_LABEL) as (keyof typeof IN_LABEL)[]).filter((k) => l.inc[k]).map((k) => <div key={k}><dt>{IN_LABEL[k]}</dt><dd>£{l.inc[k]}k</dd></div>)}</dl>
        <dl>{(Object.keys(OUT_LABEL) as (keyof typeof OUT_LABEL)[]).filter((k) => l.out[k]).map((k) => <div key={k}><dt>{OUT_LABEL[k]}</dt><dd>£{l.out[k]}k</dd></div>)}</dl>
      </div>
      {!!l.weeks.length && (
        <div className="ledger-weeks" aria-label="Weekly cash flow">
          {l.weeks.map((w) => <i key={w.w} title={`Week ${w.w}: ${w.net >= 0 ? '+' : ''}£${w.net}k`} className={w.net >= 0 ? 'pos' : 'neg'} style={{ height: `${8 + (Math.abs(w.net) / peak) * 40}px` }} />)}
        </div>
      )}
      <p className="muted small">TV money and prize money are paid at season end and rise with league position — finishing higher and keeping wages in check grows the bank.{l.prev ? ` Last season: in £${l.prev.income}k, out £${l.prev.costs}k.` : ''}</p>
    </section>
  );
}
