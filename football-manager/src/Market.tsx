import { useState } from 'react';
import {
  ATTRS,
  acceptBid,
  askingPrice,
  deadlineDay,
  potentialStars,
  rejectBid,
  searchMarket,
  toggleListed,
  windowLabel,
  windowOpen,
} from './game.ts';
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
      {!!state.bids?.length && (
        <div className="tm-block">
          <h3>Incoming bids</h3>
          <div className="row-list">
            {state.bids.map((b) => {
              const p = state.players.find((x) => x.id === b.playerId);
              if (!p) return null;
              return (
                <div key={b.id}>
                  <span>
                    <b>{clubName(b.clubId)}</b> bid <b>{money(b.fee)}</b> for {p.name} ({p.position} {p.rating}, value {money(p.price)})
                  </span>
                  <span className="btn-row">
                    <button
                      className="secondary"
                      disabled={locked}
                      onClick={() => {
                        const [next, msg] = acceptBid(state, b.id);
                        onUpdate(next, msg);
                      }}
                    >
                      Accept
                    </button>
                    <button className="text-button" onClick={() => onUpdate(rejectBid(state, b.id), 'Bid rejected.')}>
                      Reject
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
                  {p.listed ? ' · 📋 listed' : ''} · {'★'.repeat(Math.floor(potentialStars(p)))}
                </small>
              </div>
              <b className="tm-ovr">{p.rating}</b>
              <button
                className="secondary"
                disabled={locked || (p.clubId !== 'market' && !open)}
                onClick={() => onNegotiate(p)}
              >
                {money(p.counter ?? askingPrice(p))}
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
        <p className="muted">List a player to attract bids while a window is open. Listed players get far more offers.</p>
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
              </div>
            ))}
        </div>
      </div>
      <div className="tm-block">
        <h3>Transfer news</h3>
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
