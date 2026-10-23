import { useState } from 'react';
import type { GameState } from './game.ts';
import { COLS, ROWS, depthChart, heatmap } from './depth.ts';

type Up = (s: GameState, m?: string) => void;
export function DepthPanel({ state }: { state: GameState; onUpdate?: Up }) {
  const chart = depthChart(state);
  const first = chart.flatMap((l) => l.players).find((p) => p.starting);
  const [sel, setSel] = useState<string | undefined>(first?.id);
  const p = state.players.find((x) => x.id === sel && x.clubId === state.clubId) ?? first;
  const heat = p ? heatmap(state, p) : [];
  return (
    <section className="card">
      <p className="eyebrow">DEPTH CHART</p>
      <h3>Who's next in line</h3>
      <div className="depth">
        {chart.map((line) => (
          <div key={line.pos} className="depth-line">
            <b className="depth-pos">{line.pos}</b>
            <div className="depth-chips">
              {line.players.map((x, i) => (
                <button key={x.id} className={`depth-chip ${x.starting ? 'start' : ''} ${x.id === p?.id ? 'on' : ''}`} onClick={() => setSel(x.id)} aria-label={`${x.name} heatmap`}>
                  <span>{x.starting ? '●' : i + 1 - line.players.filter((y) => y.starting).length + '.'} {x.name.split(' ').slice(-1)[0]}</span>
                  <small>{x.rating}{x.injured ? ' 🚑' : ''} · {x.fitness}%</small>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {p && (
        <>
          <p className="eyebrow">HEATMAP · {p.name} ({p.position})</p>
          <div className="heat" role="img" aria-label={`Heatmap for ${p.name}, attacking to the right`}>
            {Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => (
              <i key={`${r}-${c}`} style={{ background: `rgba(229,72,77,${0.08 + heat[r]![c]! * 0.85})` }} />
            )))}
          </div>
          <p className="muted small">Attacking → . Shaped by position, lane, mentality, pressing, individual instructions and this match's chances.</p>
        </>
      )}
    </section>
  );
}
