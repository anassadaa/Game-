import type { GameState } from './game.ts';
import { badges, managerLevel } from './fun.ts';
import { wagesVsIncome } from './trends.ts';

/** Tiny line chart (no library). */
export function Spark({ values, label, color = '#2f7d4f', height = 44 }: { values: number[]; label: string; color?: string; height?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * 100},${height - 4 - ((v - lo) / span) * (height - 8)}`).join(' ');
  return <svg className="spark" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" role="img" aria-label={label}><polyline points={pts} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>;
}

export function WagesChart({ state }: { state: GameState }) {
  const d = wagesVsIncome(state).slice(-12);
  if (d.length < 2) return <p className="empty-note">📈 Play a few weeks and your income vs wages chart appears here.</p>;
  const hi = Math.max(1, ...d.map((x) => Math.max(x.income, x.wages)));
  return (
    <div className="wage-chart" role="img" aria-label="Weekly income against wages">
      <div className="wage-bars">{d.map((x, i) => <div key={i} title={`${x.label}: income £${x.income}k, wages £${x.wages}k`}><i className="inc" style={{ height: `${(x.income / hi) * 100}%` }} /><i className="wag" style={{ height: `${(x.wages / hi) * 100}%` }} /></div>)}</div>
      <div className="wage-legend"><span><i className="inc" /> Income/wk</span><span><i className="wag" /> Wages/wk</span><b>{d.at(-1)!.income >= d.at(-1)!.wages ? '✅ Wages covered' : '⚠️ Wages above income'}</b></div>
    </div>
  );
}

export function CareerCard({ state }: { state: GameState }) {
  const l = managerLevel(state), list = badges(state), got = list.filter((b) => b.got).length;
  const pct = Math.round(((l.xp - l.from) / Math.max(1, l.next - l.from)) * 100);
  return (
    <section className="card career-card">
      <div className="career-top"><span className="eyebrow">MANAGER LEVEL</span><b className="career-level">Lv {l.level}</b><small>{got}/{list.length} badges</small></div>
      <div className="career-xp" aria-label={`${pct}% to next level`}><i style={{ width: `${pct}%` }} /></div>
      <div className="badge-row">{list.map((b) => <span key={b.id} className={`badge-chip${b.got ? ' got' : ''}`} title={b.got ? b.name : `Locked: ${b.hint}`}>{b.icon}<small>{b.got ? b.name : b.hint}</small></span>)}</div>
      <span className="eyebrow">INCOME VS WAGES</span>
      <WagesChart state={state} />
    </section>
  );
}
