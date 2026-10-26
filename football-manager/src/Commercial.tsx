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
import { useState } from 'react';
import { voteRisk, canHire, fireManager, hireManager, managerCandidates, compensation, contractWage, minYears, endOf, tenure, finalSeason, renewalTerms, renewManager, overperformance, CONTRACT_YEARS, jobAtRisk } from './managers.ts';
export function ManagerCard({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const [offer, setOffer] = useState<{ id: string | null; years: number } | null>(null);
  if ((state.mode ?? 'manager') === 'manager') return null;
  const m = state.hiredManager, busy = !!state.match;
  const cands = managerCandidates(state);
  const target = offer && (offer.id ? cands.find((c) => c.id === offer.id) : m);
  const renewing = !!offer && offer.id === null;
  const terms = (y: number) => (renewing && m ? renewalTerms(state, y, overperformance(state), m).wage : target ? contractWage(target, y) : 0);
  const blocked = (y: number) => !target || (!renewing && y < minYears(target));
  const confirm = () => {
    if (!offer || !target) return;
    const next = renewing ? renewManager(state, offer.years) : hireManager(state, target.id, offer.years);
    if (next !== state) onUpdate(next, renewing ? `${target.name} renewed for ${offer.years} yr.` : `${target.name} hired for ${offer.years} yr.`);
    setOffer(null);
  };
  const due = m ? compensation(state, m) : 0;
  return (
    <section className="card manager-card">
      <span className="eyebrow">🧑‍💼 FIRST-TEAM MANAGER</span>
      {state.mode === 'owner' && <p className="small owner-risk">🗳️ Shareholder vote risk: {voteRisk(state) ? `${voteRisk(state)}% every 4 weeks. Keep the fans happy and investors under 40%.` : 'none (fans OK, investors under 40%).'}</p>}
      {m ? (
        <>
          <h3>{m.name} · {'★'.repeat(m.rating)}{'☆'.repeat(5 - m.rating)}</h3>
          <p className="small">{m.style} {m.formation} · £{m.wage}k/wk</p>
          <div className="mgr-stats mgr-contract">
            <div><b>{tenure(state, m)}</b><small>season{tenure(state, m) > 1 ? 's' : ''} in charge</small></div>
            <div><b>S{endOf(state, m)}</b><small>contract ends</small></div>
            <div><b>£{due}k</b><small>to sack now</small></div>
          </div>
          {finalSeason(state, m) && <p className="small mgr-warn">📄 Final contract season: offer a new deal or he leaves free at season end.</p>}
          <ManagerOffice state={state} onUpdate={onUpdate} />
          <div className="mgr-main-actions">
            {finalSeason(state, m) && <button className="primary big-btn" disabled={busy} onClick={() => setOffer({ id: null, years: 2 })}>Offer contract</button>}
            <button className="secondary big-btn danger-btn" disabled={busy} onClick={() => { if (window.confirm(`Sack ${m.name}? Pays the rest of his contract: £${due}k.`)) onUpdate(fireManager(state), 'Manager sacked.'); }}>Sack · £{due}k</button>
          </div>
        </>
      ) : (
        <p className="small">No manager: a caretaker is in charge and morale slips every week. Pick one below.</p>
      )}
      {offer && target && (
        <div className="mgr-sheet" role="dialog" aria-label="Offer contract">
          <b>{renewing ? 'Renew' : 'Offer'} {target.name} a contract</b>
          <div className="year-chips">
            {CONTRACT_YEARS.map((y) => <button key={y} className={`mod-chip${offer.years === y ? ' on' : ''}`} aria-pressed={offer.years === y} disabled={blocked(y)} onClick={() => setOffer({ ...offer, years: y })}>{y} yr</button>)}
          </div>
          <p className="small">£{terms(offer.years)}k/wk · ends season {renewing && m ? endOf(state, m) + offer.years : state.season + offer.years - (state.week <= 9 ? 1 : 0)}{!renewing && minYears(target) > 1 ? ` · ${target.name} insists on ${minYears(target)}+ years` : ''}{renewing && m && renewalTerms(state, offer.years, overperformance(state), m).raise ? ` · asks +${renewalTerms(state, offer.years, overperformance(state), m).raise}% for his results` : ''}{!renewing && m ? ` · pays off ${m.name}: £${due}k` : ''}</p>
          <div className="mgr-main-actions">
            <button className="primary big-btn" disabled={busy || blocked(offer.years) || (!renewing && !canHire(state))} onClick={confirm}>Confirm</button>
            <button className="secondary big-btn" onClick={() => setOffer(null)}>Cancel</button>
          </div>
        </div>
      )}
      <p className="small mgr-sub"><b>{m ? 'Replace him' : 'Candidates'}</b> · longer deals = lower wage</p>
      {!canHire(state) && <p className="small">🔒 The board must back you (trust 40+, now {Math.round(state.trust)}) before you can appoint a manager.</p>}
      <div className="pp-list mgr-cands">
        {cands.map((c) => (
          <button key={c.id} className="secondary pp-btn" disabled={busy || !canHire(state)} onClick={() => setOffer({ id: c.id, years: Math.max(2, minYears(c)) })}>
            <span>{c.name} · {'★'.repeat(c.rating)}</span><small>{c.style} {c.formation} · from £{contractWage(c, 5)}k/wk{minYears(c) > 1 ? ` · ${minYears(c)}+ yrs` : ''}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
import { acceptInvestment, declineInvestment } from './investors.ts';
export function InvestorCard({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const inv = state.investor;
  if (!inv || (!inv.offer && !inv.stakes && inv.takeover === undefined)) return null;
  const o = inv.offer;
  return (
    <section className="card investor-card">
      <span className="eyebrow">💼 OWNERSHIP & INVESTORS</span>
      {inv.takeover !== undefined && <p className="small">🏦 New owners since season {inv.takeover}.</p>}
      {inv.stakes > 0 && <p className="small">Investors hold {inv.stakes}% · £{inv.raised}k raised · dividends depend on season profit and policy.</p>}
      {o && (
        <>
          <h3>{o.name}: £{o.cash}k for {o.stake}%</h3>
          <div className="pp-list">
            <button className="primary pp-btn" disabled={!!state.match} onClick={() => onUpdate(acceptInvestment(state), 'Investment accepted.')}>Accept · +£{o.cash}k</button>
            <button className="secondary pp-btn" disabled={!!state.match} onClick={() => onUpdate(declineInvestment(state), 'Offer declined.')}>Decline</button>
          </div>
        </>
      )}
    </section>
  );
}
import { available, buyShares, injectCash, myStake, PAYOUT, repayLoan, sellShares, setPolicy, sharePrice, valuation, wallet, weeklySalary, type Policy } from './wallet.ts';
export function MyFinancesCard({ state, onUpdate, onInvest }: { state: GameState; onUpdate: Up; onInvest?: () => void }) {
  const s = state.wallet ? state : (JSON.parse(JSON.stringify(state)) as GameState);
  const w = wallet(s), mode = state.mode ?? 'manager', stake = myStake(s), price = sharePrice(s), inv = state.investor?.stakes ?? 0;
  const lump = Math.max(100, Math.round(w.cash * 0.25 / 100) * 100), off = !!state.match;
  const go = (n: GameState, msg: string) => onUpdate(n === s ? state : n, msg);
  return (
    <section className="card wallet-card">
      <span className="eyebrow">👛 MY FINANCES</span>
      {onInvest && <button className="secondary" onClick={onInvest}>Explore club investments →</button>}
      <div className="wallet-grid">
        <div><small>Wallet</small><b>£{w.cash.toLocaleString()}k</b></div>
        <div><small>Salary</small><b>£{weeklySalary(s)}k/wk{w.owed ? <small> (£{w.owed}k deferred)</small> : null}</b></div>
        <div><small>Earned</small><b>£{w.salary.toLocaleString()}k</b></div>
        <div><small>Dividends</small><b>£{w.dividends.toLocaleString()}k</b></div>
      </div>
      {!!Object.keys(w.holdings ?? {}).length && <details className="wallet-log"><summary>Investments at previous clubs</summary><p className="small">These remain with the original club. They become available if you return there; your new club cannot repay another club’s loan.</p><ul>{Object.entries(w.holdings!).filter(([, h]) => h.loan || h.stake).map(([id, h]) => <li key={id}>{state.clubs.find(c => c.id === id)?.name ?? id}: {h.stake}% shares · £{h.loan}k loan outstanding</li>)}</ul></details>}
      {mode === 'manager' ? (
        <p className="small">Your contract wage goes into your own wallet. Managers can’t own shares.</p>
      ) : (
        <>
          <p className="small">Club value £{valuation(s).toLocaleString()}k · 1% = £{price}k · You own <b>{stake}%</b> · Investors {inv}%{mode === 'director' ? ` · Owners ${100 - stake - inv}%` : ''}{w.loan ? ` · Club owes you £${w.loan}k` : ''}</p>
          <div className="own-bar" aria-hidden="true"><span style={{ width: `${stake}%` }} /><i style={{ width: `${inv}%` }} /></div>
          <div className="wallet-btns">
            {[1, 5].map((p) => <button key={`b${p}`} className="secondary" disabled={off || p > available(s) || w.cash < price * p} onClick={() => go(buyShares(s, p), `Bought ${p}%.`)}>Buy {p}%<small>£{price * p}k</small></button>)}
            {[1, 5].map((p) => <button key={`s${p}`} className="secondary" disabled={off || p > stake} onClick={() => go(sellShares(s, p), `Sold ${p}%.`)}>Sell {p}%<small>£{Math.round(price * p * 0.9)}k</small></button>)}
            <button className="secondary" disabled={off || w.cash < lump} onClick={() => go(injectCash(s, lump, 'loan'), 'Loan made.')}>Lend club<small>£{lump}k loan</small></button>
            <button className="secondary" disabled={off || w.cash < lump} onClick={() => go(injectCash(s, lump, 'equity'), 'Equity injected.')}>Invest<small>£{lump}k equity</small></button>
            {w.loan > 0 && <button className="secondary" disabled={off || state.budget < w.loan} onClick={() => go(repayLoan(s), 'Loan repaid.')}>Repay loan<small>£{w.loan}k to you</small></button>}
          </div>
          <span className="eyebrow">DIVIDEND POLICY</span>
          <div className="mode-pick" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            {(['none', 'low', 'high'] as Policy[]).map((p) => <button key={p} className={`mode-opt ${w.policy === p ? 'active' : ''}`} onClick={() => go(setPolicy(s, p), `Dividend policy: ${p}.`)}><b>{p[0]!.toUpperCase() + p.slice(1)}</b><small>{PAYOUT[p] * 100}% of profit</small></button>)}
          </div>
          <p className="small">Paid at season end only if the club made a profit, and the board caps it if the bank is low. High pleases investors{w.investorMood !== undefined ? ` (mood ${w.investorMood}/100)` : ''}; none annoys them. Your salary is reviewed every 4 weeks and at season end.</p>
        </>
      )}
      {(w.log?.length ?? 0) > 0 && (
        <details className="wallet-log">
          <summary>Salary & dividend history</summary>
          <ul>{w.log!.map((e, i) => <li key={i}><b className={e.amount < 0 ? 'neg' : ''}>{e.kind === 'salary' ? (e.amount > 0 ? '▲' : '▼') : e.kind === 'bonus' ? '🎁' : '💰'}</b> <small>S{e.season} W{e.week}</small> {e.reason}</li>)}</ul>
        </details>
      )}
    </section>
  );
}

import { answerAsk, answerRequest, budgetLeft, expectedPos, leaguePosition, plan, record, setPlan, setBudgetMod, MOD_MIN, MOD_MAX } from './delegate.ts';
export const MOD_CHIPS = [-20, -10, 0, 10, 20, 50];
export function ModControl({ mod, disabled, onSet }: { mod: number; disabled?: boolean; onSet: (n: number) => void }) {
  const [custom, setCustom] = useState('');
  const go = () => { const n = Math.round(Number(custom)); if (custom.trim() !== '' && Number.isInteger(n) && n >= MOD_MIN && n <= MOD_MAX) { onSet(n); setCustom(''); } };
  return (
    <div className="mod-ctl" role="group" aria-label="Budget adjustment">
      {MOD_CHIPS.map((c) => <button key={c} className={`mod-chip${mod === c ? ' on' : ''}`} aria-pressed={mod === c} disabled={disabled} onClick={() => onSet(c)}>{c > 0 ? `+${c}` : c}%</button>)}
      <input className="mod-custom" inputMode="numeric" aria-label="Custom %" placeholder={MOD_CHIPS.includes(mod) ? '±%' : `${mod}%`} value={custom} disabled={disabled} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
      <button className="mod-chip" disabled={disabled || custom.trim() === ''} onClick={go}>Set</button>
    </div>
  );
}
export const autoLine = (auto: number, mod: number, k: (n: number) => string) => `Auto ${k(auto)} ${mod < 0 ? '−' : '+'} ${Math.abs(mod)}% = ${k(Math.round(auto * (1 + mod / 100)))}`;
const ord = (n: number) => `${n}${[11, 12, 13].includes(n % 100) ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
function ManagerOffice({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const p = plan({ ...state, mgr: state.mgr && structuredClone(state.mgr) } as GameState), r = record(state);
  const bill = state.players.filter((x) => x.clubId === state.clubId).reduce((a, x) => a + (x.wage || 0), 0);
  const k = (n: number) => (n >= 1000 ? `£${(n / 1000).toFixed(1)}m` : `£${n}k`);
  const edit = (key: 'transfer' | 'wage' | 'approveOver', label: string) => {
    const v = window.prompt(`${label} (£k)`, String(p[key]));
    if (v === null) return; const n = Math.round(Number(v));
    if (Number.isSafeInteger(n) && n >= 0) onUpdate(setPlan(state, { [key]: n }), `${label} set to ${k(n)}.`);
  };
  const used = Math.min(100, Math.round((p.spent / Math.max(1, p.transfer)) * 100));
  return (
    <div className="mgr-office">
      {state.mode === 'director' && state.hiredManager && jobAtRisk(state) && <p className="neg small mgr-risk">⚠️ His results are putting <b>your</b> job at risk (board trust {Math.round(state.trust)}). Change tactics or the manager before the board acts.</p>}
      <div className="mgr-stats">
        <div><b>{r.w}-{r.d}-{r.l}</b><small>W-D-L</small></div>
        <div><b>{ord(leaguePosition(state))}</b><small>exp. {ord(expectedPos(state))}</small></div>
        <div><b>{p.signings}/{p.sales}</b><small>in / out</small></div>
      </div>
      <div className="mgr-budget">
        <p className="small"><b>Transfer</b> · {autoLine(p.auto?.transfer ?? p.transfer, p.mod ?? 0, k)}</p>
        <div className="mgr-bar"><span style={{ width: `${used}%` }} /></div>
        <p className="small">{k(p.spent)} used · {k(budgetLeft(state))} left</p>
        <p className="small"><b>Wages</b> · {autoLine(p.auto?.wage ?? p.wage, p.mod ?? 0, (n) => `£${n}k`)}/wk · now £{bill}k</p>
        <ModControl mod={p.mod ?? 0} disabled={!!state.match} onSet={(n) => onUpdate(setBudgetMod(state, n), `Budgets ${n >= 0 ? '+' : ''}${n}% on auto.`)} />
        <p className="small">Auto budgets reset each window from the bank, income, board limit, expectations and his results. Your % stays.</p>
        <button className="secondary pp-btn mgr-approve-line" disabled={!!state.match} onClick={() => edit('approveOver', 'Approval line')}>Deals over {k(p.approveOver)} need your OK · change</button>
      </div>
      {p.request && (
        <div className="mgr-request">
          <p className="small">📨 Wants <b>{p.request.name}</b> ({p.request.slot}) for {k(p.request.fee)}</p>
          <div className="pp-list">
            <button className="primary big-btn" disabled={!!state.match} onClick={() => onUpdate(answerRequest(state, true), 'Deal approved.')}>Approve</button>
            <button className="secondary big-btn" disabled={!!state.match} onClick={() => onUpdate(answerRequest(state, false), 'Deal blocked.')}>Block</button>
          </div>
        </div>
      )}
      {(p.asks ?? []).map((a) => (
        <div className="mgr-request mgr-ask" key={a.kind + a.playerId}>
          <p className="small">{a.kind === 'renew' ? '🛡️ ' : '🏦 '}{a.kind === 'renew' ? <>New deal for protected <b>{a.name}</b>: £{a.wage}k/wk (over his wage budget)</> : <>{a.by === 'board' ? 'Board-forced sale' : 'He wants to sell'}: <b>{a.name}</b>{a.fee ? <> for {k(a.fee)}</> : null}{a.buyer ? <> to {state.clubs.find((c) => c.id === a.buyer)?.name}</> : null} (over your {k(p.approveOver)} line)</>}</p>
          <div className="pp-list">
            <button className="primary big-btn" disabled={!!state.match} onClick={() => onUpdate(answerAsk(state, a.playerId, a.kind, true), a.kind === 'renew' ? 'Renewal approved.' : 'Sale approved.')}>Approve</button>
            <button className="secondary big-btn" disabled={!!state.match} onClick={() => onUpdate(answerAsk(state, a.playerId, a.kind, false), a.kind === 'renew' ? 'Renewal refused.' : 'Sale blocked.')}>{a.kind === 'renew' ? 'Refuse' : 'Block'}</button>
            {a.kind === 'sell' && <button className="secondary big-btn" disabled={!!state.match} onClick={() => onUpdate(answerAsk(state, a.playerId, a.kind, 'other'), 'Picking another player.')}>Pick another player</button>}
          </div>
        </div>
      ))}
      <details className="mgr-log" open>
        <summary>His decisions</summary>
        {p.log.length ? <ul>{p.log.slice(0, 12).map((x, i) => <li key={i} className="small">{x}</li>)}</ul> : <p className="small">Nothing yet. He acts after each match.</p>}
      </details>
    </div>
  );
}
