import type { GameState, Player } from './game.ts';
import { HIDDEN_LABEL, PPM_LABEL, captains, hidden, leadership, ppms, setCaptain } from './traits.ts';

const grade = (v: number) => (v >= 16 ? 'high' : v <= 7 ? 'low' : 'mid');
export function TraitLine({ p }: { p: Player }) {
  const t = ppms(p), h = hidden(p);
  return (
    <div className="trait-line">
      <span className="chip">LDR {leadership(p)}</span>
      {t.map((x) => <span key={x} className="chip trait">{PPM_LABEL[x]}</span>)}
      {(Object.keys(HIDDEN_LABEL) as (keyof typeof h)[]).map((k) => (
        <span key={k} className={`chip hidden ${p.known ? grade(k === 'proneness' ? 21 - h[k] : h[k]) : ''}`} title={p.known ? 'Coach/scout assessment' : 'Unknown — coaches and scouts will find out'}>
          {HIDDEN_LABEL[k]} {p.known ? h[k] : '?'}
        </span>
      ))}
    </div>
  );
}
export function CaptaincyCard({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const { captain, vice } = captains(state);
  const squad = state.players.filter((p) => p.clubId === state.clubId).sort((a, b) => leadership(b) - leadership(a));
  return (
    <section className="card captaincy">
      <p className="eyebrow">CAPTAINCY</p>
      <h3>© {captain?.name ?? '—'} · vice {vice?.name ?? '—'}</h3>
      <p className="muted small">A strong leader on the pitch lifts the side and steadies morale each week; a weak one costs a little. The vice wears the armband when the captain is out.</p>
      <label className="cap-row">Captain
        <select value={captain?.id ?? ''} disabled={!!state.match} onChange={(e) => onUpdate(setCaptain(state, e.target.value, 'captain'), 'New captain named.')}>
          {squad.map((p) => <option key={p.id} value={p.id}>{p.name} · LDR {leadership(p)}</option>)}
        </select>
      </label>
      <label className="cap-row">Vice-captain
        <select value={vice?.id ?? ''} disabled={!!state.match} onChange={(e) => onUpdate(setCaptain(state, e.target.value, 'vice'), 'New vice-captain named.')}>
          {squad.map((p) => <option key={p.id} value={p.id}>{p.name} · LDR {leadership(p)}</option>)}
        </select>
      </label>
    </section>
  );
}
