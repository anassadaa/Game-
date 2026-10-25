import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Building2, Check, ChevronRight, Landmark, Search, ShieldCheck, TrendingUp, Wallet, X } from 'lucide-react';
import type { GameState } from './game.ts';
import { league } from './world.ts';
import { prepareInvestments, marketClubs, quoteTrade, executeTrade, clubDecision, fundClub, repayClubLoan, clubCandidates, hireClubManager, portfolioSummary } from './investments.ts';
import type { ClubAction, PricePoint } from './investments.ts';
import './investments.css';

const money = (n: number) => `${n < 0 ? '−' : ''}£${Math.abs(n) >= 1000 ? `${(Math.abs(n) / 1000).toFixed(2)}m` : `${Math.round(Math.abs(n)).toLocaleString()}k`}`;
type Confirmation = { title: string; lines: string[]; source: GameState; run: (s: GameState) => GameState };
type Up = (s: GameState, message?: string) => void;
function Sparkline({ history, large = false }: { history: PricePoint[]; large?: boolean }) {
  const values = history.map(h => h.value), lo = Math.min(...values), hi = Math.max(...values), range = Math.max(1, hi - lo);
  const points = values.map((v, i) => `${4 + i * 292 / Math.max(1, values.length - 1)},${72 - (v - lo) * 62 / range}`).join(' ');
  const up = values.at(-1)! >= values[0]!;
  return <svg className={`inv-chart ${large ? 'large' : ''} ${up ? 'rising' : 'falling'}`} viewBox="0 0 300 82" role="img" aria-label={`Club valuation history, ${history.length} recorded periods, latest ${money(values.at(-1) ?? 0)}`}><path d="M4 75 H296" className="baseline"/><polyline points={points} fill="none" strokeWidth={large ? 2 : 4}/>{values.length === 1 && <circle cx="4" cy="72" r="4"/>}</svg>;
}

function BudgetInput({ label, value, apply }: { label: string; value: number; apply: (n: number) => void }) {
  const [amount, setAmount] = useState(String(value));
  useEffect(() => setAmount(String(value)), [value]);
  return <form className="inv-budget" onSubmit={e => { e.preventDefault(); apply(Number(amount)); }}><label>{label}<span>£ thousands</span><input type="number" min="0" max="100000" step="10" value={amount} onChange={e => setAmount(e.target.value)}/></label><button className="secondary" type="submit">Set limit</button></form>;
}

