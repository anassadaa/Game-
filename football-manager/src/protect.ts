// 3.2: protected players — wonderkids and young high-potential prospects. Nobody sells them, and the hired
// manager never lets their contracts run down, without the owner's approval.
import type { Player } from './game.ts';
export const isProtected = (p: Pick<Player, 'age' | 'rating' | 'potential'> & { wonderkid?: boolean }) =>
  !!p.wonderkid || (p.age < 23 && p.potential >= 65 && p.potential - p.rating >= 10);
