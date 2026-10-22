import { stature } from './jobs.ts';
import type { Club } from './game.ts';
import { WORLD } from './world.ts';

export type Background = { id: string; label: string; rep: number | null; blurb: string };
export const BACKGROUNDS: Background[] = [
  { id: 'sunday', label: 'Sunday league', rep: 10, blurb: 'No badges, no name. Start at the bottom.' },
  { id: 'semipro', label: 'Semi-pro', rep: 25, blurb: 'A few seasons in the lower leagues.' },
  { id: 'explayer', label: 'Ex-player', rep: 45, blurb: 'Your playing career opens some doors.' },
  { id: 'exint', label: 'Ex-international', rep: 65, blurb: 'Capped for your country; boards listen.' },
  { id: 'famous', label: 'Famous coach', rep: 80, blurb: 'A proven name. Most clubs will talk.' },
  { id: 'sandbox', label: 'Unlimited (sandbox)', rep: null, blurb: 'Every club selectable; reputation from club.' },
];
/** How far above your reputation a club's stature may be and still hire you. */
export const MARGIN = 15;
const ST = WORLD.map((w) => stature(w as unknown as Club));
const LO = Math.min(...ST), HI = Math.max(...ST);
/** Reputation needed, spread over the whole world: weakest club 0, biggest 95. */
export const repNeeded = (c: Pick<Club, 'rating' | 'division'>) =>
  Math.max(0, Math.round(((stature(c as Club) - LO) / Math.max(1, HI - LO)) * (95 + MARGIN)) - MARGIN);
export const locked = (c: Pick<Club, 'rating' | 'division'>, rep: number | null) => rep !== null && repNeeded(c) > rep;
