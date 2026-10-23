import { abilityRange, potentialRange, rangeText, scouted } from './scoutrange.ts';
import { useState } from 'react';
import {
  ATTRS,
  askingPrice,
  deadlineDay,
  searchMarket,
  toggleListed,
  windowLabel,
  windowOpen,
} from './game.ts';
import { LEAGUES } from './world.ts';
import { loansOut, toggleLoanListed } from './loans.ts';
import type { AttrKey, GameState, MarketFilter, Player, Position } from './game.ts';

const money = (n: number) => (n >= 1000 ? `£${(n / 1000).toFixed(1)}m` : `£${n}k`);

export function TransferMarket({
  state,
  locked,
  onUpdate,
  onNegotiate,
}: {
  state: GameState;
  locked: boolean;
  onUpdate: (next: GameState, msg?: string) => void;
  onNegotiate: (p: Player) => void;
}) {
  const [f, setF] = useState<MarketFilter>({ position: 'ALL', source: 'all', sort: 'rating', attr: '', minAttr: 60 });
  const [limit, setLimit] = useState(15);
  const results = searchMarket(state, f);
  const clubName = (id: string) => (id === 'market' ? 'Free agent' : state.clubs.find((c) => c.id === id)?.short ?? id);
  const roster = state.players.filter((p) => p.clubId === state.clubId);
  const open = windowOpen(state);
  const set = (patch: Partial<MarketFilter>) => {
    setF({ ...f, ...patch });
    setLimit(15);
  };
  return (
    <section className="card tm">
      <div className={`tm-window ${deadlineDay(state) ? 'deadline' : open ? 'open' : 'closed'}`}>
        {deadlineDay(state) ? '⏰ ' : open ? '🟢 ' : '🔒 '}
        {windowLabel(state)}
      </div>
      <div className="tm-block">
        <h3>Search players</h3>
        <div className="tm-filters">
          <input placeholder="Name or club…" value={f.q ?? ''} onChange={(e) => set({ q: e.target.value })} />
          <select value={f.position} onChange={(e) => set({ position: e.target.value as Position | 'ALL' })}>
            {['ALL', 'GK', 'DF', 'MF', 'FW'].map((x) => (
              <option key={x} value={x}>{x === 'ALL' ? 'All positions' : x}</option>
            ))}
          </select>
          <select value={f.source} onChange={(e) => set({ source: e.target.value as MarketFilter['source'] })}>
            <option value="all">Everyone</option>
            <option value="free">Free agents</option>
            <option value="clubs">Club players</option>
          </select>
          <select value={f.maxAge ?? 0} onChange={(e) => set({ maxAge: +e.target.value || undefined })}>
            <option value={0}>Any age</option>
            {[19, 21, 23, 25, 28, 31].map((a) => (
              <option key={a} value={a}>≤ {a}</option>
            ))}
          </select>
          <select value={f.maxPrice ?? 0} onChange={(e) => set({ maxPrice: +e.target.value || undefined })}>
            <option value={0}>Any price</option>
            {[150, 300, 500, 800, 1200, 2000].map((a) => (
              <option key={a} value={a}>≤ {money(a)}</option>
            ))}
            <option value={Math.max(1, state.budget)}>Affordable</option>
          </select>
          <select aria-label="Minimum rating" value={f.minRating ?? 0} onChange={(e) => set({ minRating: +e.target.value || undefined })}>
            <option value={0}>Any rating</option>
            {[50, 55, 60, 65, 70, 75, 80].map((a) => (
              <option key={a} value={a}>OVR ≥ {a}</option>
            ))}
          </select>
          <select aria-label="League" value={f.division ?? -1} onChange={(e) => set({ division: +e.target.value < 0 ? undefined : +e.target.value })}>
            <option value={-1}>Any league</option>
            {LEAGUES.map((l) => (
              <option key={l.division} value={l.division}>{l.flag} {l.name}</option>
            ))}
          </select>
          <select aria-label="Country" value={f.country ?? ''} onChange={(e) => set({ country: e.target.value || undefined })}>
            <option value="">Any country</option>
            {[...new Set(LEAGUES.map((l) => l.country))].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={f.minStars ?? 0} onChange={(e) => set({ minStars: +e.target.value || undefined })}>
            <option value={0}>Any potential</option>
            {[2, 3, 4, 5].map((a) => (
              <option key={a} value={a}>{'★'.repeat(a)}+</option>
            ))}
          </select>
          <select value={f.attr} onChange={(e) => set({ attr: e.target.value as AttrKey | '' })}>
            <option value="">Any attribute</option>
            {ATTRS.map((a) => (
              <option key={a} value={a}>{a[0]!.toUpperCase() + a.slice(1)} ≥ {f.minAttr}</option>
            ))}
          </select>
          {f.attr && (
            <select value={f.minAttr} onChange={(e) => set({ minAttr: +e.target.value })}>
              {[50, 60, 65, 70, 75, 80].map((a) => (
                <option key={a} value={a}>min {a}</option>
              ))}
            </select>
          )}
          <select value={f.sort} onChange={(e) => set({ sort: e.target.value as MarketFilter['sort'] })}>
            <option value="rating">Sort: rating</option>
            <option value="potential">Sort: potential</option>
            <option value="price">Sort: price</option>
            <option value="age">Sort: age</option>
          </select>
          <label className="deal-check">
            <input type="checkbox" checked={!!f.listedOnly} onChange={(e) => set({ listedOnly: e.target.checked })} /> Transfer-listed only
          </label>
        </div>
        <p className="muted">{results.length} players found{!open ? ' · club players can only be bought when the window is open' : ''}</p>
        <div className="tm-results">
          {results.slice(0, limit).map((p) => (
            <div className="tm-row" key={p.id}>
              <span className="position-pill">{p.position}</span>
              <div className="tm-name">
                <b>{p.name}</b>
                <small>
                  {p.age}y · {clubName(p.clubId)}
                  {p.listed ? ' · 📋 listed' : ''} · POT {rangeText(potentialRange(state, p))}{scouted(state, p) ? ' · 🔍' : ''}
                </small>
              </div>
              <b className="tm-ovr">{rangeText(abilityRange(state, p))}</b>
              <button
                className="secondary"
                disabled={locked || (p.clubId !== 'market' && !open)}
                onClick={() => onNegotiate(p)}
              >
                {money(p.counter ?? askingPrice(p, state))}
              </button>
            </div>
          ))}
        </div>
        {results.length > limit && (
          <button className="text-button wide" onClick={() => setLimit(limit + 15)}>
            Show more
          </button>
        )}
      </div>
      <div className="tm-block">
        <h3>Your transfer list</h3>
        <p className="muted">List a player to attract bids while a window is open. Loan-listed reserves may be taken on loan for the season (the borrower pays a fee and his wages).</p>
        <div className="row-list">
          {roster
            .filter((p) => !p.loan)
            .sort((a, b) => Number(!!b.listed) - Number(!!a.listed) || a.rating - b.rating)
            .map((p) => (
              <div key={p.id}>
                <span>
                  {p.position} <b>{p.name}</b> {p.rating} · {money(p.price)}
                </span>
                <button className={p.listed ? 'secondary' : 'text-button'} disabled={locked} onClick={() => onUpdate(toggleListed(state, p.id))}>
                  {p.listed ? '📋 Listed · unlist' : 'List for sale'}
                </button>
                <button className={p.loanListed ? 'secondary' : 'text-button'} disabled={locked || p.starting} onClick={() => onUpdate(toggleLoanListed(state, p.id))}>
                  {p.loanListed ? '🔁 Loan-listed · unlist' : 'Loan list'}
                </button>
              </div>
            ))}
        </div>
      </div>
      {!!loansOut(state).length && (
        <div className="tm-block">
          <h3>Out on loan</h3>
          <div className="row-list">
            {loansOut(state).map((p) => (
              <div key={p.id}><span>{p.position} <b>{p.name}</b> {p.rating} · at {clubName(p.loanClub ?? '')} until season end</span></div>
            ))}
          </div>
        </div>
      )}
      <div className="tm-block">
        <h3>{deadlineDay(state) ? '⏰ Deadline day news' : 'Transfer news'}</h3>
        <div className="tm-news">
          {(state.news ?? []).length ? (
            state.news!.map((n, i) => <p key={i}>{n}</p>)
          ) : (
            <p className="muted">Quiet so far. News arrives every week the window is open.</p>
          )}
        </div>
      </div>
    </section>
  );
}
