import { useEffect, useRef } from 'react';
import type { GameState } from './game.ts';
import { pidFromTexts, playerProfile } from './profile.ts';
import { valueTrend } from './trends.ts';
import { Spark } from './Career.tsx';

/** Long-press never opens a profile from inside these (dialogs own their buttons). */
export const NO_LONG = '.pp-modal, [role="dialog"], .modal-backdrop, [data-noprofile]';
const SKIP = 'button, a, input, select, textarea, label, [role="tab"], [data-noprofile], .pp-modal';

/** Ids found by walking up from a tapped node: data-pid wins, then player names in the text. */
export function pidAt(state: GameState, el: Element | null, allowInteractive = false): string | null {
  if (!el) return null;
  if (!allowInteractive && el.closest(SKIP)) return null;
  if (el.closest('.pp-modal, .modal-backdrop')) return null;
  const tagged = el.closest<HTMLElement>('[data-pid]');
  if (tagged?.dataset.pid) return tagged.dataset.pid;
  const texts: string[] = [];
  for (let n: Element | null = el, i = 0; n && i < 6 && n !== document.body; n = n.parentElement, i++) {
    if (n.matches('main, nav, header, .app-shell, .tab-panel, .squad-grid')) break;
    texts.push(((n as HTMLElement).innerText ?? n.textContent ?? '').slice(0, 401));
  }
  return pidFromTexts(state, texts);
}

/** Global wiring: tap any player name/row opens the profile; long-press works on buttons too. */
export function usePlayerTaps(state: GameState | null, open: (id: string) => void) {
  const st = useRef(state); st.current = state;
  useEffect(() => {
    let timer = 0, longFired = false, firedAt = 0;
    const onClick = (e: MouseEvent) => {
      // Only swallow the click that ends the long-press itself (Android often sends none at all).
      if (longFired) { longFired = false; if (Date.now() - firedAt < 1200) { e.preventDefault(); e.stopPropagation(); return; } }
      const s = st.current; if (!s) return;
      if (window.getSelection()?.toString()) return;
      const id = pidAt(s, e.target as Element);
      if (id) open(id);
    };
    const onDown = (e: PointerEvent) => {
      const s = st.current; if (!s) return;
      longFired = false;
      const t = e.target as Element;
      // Never hijack buttons inside dialogs (Submit offer, Accept, Close…): they must always just work.
      if (!t.closest('button, [role="button"]') || t.closest(NO_LONG)) return;
      timer = window.setTimeout(() => { const id = pidAt(s, t.closest('button, [role="button"]'), true); if (id) { longFired = true; firedAt = Date.now(); open(id); } }, 550);
    };
    const cancel = () => clearTimeout(timer);
    document.addEventListener('click', onClick, true);
    document.addEventListener('pointerdown', onDown, { passive: true });
    for (const k of ['pointerup', 'pointercancel', 'pointermove', 'scroll'] as const) document.addEventListener(k, cancel, { passive: true, capture: true });
    return () => {
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('pointerdown', onDown);
      for (const k of ['pointerup', 'pointercancel', 'pointermove', 'scroll'] as const) document.removeEventListener(k, cancel, true);
    };
  }, [open]);
}

export function PlayerModal({ state, id, onClose }: { state: GameState; id: string; onClose: () => void }) {
  const pr = playerProfile(state, id);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', key); document.body.style.overflow = prev; };
  }, [onClose]);
  if (!pr) return null;
  return (
    <div className="pp-backdrop" onClick={onClose}>
      <section className="pp-modal" role="dialog" aria-modal="true" aria-label={`${pr.name} profile`} onClick={(e) => e.stopPropagation()}>
        <header className="pp-head">
          <div>
            <h2>{pr.name}</h2>
            <p>{pr.age} · {pr.position} ({pr.slot}) · {pr.foot} · {pr.club}</p>
          </div>
          <button ref={close} type="button" className="pp-close" aria-label="Close" onClick={onClose}>✕</button>
        </header>
        <div className="pp-body">
          <div className="pp-top">
            <span><small>Ability</small><b>{pr.ability}</b></span>
            <span><small>Potential</small><b>{pr.potential}</b></span>
            {pr.fitness !== null && <span><small>Fitness</small><b>{pr.fitness}%</b></span>}
            {pr.morale !== null && <span><small>Morale</small><b>{pr.morale}</b></span>}
          </div>
          {!pr.ours && !pr.scouted && <p className="pp-note">Not scouted — values are estimates. Scout him to narrow the ranges and reveal hidden attributes.</p>}
          {pr.status.length > 0 && <p className="pp-tags">{pr.status.map((t) => <span key={t}>{t}</span>)}</p>}
          <h3>Attributes</h3>
          <div className="pp-grid">{pr.attrs.map((a) => <span key={a.label}><small>{a.label}</small><b>{a.value}</b></span>)}</div>
          <h3>Hidden</h3>
          {pr.hidden ? <div className="pp-grid">{pr.hidden.map((a) => <span key={a.label}><small>{a.label}</small><b>{a.value}/20</b></span>)}</div> : <p className="muted small">Unknown until scouted.</p>}
          <h3>Personality & traits</h3>
          <p>{pr.personality}{pr.leadership !== null ? ` · Leadership ${pr.leadership}/20` : ''}</p>
          <p>{pr.traits.length ? pr.traits.join(' · ') : 'No notable traits'}</p>
          {pr.ours && (() => { const v = valueTrend(state, id); return <><h3>Value trend</h3>{v.length >= 2 ? <><Spark values={v} label={`Value over the last ${v.length} weeks`} /><p className="small">£{v[0]}k → £{v.at(-1)}k over {v.length} weeks {v.at(-1)! > v[0]! ? '📈' : v.at(-1)! < v[0]! ? '📉' : '➖'}</p></> : <p className="empty-note">📈 His value chart builds up week by week.</p>}</>; })()}
          <h3>Contract</h3>
          <p>{pr.contract}</p>
          <h3>Fitness & injury</h3>
          <p>{pr.injury ? `🚑 ${pr.injury}` : 'Fit to play'}</p>
          <h3>Stats</h3>
          <div className="pp-grid">{pr.stats.map((a) => <span key={a.label}><small>{a.label}</small><b>{a.value}</b></span>)}</div>
        </div>
      </section>
    </div>
  );
}
