import type { GameState } from './game.ts';
import { injuryName, injuryNews, injuryProne, rushBack } from './injuries.ts';

type Up = (s: GameState, m?: string) => void;
/** Medical centre: who is out, with what, when they are back, and the risky early return. */
export function MedicalPanel({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const out = state.players.filter((p) => p.clubId === state.clubId && p.injured).sort((a, b) => (a.injured ?? 0) - (b.injured ?? 0));
  const risky = state.players.filter((p) => p.clubId === state.clubId && !p.injured && (p.rushed || injuryProne(p)));
  return (
    <section className="card med">
      <p className="eyebrow">MEDICAL CENTRE · {out.length} out</p>
      {!out.length && <p className="muted small">No injuries. The physio is drinking tea.</p>}
      {out.map((p) => {
        const total = Math.max(p.injury?.total ?? p.injured ?? 1, p.injured ?? 1);
        const pct = Math.round(((total - (p.injured ?? 0)) / total) * 100);
        const canRush = !state.match && (p.injured ?? 0) <= Math.ceil(total / 2);
        return (
          <div key={p.id} className="med-row">
            <div className="med-top">
              <strong>{p.name}</strong>
              <span className="muted small">{p.position} · {injuryName(p.injury?.type)}{injuryProne(p) ? ' · prone' : ''}</span>
            </div>
            <div className="med-bar" aria-label={`Recovery ${pct}%`}><i style={{ width: `${pct}%` }} /></div>
            <div className="med-top">
              <span className="small">Back MW{state.week + (p.injured ?? 0) + 1} · {p.injured}w left</span>
              <button className="ghost small" disabled={!canRush} title="Higher re-injury risk"
                onClick={() => { const [b, m] = rushBack(state, p.id); onUpdate(b, m); }}>⚠️ Rush back</button>
            </div>
          </div>
        );
      })}
      {risky.length > 0 && <p className="muted small">At risk: {risky.map((p) => `${p.name}${p.rushed ? ' (rushed)' : ' (injury prone)'}`).join(', ')}</p>}
    </section>
  );
}
export function MedicalNews({ state }: { state: GameState }) {
  const n = injuryNews(state).slice(0, 6);
  if (!n.length) return null;
  return (
    <section className="card">
      <p className="eyebrow">INBOX · MEDICAL</p>
      {n.map((x, i) => <p key={i} className="small">W{x.week + 1}: {x.text}</p>)}
    </section>
  );
}
