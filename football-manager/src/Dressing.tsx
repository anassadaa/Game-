import type { GameState } from './game.ts';
import { TONES, answerPress, handleUnhappy, harmony, pressQuestion, teamTalk } from './dressing.ts';

type Up = (s: GameState, m?: string) => void;
export function TeamTalk({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const m = state.match;
  if (!m || m.complete || (m.minute !== 0 && m.minute !== 45) || (m.talks ?? []).includes(m.minute)) return null;
  return (
    <div className="talk">
      <b>{m.minute === 0 ? 'Pre-match team talk' : 'Half-time team talk'}</b>
      <div className="seg-row">
        {TONES.map((t) => (
          <button key={t.id} onClick={() => onUpdate(teamTalk(state, t.id))}>{t.label}</button>
        ))}
      </div>
    </div>
  );
}
export function PressRoom({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const q = pressQuestion(state);
  if (!q) return null;
  return (
    <div className="talk">
      <b>🎤 Press conference</b>
      <p>“{q.q}”</p>
      <div className="press-a">
        {q.a.map((a, i) => (
          <button key={i} className="secondary" onClick={() => onUpdate(answerPress(state, i as 0 | 1 | 2))}>{a}</button>
        ))}
      </div>
    </div>
  );
}
export function DressingPanel({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const h = harmony(state);
  const sad = state.players.filter((p) => p.clubId === state.clubId && (p.unhappy || p.promise));
  return (
    <section className="card">
      <p className="eyebrow">DRESSING ROOM</p>
      <h3>Harmony {h}%</h3>
      <div className="meter-bar"><i style={{ width: `${h}%`, background: h < 40 ? '#e14d4d' : h < 65 ? '#f2b33d' : '#5fbf4a' }} /></div>
      {state.drama && <p className="drama">🔥 {state.drama}</p>}
      {!sad.length ? (
        <p className="muted small">Nobody is knocking on your door. Leaders lift harmony; benched stars and broken promises sour it.</p>
      ) : (
        <div className="row-list">
          {sad.map((p) => (
            <div key={p.id}>
              <span>
                <b>{p.name}</b> · {p.unhappy ? `unhappy: ${p.unhappy}` : `promised playing time (${p.promise!.kept}/2, ${p.promise!.weeks}w left)`}
              </span>
              {p.unhappy && (
                <span className="row-btns">
                  <button className="secondary" disabled={!!state.match} onClick={() => onUpdate(handleUnhappy(state, p.id, 'promise'))}>Promise</button>
                  <button className="ghost" disabled={!!state.match} onClick={() => onUpdate(handleUnhappy(state, p.id, 'talk'))}>Talk</button>
                  <button className="ghost" disabled={!!state.match} onClick={() => onUpdate(handleUnhappy(state, p.id, 'list'))}>List</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
