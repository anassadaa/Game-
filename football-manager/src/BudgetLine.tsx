import type { GameState } from './game.ts';
import { wageBill, wageLimit, wageRoom } from './budget.ts';

const money = (n: number) => (n >= 1000 ? `£${(n / 1000).toFixed(1)}m` : `£${n}k`);
/** Never show a negative budget: below zero it reads "Overspent £X". */
export const cashLabel = (n: number) => (n < 0 ? `Overspent ${money(-n)}` : money(n));

/** Remaining transfer funds + weekly wage budget, shown on Transfers and on every offer screen. */
export function BudgetLine({ state, extraWage, onMoney }: { state: GameState; extraWage?: number; onMoney?: () => void }) {
  const bill = wageBill(state), lim = wageLimit(state), room = wageRoom(state);
  const after = extraWage ? room - extraWage : null;
  return (
    <div className="budget-line" data-noprofile>
      <span>Transfer budget<b className={state.budget < 0 ? 'neg' : ''}>{state.budget < 0 ? `£0 · ${cashLabel(state.budget)}` : money(state.budget)}</b></span>
      <span>Wages £{bill}k / £{lim}k a week<b className={room < 0 ? 'neg' : ''}>{room >= 0 ? `£${room}k left` : `£${-room}k over`}</b></span>
      {after !== null && <span>After this deal<b className={after < 0 ? 'neg' : ''}>{after >= 0 ? `£${after}k left` : `£${-after}k over wage budget`}</b></span>}
      {onMoney && <button type="button" className="text-button" onClick={onMoney}>💰 Finances</button>}
    </div>
  );
}