export function Investments({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const model = useMemo(() => state.investments ? state : prepareInvestments(state), [state]);
  const clubs = useMemo(() => marketClubs(model), [model]);
  const totals = useMemo(() => portfolioSummary(model), [model]);
  const [view, setView] = useState<'portfolio' | 'market' | 'controlled'>('portfolio');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [shown, setShown] = useState(24);
  const [selected, setSelected] = useState<string | null>(null);
  const [pct, setPct] = useState('5');
  const [fund, setFund] = useState('500');
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDivElement>(null);
  const c = clubs.find(c => c.id === selected);
  const locked = !!state.match;
  const act = (next: GameState, message: string) => {
    if (next === model) { setNotice('That action is unavailable. Check your cash, ownership and club reserves.'); return; }
    setNotice(message); onUpdate(next, message);
  };
  useEffect(() => {
    if (!confirm) return;
    const before = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('button')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setConfirm(null); return; }
      if (e.key !== 'Tab') return;
      const buttons = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input') ?? [])];
      const first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); before?.focus(); };
  }, [confirm]);

  const propose = (title: string, lines: string[], run: (s: GameState) => GameState) => setConfirm({ title, lines, source: model, run });
  const decision = (id: string, action: ClubAction, value?: string | number) => act(clubDecision(model, id, action, value), 'Club decision recorded.');
  const trade = (side: 'buy' | 'sell') => {
    if (!c) return;
    const q = quoteTrade(model, c.id, side, Number(pct));
    if (!q.ok) { setNotice(q.reason); return; }
    propose(`${side === 'buy' ? 'Buy' : 'Sell'} ${q.pct}% of ${c.name}`, [q.reason, `Deal price ${money(q.price)}${q.premium ? ` + control premium ${money(q.premium)}` : ''}. Fees ${money(q.fee)}.`, `${side === 'buy' ? 'Total wallet payment' : 'Net wallet proceeds'}: ${money(q.total)}.`, `Ownership ${q.before}% → ${q.after}%.${q.after >= 51 ? ' You will hold majority control.' : ''}${q.losesControl ? ' You will lose majority decision rights.' : ''}`], s => executeTrade(s, q));
  };
  const funding = (kind: 'loan' | 'equity') => {
    if (!c) return;
    const amount = Number(fund), preview = fundClub(model, c.id, amount, kind);
    if (preview === model) { setNotice('Funding is unavailable. Enter a positive whole amount you can afford; a new equity issuer must be willing to sell.'); return; }
    const after = marketClubs(preview).find(x => x.id === c.id)!;
    propose(kind === 'loan' ? 'Make a shareholder loan' : 'Subscribe to new equity', [`Your wallet pays ${money(amount)} directly into ${c.name}’s bank.`, kind === 'loan' ? 'This is repayable principal, not club income or a guaranteed return.' : `Ownership ${c.stake}% → ${after.stake}%. Existing shareholders are diluted proportionately.`, `Club cash ${money(c.cash)} → ${money(after.cash)}.`, `Your remaining personal cash: ${money(preview.wallet!.cash)}.`], s => fundClub(s, c.id, amount, kind));
  };

  const financing = (action: 'borrow' | 'repay-bank' | 'outside-capital') => {
    if (!c) return;
    const amount = Number(fund), preview = clubDecision(model, c.id, action, amount);
    if (preview === model) { setNotice('This financing is unavailable. Check the club’s credit limit, repayment reserves or investor liquidity.'); return; }
    const after = marketClubs(preview).find(x => x.id === c.id)!;
    propose(action === 'borrow' ? 'Arrange a bank loan' : action === 'repay-bank' ? 'Repay bank principal' : 'Accept outside equity investors', [`Club cash ${money(c.cash)} → ${money(after.cash)}. Bank debt ${money(c.debt)} → ${money(after.debt)}.`, `Your ownership ${c.stake}% → ${after.stake}%.${c.controlled && !after.controlled ? ' You will lose majority control.' : ''}`, 'Your personal wallet is unchanged. Financing is not earned income.', action === 'borrow' ? 'Interest is charged every game week; the club must service its debt.' : action === 'outside-capital' ? 'Existing holders are diluted. The new investors receive their share of future distributions.' : 'At least £500k must remain in the club bank.'], s => clubDecision(s, c.id, action, amount));
  };

  const filtered = clubs.filter(c => (view === 'portfolio' ? c.stake > 0 || c.loan > 0 : view === 'controlled' ? c.controlled : true))
    .filter(c => `${c.name} ${league(c.division).name}`.toLowerCase().includes(query.toLowerCase()))
    .filter(c => filter === 'all' || filter === 'takeover' && c.available + c.stake >= 51 || filter === 'funding' && c.cash < 500 || filter === 'watch' && model.investments!.watch.includes(c.id))
    .sort((a, b) => view === 'market' ? a.value - b.value : b.stake - a.stake || b.value - a.value);

  return <div className="investments">
    <section className="inv-hero">
      <div className="inv-heading"><span className="eyebrow">YOUR FOOTBALL INVESTMENTS</span><span className="inv-version">2.5</span></div>
      <h2>Build a football legacy.</h2><p>Invest in clubs. Earn your influence. Shape their future.</p>
      <div className="inv-wealth"><div><Wallet size={18}/><small>Personal cash</small><strong>{money(totals.cash)}</strong></div><div><TrendingUp size={18}/><small>Equity value · estimated</small><strong>{money(totals.equity)}</strong></div><div><Landmark size={18}/><small>Loan claims</small><strong>{money(totals.loans)}</strong></div><div><Building2 size={18}/><small>Net worth · estimated</small><strong>{money(totals.netWorth)}</strong></div></div>
    </section>
    {locked && <p className="inv-notice">Finish the match before placing deals or changing club decisions.</p>}
    {notice && <p className="inv-notice" role="status">{notice}<button aria-label="Dismiss notice" onClick={() => setNotice('')}><X size={16}/></button></p>}
    {c ? <>
      <button className="text-button inv-back" onClick={() => { setSelected(null); setNotice(''); }}><ArrowLeft size={17}/> Back to investments</button>
      <section className="card inv-detail">
        <div className="inv-club-heading"><span className="inv-crest" style={{ background: c.color }}><Building2 size={26}/></span><div><span className="eyebrow">{league(c.division).name}{c.id === state.clubId ? ' · YOUR CURRENT JOB' : ''}</span><h2>{c.name}</h2><span className={`inv-status ${c.controlled ? 'control' : ''}`}>{c.controlled && <ShieldCheck size={14}/>} {c.status}</span></div><button className="secondary inv-watch" onClick={() => decision(c.id, 'watch')} disabled={locked}>{model.investments!.watch.includes(c.id) ? '★ Watching' : '☆ Watch'}</button></div>
        <div className="inv-stats"><div><small>Club equity valuation</small><b>{money(c.value)}</b></div><div><small>Club cash · separate from you</small><b className={c.cash < 0 ? 'inv-neg' : ''}>{money(c.cash)}</b></div><div><small>Bank debt</small><b>{money(c.debt)}</b></div><div><small>Earned profit · season to date</small><b className={c.profit < 0 ? 'inv-neg' : 'inv-pos'}>{money(c.profit)}</b></div></div>
        <Sparkline history={c.history} large/><p className="inv-reasons">{c.reasons.join(' · ')}</p>
        <div className="inv-ownership"><div><b>You own {c.stake}%</b><span>{c.stake < 51 ? `${51 - c.stake}% more needed for control` : 'Majority decision rights unlocked'}</span></div><div className="inv-ownership-bar"><i style={{ width: `${c.stake}%` }}/></div><small>Other shareholders {100 - c.stake}% · 51% grants strategic control; 50% requires agreement.</small></div>
        <div className="inv-stats"><div><small>Your investment value</small><b>{money(Math.round(c.value * c.stake / 100))}</b></div><div><small>Recorded cost basis*</small><b>{money(c.cost)}</b></div><div><small>Realized trading result</small><b>{money(c.realized)}</b></div><div><small>Loan owed to you</small><b>{money(c.loan)}</b></div></div>
        <p className="muted small">*Legacy holdings start at their migration valuation because the old save did not record purchase prices. Valuation is an estimate; it is not spendable cash.</p>
      </section>
      <div className="inv-columns">
        <section className="card"><span className="eyebrow">BUY OR SELL EXISTING SHARES</span><h3>Negotiate a stake</h3><p className="small">Up to {c.available}% is available to buy. Existing-share deals pay the seller, not the club.</p><label className="inv-input">Stake percentage<input aria-label="Stake percentage" type="number" min="1" max="100" step="1" value={pct} onChange={e => setPct(e.target.value)}/></label><div className="inv-actions"><button className="primary" disabled={locked || c.available < 1} onClick={() => trade('buy')}>Preview purchase <ArrowUpRight size={16}/></button><button className="secondary" disabled={locked || c.stake < 1} onClick={() => trade('sell')}>Preview sale</button></div><p className="muted small">Quotes include fees and any control premium. A large sale needs a buyer with sufficient liquidity.</p></section>
        <section className="card"><span className="eyebrow">PUT MONEY INTO THE CLUB</span><h3>Support its next chapter</h3><label className="inv-input">Amount in £ thousands<input aria-label="Funding amount in thousands" type="number" min="1" step="100" value={fund} onChange={e => setFund(e.target.value)}/></label><div className="inv-actions"><button className="secondary" disabled={locked} onClick={() => funding('loan')}>Preview loan</button><button className="secondary" disabled={locked} onClick={() => funding('equity')}>Preview new equity</button></div>{c.loan > 0 && <button className="text-button" disabled={locked || c.cash < c.loan + 200} onClick={() => propose('Repay your shareholder loan', [`${c.name} pays ${money(c.loan)} from its own bank to your wallet.`, 'At least £200k must remain in the club bank.'], s => repayClubLoan(s, c.id))}>Repay loan · {money(c.loan)}</button>}<p className="muted small">New equity dilutes other holders. Loans remain liabilities. Neither creates earned profit.</p>{c.controlled && <><span className="eyebrow">CLUB FINANCING · SAME AMOUNT ABOVE</span><div className="inv-actions"><button className="secondary" disabled={locked} onClick={() => financing('borrow')}>Bank loan</button><button className="secondary" disabled={locked || c.debt <= 0} onClick={() => financing('repay-bank')}>Repay bank</button><button className="secondary" disabled={locked} onClick={() => financing('outside-capital')}>Outside equity</button></div><p className="muted small">The bank applies a credit limit. Outside investors have finite funds and can dilute your control.</p></>}</section>
      </div>
      {c.controlled ? <>
        <section className="card inv-control"><div className="inv-section-title"><ShieldCheck/><div><span className="eyebrow">MAJORITY OWNER’S OFFICE</span><h3>Your decisions shape this club</h3></div></div>
          <div className="inv-selects">
            <label>Club strategy<select value={c.strategy} disabled={locked} onChange={e => decision(c.id, 'strategy', e.target.value)}><option value="balanced">Balanced development</option><option value="growth">Push for sporting growth</option><option value="youth">Develop the academy</option><option value="stability">Financial stability</option></select></label>
            <label>Responsibility<select value={c.delegation} disabled={locked} onChange={e => decision(c.id, 'delegation', e.target.value)}><option value="auto">Manager acts within limits</option><option value="approval">Major deals need my approval</option><option value="hands-on">Hands-on owner oversight</option></select></label>
            <label>Dividend policy<select value={c.policy} disabled={locked} onChange={e => decision(c.id, 'dividend', e.target.value)}><option value="none">Retain earned profit</option><option value="low">Distribute up to 20% of profit</option><option value="high">Distribute up to 50% of profit</option></select></label>
            <label>Commercial strategy<select value={c.sponsor} disabled={locked} onChange={e => decision(c.id, 'sponsor', e.target.value)}><option value="fixed">Stable sponsorship</option><option value="performance">Performance-linked sponsors</option><option value="youth">Academy partnerships</option></select></label>
            <label>Ticket price level<select value={c.ticket} disabled={locked} onChange={e => decision(c.id, 'ticket', Number(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{'£'.repeat(n)} {n === 3 ? 'Standard' : n < 3 ? 'Affordable' : 'Premium'}</option>)}</select></label>
          </div>
          <div className="inv-selects"><BudgetInput key={`${c.id}-w`} label="Weekly wage limit" value={c.wageLimit} apply={n => decision(c.id, 'wages', n)}/><BudgetInput key={`${c.id}-t`} label="Transfer spending limit" value={c.transferBudget} apply={n => decision(c.id, 'transfers', n)}/></div>
          <p className="muted small">Existing contracts must still be paid. Limits govern new approvals. Dividends require actual profit and cash reserves; they are paid at season end to all shareholders proportionately.</p>
          {c.id === state.clubId && <p className="inv-notice">This is your active football job. Squad, Tactics, Transfers and the Board remain available in their usual screens.</p>}{c.id === state.clubId && state.mode !== 'manager' && <button className="secondary" disabled={locked} onClick={() => propose('Take charge of matchdays', ['You will select the team and play the match yourself. Your ownership is unchanged.', `Manager compensation: ${money((c.manager?.wage ?? 0) * 6)} from the club bank.`], s => clubDecision(s, c.id, 'take-charge'))}>Personally manage this team</button>}
        </section>
        {c.request && <section className="card inv-request"><span className="eyebrow">OWNER DECISION REQUESTED</span><h3>{c.request.type === 'transfer' ? 'Recruitment approval' : 'Funding needed'}</h3><p>{c.request.message}</p><div className="inv-actions">{c.request.type === 'transfer' && <button className="primary" disabled={locked} onClick={() => propose('Approve the transfer', [c.request!.message, 'The buying club pays the selling club. Your wallet is unchanged.'], s => clubDecision(s, c.id, 'approve'))}>Review approval · {money(c.request.cost)}</button>}<button className="secondary" disabled={locked} onClick={() => decision(c.id, 'decline')}>Decline request</button></div></section>}
        <div className="inv-columns"><section className="card"><span className="eyebrow">FIRST-TEAM MANAGEMENT</span><h3>{c.manager?.name ?? 'Caretaker manager'}</h3><p className="small">{c.manager ? `${'★'.repeat(c.manager.rating)} · ${c.manager.style} · ${money(c.manager.wage)}/week` : 'Appoint a manager to give the club direction.'}</p>{c.manager && <button className="text-button inv-neg" disabled={locked} onClick={() => propose('Dismiss the manager', [`Compensation: ${money(c.manager!.wage * 6)} from the club’s bank.`, 'A caretaker will cover until a replacement is appointed.'], s => clubDecision(s, c.id, 'dismiss'))}>Dismiss · compensation applies</button>}<details><summary className="inv-summary">Manager candidates</summary><div className="inv-candidates">{clubCandidates(model, c.id).map(m => <div key={m.id}><div><b>{m.name}</b><small>{'★'.repeat(m.rating)} · {m.style} · {money(m.wage)}/wk</small></div><button className="secondary" disabled={locked || c.manager?.id === m.id} onClick={() => propose(`Appoint ${m.name}`, [`Wage: ${money(m.wage)} per week, paid by ${c.name}.`, `Existing manager compensation: ${money((c.manager?.wage ?? 0) * 6)}.`, c.id === state.clubId ? 'The appointed manager will handle matchdays at your active club.' : 'You keep your current football job and oversee this club as owner.'], s => hireClubManager(s, c.id, m.id))}>{c.manager?.id === m.id ? <Check size={16}/> : 'Hire'}</button></div>)}</div></details></section>
          <section className="card"><span className="eyebrow">INFRASTRUCTURE & DEVELOPMENT</span><h3>Invest beyond the next match</h3>{(['academy', 'scouting', 'stadium'] as const).map(type => { const preview = clubDecision(model, c.id, type), cost = preview === model ? null : c.cash - marketClubs(preview).find(x => x.id === c.id)!.cash; return <div className="inv-project" key={type}><div><b>{type[0]!.toUpperCase() + type.slice(1)}</b><small>Level {c[type]}/5{c.project?.type === type ? ` · ${c.project.weeks} weeks remaining` : ''}</small></div><button className="secondary" disabled={locked || cost === null} onClick={() => propose(`Upgrade the ${type}`, [`Project cost: ${money(cost!)} from the club’s bank.`, 'Construction takes two game weeks and adds continuing upkeep.'], s => clubDecision(s, c.id, type))}>{c[type] === 5 ? 'Complete' : cost === null ? 'Unavailable' : `Build · ${money(cost)}`}</button></div>; })}<p className="muted small">Academy and scouting shape future squad strength; stadium capacity changes gate receipts. Projects take time and money.</p></section></div>
      </> : <section className="card inv-minority"><Landmark/><h3>{c.stake === 50 ? 'Shared control needs agreement' : c.stake >= 25 ? 'A significant voice, not unilateral control' : 'Invest, observe and build your position'}</h3><p>{c.stake >= 25 ? 'You can propose a strategy to the other shareholders. They assess the club’s financial position before accepting. Majority authority unlocks at 51%.' : 'You can read the club’s finances, invest, sell and receive eligible dividends. Strategic decisions unlock when you acquire 51%.'}</p>{c.stake >= 25 && <div className="inv-actions"><button className="secondary" disabled={locked} onClick={() => decision(c.id, 'proposal', 'stability')}>Propose financial stability</button><button className="secondary" disabled={locked} onClick={() => decision(c.id, 'proposal', 'youth')}>Propose academy focus</button></div>}</section>}
      <section className="card"><span className="eyebrow">THIS CLUB’S INVESTMENT HISTORY</span><History entries={model.investments!.log.filter(e => e.clubId === c.id)}/></section>
    </> : <>
      <div className="inv-tabs" role="tablist" aria-label="Investment views">{(['portfolio', 'market', 'controlled'] as const).map(v => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'active' : ''} onClick={() => { setView(v); setShown(24); }}>{v === 'portfolio' ? 'My portfolio' : v === 'market' ? 'Club market' : 'Controlled clubs'}<span>{v === 'portfolio' ? totals.positions.length : v === 'controlled' ? clubs.filter(c => c.controlled).length : clubs.length}</span></button>)}</div>
      <section className="card inv-market"><div className="inv-section-title"><div><span className="eyebrow">{view === 'market' ? 'FIND YOUR NEXT OPPORTUNITY' : view === 'controlled' ? 'YOUR FOOTBALL GROUP' : 'YOUR OWNERSHIP JOURNEY'}</span><h3>{view === 'market' ? 'Every club has a story.' : view === 'controlled' ? 'Lead from the boardroom.' : 'A portfolio with a purpose.'}</h3></div></div><div className="inv-filters"><label className="inv-search"><Search size={18}/><input aria-label="Search investment clubs" placeholder="Search club or league…" value={query} onChange={e => { setQuery(e.target.value); setShown(24); }}/></label><select aria-label="Filter investment clubs" value={filter} onChange={e => { setFilter(e.target.value); setShown(24); }}><option value="all">All opportunities</option><option value="takeover">Control available</option><option value="funding">Seeking funding</option><option value="watch">Watchlist</option></select></div>
        {filtered.length ? <div className="inv-club-list">{filtered.slice(0, shown).map(c => <button className="inv-club-row" key={c.id} onClick={() => { setSelected(c.id); setPct('5'); setNotice(''); }}><span className="inv-crest" style={{ background: c.color }}><Building2 size={21}/></span><div className="inv-row-name"><b>{c.name}</b><small>{league(c.division).name} · {c.controlled ? `${c.stake}% · Control` : c.stake ? `${c.stake}% owned` : c.status}</small><span className={c.profit < 0 ? 'inv-neg' : 'inv-muted'}>{c.cash < 0 ? 'Cash deficit' : c.profit < 0 ? 'Operating loss' : c.profit > 0 ? 'Operating profit' : 'Opening financial year'}</span></div><Sparkline history={c.history}/><div className="inv-row-price"><b>{money(c.value)}</b><small>{c.stake ? `Your stake ${money(Math.round(c.value * c.stake / 100))}` : `1% ≈ ${money(Math.round(c.value / 100))}`}</small></div><ChevronRight size={18}/></button>)}</div> : <div className="inv-empty"><Building2 size={36}/><h3>{query || filter !== 'all' ? 'No clubs match these filters.' : view === 'controlled' ? 'Your first takeover starts here.' : 'Your investment journey starts here.'}</h3><p>Find a club, review its finances and preview a stake purchase. Salary, dividends and sale proceeds fund your personal wallet.</p><button className="primary" onClick={() => { setView('market'); setQuery(''); setFilter('all'); }}>Explore the market</button></div>}
        {filtered.length > shown && <button className="secondary inv-more" onClick={() => setShown(n => n + 24)}>Show more clubs · {filtered.length - shown} remaining</button>}
      </section>
      {view === 'portfolio' && <><section className="card"><div className="inv-stats"><div><small>Recorded investment cost</small><b>{money(totals.cost)}</b></div><div><small>Unrealized equity result</small><b>{money(totals.equity - totals.cost)}</b></div><div><small>Realized trading result</small><b>{money(totals.realized)}</b></div><div><small>Career dividends received</small><b>{money(totals.dividends)}</b></div></div><p className="muted small">Estimated equity can rise or fall. Loans can remain unpaid if a club cannot afford repayment. Legacy cost bases are estimated at migration.</p></section><section className="card"><span className="eyebrow">RECENT INVESTMENT ACTIVITY</span><History entries={model.investments!.log}/></section></>}
    </>}
    {confirm && <div className="modal-backdrop inv-dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) setConfirm(null); }}><div className="investment-modal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="investment-confirm-title"><button className="inv-dialog-close" aria-label="Close" onClick={() => setConfirm(null)}><X/></button><span className="eyebrow">REVIEW BEFORE YOU COMMIT</span><h2 id="investment-confirm-title">{confirm.title}</h2>{confirm.lines.map((line, i) => <p key={i}>{line}</p>)}<div className="inv-actions"><button className="secondary" onClick={() => setConfirm(null)}>Cancel</button><button className="primary" onClick={() => { if (confirm.source !== model) setNotice('The club or your wallet changed. Open a fresh preview before committing.'); else act(confirm.run(model), 'Investment action completed.'); setConfirm(null); }}>Confirm</button></div></div></div>}
  </div>;
}

function History({ entries }: { entries: NonNullable<GameState['investments']>['log'] }) {
  return entries.length ? <ol className="inv-history">{entries.slice(0, 20).map((e, i) => <li key={`${e.season}-${e.week}-${i}`}><small>S{e.season} · W{e.week}</small><span>{e.message}</span>{!!e.amount && <b className={e.amount < 0 ? 'inv-neg' : 'inv-pos'}>{money(e.amount)}</b>}</li>)}</ol> : <p className="muted small">Your purchases, dividends, financing and owner decisions will appear here.</p>;
}
