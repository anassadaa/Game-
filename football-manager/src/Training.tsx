import type { AttrKey, GameState, Position } from './game.ts';
import { ATTRS } from './game.ts';
import { DRILLS, MAX_DRILLS, retrain, setFocus, sharpness, toggleDrill } from './training.ts';

export function TrainingPanel({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const own = state.players.filter((p) => p.clubId === state.clubId);
  const rep = state.trainingReport;
  const locked = !!state.match;
  return (
    <section className="card">
      <p className="eyebrow">TRAINING GROUND</p>
      <h3>Drills ({(state.drills ?? []).length}/{MAX_DRILLS})</h3>
      <div className="seg-row">
        {DRILLS.map((d) => (
          <button key={d.id} disabled={locked} className={(state.drills ?? []).includes(d.id) ? 'on' : ''} onClick={() => onUpdate(toggleDrill(state, d.id))}>
            {d.name}
            <small> {d.attr}</small>
          </button>
        ))}
      </div>
      <p className="muted small">Drills improve that attribute across the squad but cost energy. Young players learn fastest.</p>
      {rep && (
        <div className="reveal">
          <b>Training report · week {rep.week}</b>
          {rep.lines.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
      <h3>Individual training</h3>
      <div className="indiv">
        {own.map((p) => (
          <div key={p.id} className="indiv-row">
            <span className="indiv-name">
              <b>{p.name}</b>
              <small>{p.position}{p.retrain ? ` → ${p.retrain.to} ${p.retrain.progress}%` : ''} · sharp {sharpness(p)}</small>
            </span>
            <select aria-label={`Focus for ${p.name}`} disabled={locked} value={p.focus ?? ''} onChange={(e) => onUpdate(setFocus(state, p.id, (e.target.value || null) as AttrKey | null))}>
              <option value="">No focus</option>
              {ATTRS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <select aria-label={`Retrain ${p.name}`} disabled={locked} value={p.retrain?.to ?? ''} onChange={(e) => onUpdate(retrain(state, p.id, (e.target.value || null) as Position | null))}>
              <option value="">Keep {p.position}</option>
              {(['GK', 'DF', 'MF', 'FW'] as Position[]).filter((x) => x !== p.position).map((x) => <option key={x} value={x}>Retrain {x}</option>)}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
