import { useState } from 'react';
import type { GameState } from './game.ts';
import { MAX_SETS, deleteTacticSet, saveTacticSet, useTacticSet } from './tacticsets.ts';

type Up = (s: GameState, m?: string) => void;
export function TacticSets({ state, onUpdate, compact }: { state: GameState; onUpdate: Up; compact?: boolean }) {
  const [name, setName] = useState('');
  const sets = state.tacticSets ?? [];
  if (compact && !sets.length) return null;
  return (
    <div className="tactic-sets">
      <small>{compact ? 'Switch plan' : `Saved tactics (${sets.length}/${MAX_SETS})`}</small>
      <div className="seg-row">
        {sets.map((x, i) => (
          <span key={x.name} className="set-chip">
            <button className="secondary" disabled={!!state.match?.complete} onClick={() => onUpdate(useTacticSet(state, i), `Switched to ${x.name}.`)}>{x.name} · {x.t.formation}</button>
            {!compact && <button className="ghost" aria-label={`Delete ${x.name}`} onClick={() => onUpdate(deleteTacticSet(state, i))}>✕</button>}
          </span>
        ))}
      </div>
      {!compact && sets.length < MAX_SETS && (
        <div className="set-save">
          <input value={name} maxLength={20} placeholder="Plan name" onChange={(e) => setName(e.target.value)} />
          <button onClick={() => { onUpdate(saveTacticSet(state, name), 'Tactic saved.'); setName(''); }}>Save current</button>
        </div>
      )}
    </div>
  );
}
