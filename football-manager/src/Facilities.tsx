import { Building2, HeartPulse, Dumbbell } from 'lucide-react';
import type { GameState } from './game.ts';
import { FACILITIES, buildFacility, facilities, facilityCost, maintenance } from './facilities.ts';

const ICON = { training: <Dumbbell />, medical: <HeartPulse />, stadium: <Building2 /> };
export function FacilityRows({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const f = facilities(state);
  return (
    <>
      {FACILITIES.map((x) => {
        const lvl = f[x.id], cost = facilityCost(state, x.id), busy = f.building?.type === x.id;
        return (
          <div className="facility" key={x.id}>
            <span className="facility-icon">{ICON[x.id]}</span>
            <div>
              <h3>{x.name} <small>LVL {lvl}/5</small></h3>
              <p>{x.blurb}</p>
              <button className="mini" disabled={!!f.building || lvl >= 5 || state.budget < cost || !!state.match} onClick={() => onUpdate(buildFacility(state, x.id), 'Construction under way.')}>
                {busy ? `Building · ${f.building!.weeks}w left` : lvl >= 5 ? 'Fully developed' : f.building ? 'Builders busy elsewhere' : `Build · £${cost}k`}
              </button>
            </div>
          </div>
        );
      })}
      <p className="muted small">Upkeep £{maintenance(state)}k/week · one project at a time, {2} weeks each.</p>
    </>
  );
}
