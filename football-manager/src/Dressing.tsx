import { best } from './staff.ts';
import type { GameState } from './game.ts';
import { AssistantTip } from './Staff.tsx';
import { canMentor, giveRaise, groups, hierarchy, raiseCost, setMentor } from './room.ts';
import { TONES, recommendTalk, answerPress, handleUnhappy, harmony, pressQuestion, teamTalk } from './dressing.ts';

type Up = (s: GameState, m?: string) => void;
export function TeamTalk({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const m = state.match;
  if (!m || m.complete || (m.minute !== 0 && m.minute !== 45) || (m.talks ?? []).includes(m.minute)) return null;
  const rec = best(state, 'assistant') ? recommendTalk(state) : null;
  return (
    <div className="talk">
      <b>{m.minute === 0 ? 'Pre-match team talk' : 'Half-time team talk'}</b>
      <AssistantTip state={state} />
      {rec && <p className="small muted">🗣 Recommends: <b>{TONES.find((t) => t.id === rec.tone)!.label}</b> — {rec.why}</p>}
      <div className="seg-row">
        {TONES.map((t) => (
          <button key={t.id} className={rec?.tone === t.id ? 'on' : ''} onClick={() => onUpdate(teamTalk(state, t.id))}>{t.label}</button>
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
                  {p.unhappy === 'wages' && <button className="secondary" disabled={!!state.match} onClick={() => onUpdate(giveRaise(state, p.id), `${p.name} accepts a raise.`)}>Raise to £{raiseCost(state, p)}k</button>}
                  <button className="secondary" disabled={!!state.match} onClick={() => onUpdate(handleUnhappy(state, p.id, 'promise'))}>Promise</button>
                  <button className="ghost" disabled={!!state.match} onClick={() => onUpdate(handleUnhappy(state, p.id, 'talk'))}>Talk</button>
                  <button className="ghost" disabled={!!state.match} onClick={() => onUpdate(handleUnhappy(state, p.id, 'list'))}>List</button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      <RoomStructure state={state} onUpdate={onUpdate} />
    </section>
  );
}
function RoomStructure({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const squad = state.players.filter((p) => p.clubId === state.clubId);
  const top = hierarchy(state).filter((x) => x.tier !== 'Other');
  const kids = squad.filter((k) => squad.some((m) => canMentor(m, k)));
  const name = (id: string) => squad.find((p) => p.id === id)?.name ?? '?';
  return (
    <div className="room">
      <p className="eyebrow">HIERARCHY</p>
      <div className="chips">{top.map((x) => <span key={x.id} className={`chip tier-${x.tier.split(' ')[0]!.toLowerCase()}`}>{x.name} · {x.tier}</span>)}</div>
      <p className="eyebrow">SOCIAL GROUPS</p>
      <ul className="groups">{groups(state).map((g) => <li key={g.name}><b>{g.name}</b> ({g.ids.length}): {g.ids.slice(0, 5).map(name).join(', ')}{g.ids.length > 5 ? '…' : ''}</li>)}</ul>
      {kids.length > 0 && <p className="eyebrow">MENTORING</p>}
      {kids.map((k) => (
        <label key={k.id} className="mentor-row">
          <span>{k.name} ({k.age})</span>
          <select value={k.mentor ?? ''} disabled={!!state.match} onChange={(e) => onUpdate(setMentor(state, k.id, e.target.value || null))}>
            <option value="">No mentor</option>
            {squad.filter((m) => canMentor(m, k)).map((m) => <option key={m.id} value={m.id}>{m.name} ({m.age}, {m.personality ?? '—'})</option>)}
          </select>
        </label>
      ))}
    </div>
  );
}
