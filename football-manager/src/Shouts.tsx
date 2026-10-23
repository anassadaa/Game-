import type { GameState } from './game.ts';
import { SHOUTS, activeShout, shout } from './shouts.ts';

export function Shouts({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const m = state.match;
  if (!m || m.complete || m.minute === 0) return null;
  const cur = activeShout(state), justNow = m.shout?.at === m.minute;
  return (
    <div className="talk shouts">
      <b>📣 Touchline shout{cur ? ` · ${cur.label} (until ${m.shout!.at + 30}')` : ''}</b>
      <div className="shout-row">
        {SHOUTS.map((x) => (
          <button key={x.id} className={cur?.id === x.id ? 'active' : ''} disabled={justNow} title={x.tip} onClick={() => onUpdate(shout(state, x.id), `${x.label}: ${x.tip}`)}>{x.label}</button>
        ))}
      </div>
    </div>
  );
}
