import { useState } from 'react';
import { renameClub } from './game.ts';
import type { GameState } from './game.ts';
import { LEAGUES } from './world.ts';

export function WorldPanel({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const [id, setId] = useState(state.clubId);
  const current = state.clubs.find((c) => c.id === id);
  const [name, setName] = useState(current?.name ?? '');
  return (
    <section className="card panel">
      <span className="eyebrow">WORLD EDITOR</span>
      <h3>✏️ Rename a club</h3>
      <p className="muted">Club names are fictional look-alikes. Rename any club to whatever you like.</p>
      <div className="tm-filters">
        <select
          value={id}
          onChange={(e) => {
            setId(e.target.value);
            setName(state.clubs.find((c) => c.id === e.target.value)?.name ?? '');
          }}
        >
          {LEAGUES.map((l) => (
            <optgroup key={l.division} label={`${l.flag} ${l.name}`}>
              {state.clubs
                .filter((c) => c.division === l.division)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.id === state.clubId ? ' (you)' : ''}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <input value={name} maxLength={32} onChange={(e) => setName(e.target.value)} />
        <button className="secondary" disabled={name.trim().length < 2} onClick={() => onUpdate(renameClub(state, id, name), 'Club renamed.')}>
          Save name
        </button>
      </div>
    </section>
  );
}
