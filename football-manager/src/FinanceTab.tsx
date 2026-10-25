import type { GameState } from './game.ts';
import { cashLabel } from './BudgetLine.tsx';
import { FinancePanel, IN_LABEL, LedgerCard, OUT_LABEL } from './Finance.tsx';
import { wageBill, wageLimit } from './budget.ts';
import { autoBudget, delegated, inRed, plan } from './delegate.ts';
import { compensation, endOf } from './managers.ts';
import { ledger } from './finance.ts';
import { myStake, weeklySalary } from './wallet.ts';

type Up = (s: GameState, m?: string) => void;
const m = (n: number) => (Math.abs(n) >= 1000 ? `£${(n / 1000).toFixed(1)}m` : `£${Math.round(n)}k`);

/** Income vs expenses by category this season, as a single scaled bar chart. */
function CategoryChart({ state }: { state: GameState }) {
  const l = ledger(state);
  const rows = [
    ...(Object.keys(IN_LABEL) as (keyof typeof IN_LABEL)[]).map((k) => ({ k, label: IN_LABEL[k], v: l.inc[k] ?? 0, cls: 'in' })),
    ...(Object.keys(OUT_LABEL) as (keyof typeof OUT_LABEL)[]).map((k) => ({ k, label: OUT_LABEL[k], v: l.out[k] ?? 0, cls: 'out' })),
  ].filter((r) => r.v > 0);
  const max = Math.max(1, ...rows.map((r) => r.v));
  const tin = rows.filter((r) => r.cls === 'in').reduce((a, r) => a + r.v, 0), tout = rows.filter((r) => r.cls === 'out').reduce((a, r) => a + r.v, 0);
  return (
    <section className="card fin-cats">
      <p className="eyebrow">INCOME VS EXPENSES · SEASON {l.season}</p>
      <div className="fin-totals"><span className="pos">In {m(tin)}</span><span className="neg">Out {m(tout)}</span><b className={tin - tout < 0 ? 'neg' : 'pos'}>{tin - tout < 0 ? '−' : '+'}{m(Math.abs(tin - tout))}</b></div>
      {rows.length === 0 ? <p className="muted">Nothing booked yet this season.</p> : (
        <div className="ledger-bars">{rows.map((r) => <div key={r.cls + r.k}><span>{r.label}</span> <b>{m(r.v)}</b><i className={r.cls} style={{ width: `${Math.max(2, Math.round((r.v / max) * 100))}%` }} /></div>)}</div>
      )}
    </section>
  );
}

export function FinanceTab({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const bill = wageBill(state), wl = wageLimit(state);
  const hired = delegated(state) ? state.hiredManager! : null;
  const view = { ...state, mgr: state.mgr && { ...state.mgr, auto: state.mgr.auto && { ...state.mgr.auto } } } as GameState;
  const p = hired ? plan(view) : null, a = hired ? autoBudget(view) : null;
  const mb = state.mgrBook?.season === state.season ? state.mgrBook : undefined;
  const w = state.wallet;
  return (
    <div className="finance-tab">
      <section className="card fin-kpis">
        <p className="eyebrow">BANK · SEASON {state.season} WEEK {state.week}</p>
        <div className="fin-grid">
          <div><span>Bank</span><b className={state.budget < 0 ? 'neg' : ''}>{cashLabel(state.budget)}</b></div>
          <div><span>Wage bill / wk</span><b className={bill > wl ? 'neg' : ''}>£{bill}k / £{wl}k</b></div>
          {p && <div><span>Manager transfer budget</span><b>{m(Math.max(0, p.transfer - p.spent))} left</b></div>}
        </div>
        {inRed(state) && <p className="neg small">In the red: the board has frozen signings and will sell players until the bank and wage bill recover.</p>}
      </section>
      {hired && p && a && (
        <section className="card fin-mgr">
          <p className="eyebrow">MANAGER · {hired.name}</p>
          <dl className="fin-dl">
            <dt>Automatic transfer budget</dt><dd>{m(a.transfer)}</dd>
            <dt>Your modifier</dt><dd>{(p.mod ?? 0) >= 0 ? '+' : ''}{p.mod ?? 0}%</dd>
            <dt>Transfer budget this window</dt><dd>{m(p.transfer)} · spent {m(p.spent)}</dd>
            <dt>Wage budget</dt><dd>£{p.wage}k / wk</dd>
            <dt>Contract</dt><dd>£{hired.wage}k / wk to end of season {endOf(state, hired)}</dd>
            <dt>Cost to sack now</dt><dd>{m(compensation(state, hired))}</dd>
            <dt>Paid to managers this season</dt><dd>{m((mb?.wages ?? 0) + (mb?.comp ?? 0))}{mb?.comp ? ` (incl. ${m(mb.comp)} compensation)` : ''}</dd>
            <dt>Release fees / penalties received</dt><dd className="pos">{m(mb?.fees ?? 0)} this season · {m(state.mgrBook?.feesAll ?? 0)} total</dd>
          </dl>
          <p className="muted small">Change the modifier on the manager card in the Club tab.</p>
        </section>
      )}
      {!hired && state.mgrBook?.feesAll ? <section className="card fin-mgr"><p className="eyebrow">MANAGERS</p><p>Release fees / penalties received: <b className="pos">{m(state.mgrBook.feesAll)}</b></p></section> : null}
      <CategoryChart state={state} />
      <LedgerCard state={state} />
      <FinancePanel state={state} onUpdate={onUpdate} />
      {w && (state.mode ?? 'manager') !== 'manager' && (
        <section className="card fin-wallet">
          <p className="eyebrow">YOUR WALLET</p>
          <div className="fin-grid">
            <div><span>Cash</span><b>{m(w.cash)}</b></div>
            <div><span>Salary / wk</span><b>£{weeklySalary(state)}k</b></div>
            <div><span>Salary earned</span><b>{m(w.salary)}</b></div>
            <div><span>Dividends</span><b>{m(w.dividends)}</b></div>
            <div><span>Your stake</span><b>{myStake(state)}%</b></div>
            {w.loan ? <div><span>Loan to club</span><b>{m(w.loan)}</b></div> : null}
          </div>
        </section>
      )}
    </div>
  );
}
