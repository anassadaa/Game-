import type { GameState } from './game.ts';
import { potentialStars } from './game.ts';
import { INTAKE_WEEK, promoteYouth, releaseYouth } from './youth.ts';

export function YouthPanel({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const list = state.youth ?? [];
  return (
    <section className="card">
      <p className="eyebrow">YOUTH ACADEMY · LEVEL {state.academy}</p>
      <h3>Youth intake</h3>
      {!list.length ? (
        <p className="muted">The next intake arrives in matchweek {INTAKE_WEEK + 1}. Upgrade the academy for more prospects and better wonderkid odds.</p>
      ) : (
        <div className="row-list">
          {list.map((p) => (
            <div key={p.id} className={p.wonderkid ? 'wk' : ''}>
              <span>
                <b>{p.wonderkid && '💎 '}{p.name}</b> · {p.position} · {p.age}y · OVR {p.rating} · {'★'.repeat(Math.round(potentialStars(p)))} potential
                {p.wonderkid && <em> Wonderkid</em>}
              </span>
              <span className="row-btns">
                <button className="secondary" onClick={() => onUpdate(promoteYouth(state, p.id), `${p.name} promoted to the squad.`)}>Promote</button>
                <button className="ghost" onClick={() => onUpdate(releaseYouth(state, p.id))}>Release</button>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
