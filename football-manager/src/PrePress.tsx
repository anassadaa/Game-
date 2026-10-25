import type { GameState } from './game.ts';
import { answerPre, preQuestion } from './prepress.ts';
const TONE = ['Measured · board +', 'Bold · fans +', 'Players first · morale +'];
export function PrePressCard({ state, onUpdate }: { state: GameState; onUpdate: (s: GameState, m?: string) => void }) {
  const q = preQuestion(state);
  if (!q) return null;
  return (
    <section className={`card prepress-card${q.derby ? ' derby' : ''}`}>
      <span className="eyebrow">🎙️ PRE-MATCH PRESS</span>
      <h3>{q.q}</h3>
      <div className="pp-list">
        {q.a.map((a, i) => (
          <button key={i} className="secondary pp-btn" onClick={() => onUpdate(answerPre(state, i as 0 | 1 | 2), 'Press conference done.')}>
            <span>“{a}”</span><small>{TONE[i]}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
