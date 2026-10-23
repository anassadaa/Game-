import { squadNote } from './aisquads.ts';
import { CORNER, MARKING } from './setpieces.ts';
import { applyScoutSuggestion, club, opponent, setPlayerTactic, setTactics } from './game.ts';
import type { GameState } from './game.ts';
import { FORMATIONS, INSTRUCTIONS, LINES, OOP_MODES, PASSING, ROLES, WIDTHS, roleFit, roleOf, scoutReport, setPieceTaker, tacticProfile } from './tactics.ts';

type Up = (s: GameState, m?: string) => void;
function Seg({ label, value, values, change }: { label: string; value: string; values: readonly string[]; change: (v: string) => void }) {
  return (
    <div className="seg">
      <small>{label}</small>
      <div className="seg-row">
        {values.map((v) => (
          <button key={v} className={v === value ? 'on' : ''} onClick={() => change(v)}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function DeepTacticsPanel({ state, onUpdate }: { state: GameState; onUpdate: Up }) {
  const t = state.tactics;
  const opp = opponent(state);
  const rep = scoutReport(state, opp);
  const prof = tacticProfile(state, opp.style);
  const xi = state.players.filter((p) => p.clubId === state.clubId && p.starting);
  const pct = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n * 100)}%`;
  return (
    <>
      <section className="card panel">
        <span className="eyebrow">OPPOSITION SCOUTING · {opp.name}</span>
        <h3>
          {rep.danger} · likely {rep.formation}, {rep.style}
        </h3>
        <p className="muted small">Their squad: {squadNote(state, opp)}</p>
        <ul className="scout-tips">
          {rep.tips.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
        <button className="secondary wide" onClick={() => onUpdate(applyScoutSuggestion(state), 'Suggested counter applied.')}>
          Apply suggested counter
        </button>
      </section>
      <section className="card panel">
        <span className="eyebrow">TEAM INSTRUCTIONS</span>
        <Seg label="Width" value={t.width ?? 'normal'} values={WIDTHS} change={(v) => onUpdate(setTactics(state, { width: v as never }))} />
        <Seg label="Defensive line" value={t.line ?? 'normal'} values={LINES} change={(v) => onUpdate(setTactics(state, { line: v as never }))} />
        <Seg label="Passing" value={t.passing ?? 'mixed'} values={PASSING} change={(v) => onUpdate(setTactics(state, { passing: v as never }))} />
        <Seg label="Without the ball" value={t.oopMode ?? 'mid'} values={OOP_MODES} change={(v) => onUpdate(setTactics(state, { oopMode: v as never }))} />
        <label className="cap-row">Out-of-possession shape
          <select value={t.oopShape ?? ''} onChange={(e) => onUpdate(setTactics(state, { oopShape: e.target.value || undefined }))}>
            <option value="">Same as in possession</option>
            {FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <Seg label="Counter-attack" value={t.counter ? 'on' : 'off'} values={['off', 'on']} change={(v) => onUpdate(setTactics(state, { counter: v === 'on' }))} />
        <p className="tac-impact">
          Attack <b>{pct(prof.att)}</b> · Defence <b>{pct(prof.def)}</b> vs {opp.short}
          {prof.notes.length > 0 && <small> — {prof.notes.join('; ')}</small>}
        </p>
      </section>
      <section className="card panel">
        <span className="eyebrow">ROLES & INSTRUCTIONS · {club(state).short} XI</span>
        <div className="role-list">
          {xi.map((p) => {
            const role = roleOf(t, p);
            return (
              <div className="role-row" key={p.id}>
                <div>
                  <small>{p.position}</small> <b>{p.name}</b> <span className="fit">fit {roleFit(p, role)}</span>
                </div>
                <div className="role-selects">
                  <select value={role} onChange={(e) => onUpdate(setPlayerTactic(state, p.id, { role: e.target.value }))}>
                    {Object.entries(ROLES[p.position]).map(([k, r]) => (
                      <option key={k} value={k}>
                        {r.label} ({roleFit(p, k)})
                      </option>
                    ))}
                  </select>
                  <select value={t.instr?.[p.id] ?? 'none'} onChange={(e) => onUpdate(setPlayerTactic(state, p.id, { instr: e.target.value }))}>
                    {INSTRUCTIONS.map((i) => (
                      <option key={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="card panel">
        <span className="eyebrow">SET-PIECE TAKERS</span>
        <Seg label="Corners" value={t.sp?.corner ?? 'far'} values={CORNER} change={(v) => onUpdate(setTactics(state, { sp: { ...t.sp, corner: v as never } }))} />
        <Seg label="Defending set pieces" value={t.sp?.marking ?? 'zonal'} values={MARKING} change={(v) => onUpdate(setTactics(state, { sp: { ...t.sp, marking: v as never } }))} />
        <Seg label="Left up for the counter" value={String(t.sp?.stayUp ?? 1)} values={['0', '1', '2']} change={(v) => onUpdate(setTactics(state, { sp: { ...t.sp, stayUp: Number(v) as 0 | 1 | 2 } }))} />
        {(['pens', 'corners', 'freekicks'] as const).map((k) => (
          <label className="sp-row" key={k}>
            <span>{k === 'pens' ? 'Penalties' : k === 'corners' ? 'Corners' : 'Free kicks'}</span>
            <select value={setPieceTaker(state, k)?.id ?? ''} onChange={(e) => onUpdate(setPlayerTactic(state, e.target.value, { taker: k }))}>
              {xi
                .filter((p) => p.position !== 'GK')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
        ))}
      </section>
    </>
  );
}
