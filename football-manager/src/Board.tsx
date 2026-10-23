import { leagueName } from './world.ts';
import { declineOffers, standings, takeJob } from './game.ts';
import type { GameState } from './game.ts';
import { JobCentre } from './Jobs.tsx';

const ord = (n: number) => `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'}`;

function Offers({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  return (
    <div className="row-list">
      {(state.offers ?? []).map((id) => {
        const c = state.clubs.find((x) => x.id === id)!;
        return (
          <div key={id}>
            <span>
              <b>{c.name}</b> · {leagueName(c.division)} · rating {c.rating}
            </span>
            <button className="secondary" onClick={() => onUpdate(takeJob(state, id), `Welcome to ${c.name}!`)}>
              Accept job
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function BoardRoom({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const me = state.clubs.find((c) => c.id === state.clubId)!;
  const pos = standings(state).filter((c) => c.division === me.division).findIndex((c) => c.id === me.id) + 1;
  const b = state.board;
  if (!b) return null;
  const ok = pos <= b.target;
  return (
    <section className="card panel board-room">
      <span className="eyebrow">BOARD ROOM</span>
      <h3>🎯 {b.objective}</h3>
      {state.boardAsk && <p className="small">🧾 Recruitment ask: {state.boardAsk.text} — {state.boardAsk.done ? '✅ done' : state.boardAsk.failed ? '❌ missed' : 'open until week 17'}</p>}
      <p>
        Target: <b>{ord(b.target)}</b> or better · Currently <b className={ok ? 'good' : 'bad'}>{ord(pos)}</b>
        {state.week === 0 ? ' (season not started)' : ''}
      </p>
      <p>
        Board confidence <b>{Math.round(state.trust)}%</b>
        {b.warnings ? ` · ⚠️ ${b.warnings}/2 warnings` : ''}
      </p>
      <div className="trust-bar">
        <i style={{ width: `${state.trust}%`, background: state.trust < 25 ? '#ef4444' : state.trust < 50 ? '#f59e0b' : '#a3e635' }} />
      </div>
      <small className="muted">Miss the target badly or let confidence drop near zero and you will be sacked. Beat it comfortably and bigger clubs come calling.</small>
      {!state.sacked && !!state.offers?.length && (
        <>
          <h3>📞 Job offers</h3>
          <Offers state={state} onUpdate={onUpdate} />
          <button className="text-button" onClick={() => onUpdate(declineOffers(state), 'You stay loyal.')}>
            Stay and decline all
          </button>
        </>
      )}
    </section>
  );
}

export function SackedModal({ state, onUpdate, onNewCareer }: { state: GameState; onUpdate: (s: GameState, m?: string) => void; onNewCareer: () => void }) {
  if (!state.sacked) return null;
  return (
    <div className="modal-backdrop">
      <section className="help-modal" role="dialog" aria-label="Sacked">
        <span className="eyebrow">{state.resigned ? 'YOU RESIGNED' : 'YOU HAVE BEEN SACKED'}</span>
        <h2>{state.resigned ? 'Between jobs' : 'Clear your desk'}</h2>
        <p>{state.resigned ? 'You are a free agent. Pick an offer or apply for a vacancy.' : state.headlines.find((h) => h.includes('Sacked')) ?? 'The board has relieved you of your duties.'}</p>
        <p>Clubs interested in you:</p>
        <Offers state={state} onUpdate={onUpdate} />
        <JobCentre state={state} onUpdate={onUpdate} />
        <button className="text-button wide" onClick={onNewCareer}>
          Start a new career instead
        </button>
      </section>
    </div>
  );
}
