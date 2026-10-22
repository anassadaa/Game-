import type { GameState } from './game.ts';
import { potentialStars } from './game.ts';
import { regens } from './regens.ts';

export function RegensPanel({ state }: { state: GameState }) {
  const list = regens(state).sort((a, b) => b.potential - a.potential).slice(0, 10);
  const known = new Map((state.scoutReports ?? []).map((r) => [r.playerId, r]));
  const retired = (state.retired ?? []).slice(0, 8);
  return (
    <section className="card">
      <p className="eyebrow">LIVING WORLD</p>
      <h3>Regens & retirements</h3>
      {!retired.length && <p className="muted small">Veterans retire at 33–38. Each one leaves behind a teenage regen in the same position and country, with potential shaped by the veteran's peak. Finish a season to see the first wave.</p>}
      {!!list.length && (<><p className="eyebrow">REGENS TO WATCH</p><div className="row-list">
        {list.map((p) => {
          const r = known.get(p.id);
          return (
            <div key={p.id}><span><b>{p.name}</b> · {p.position} {p.age}y · {state.clubs.find((c) => c.id === p.clubId)?.short}<br />
              <small>Successor to {p.regenOf} · {r ? `OVR ${r.est[0]}–${r.est[1]} · xG/90 ${r.xg90.toFixed(2)}` : 'unscouted'} · {'★'.repeat(Math.round(potentialStars(p)))}</small></span></div>
          );
        })}
      </div></>)}
      {!!retired.length && (<><p className="eyebrow">RECENTLY RETIRED</p><div className="row-list">
        {retired.map((r) => <div key={r.name + r.season}><span>{r.ours ? '🏠 ' : ''}{r.name} ({r.position}, peak {r.peak}) · {r.club} · retired at {r.age}, S{r.season}</span></div>)}
      </div></>)}
    </section>
  );
}
