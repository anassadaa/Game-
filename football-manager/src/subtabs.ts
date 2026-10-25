/** FM Mobile-style sub-pages so long screens become short ones. */
export const SUBTABS: Record<string, { id: string; label: string }[]> = {
  squad: [
    { id: 'players', label: 'Players' },
    { id: 'depth', label: 'Depth' },
    { id: 'dressing', label: 'Dressing room' },
    { id: 'medical', label: 'Medical' },
  ],
  tactics: [
    { id: 'lineup', label: 'Lineup' },
    { id: 'shape', label: 'Instructions' },
    { id: 'training', label: 'Training' },
  ],
  club: [
    { id: 'board', label: 'Board' },
    { id: 'investments', label: 'Investments' },
    { id: 'career', label: 'Career' },
    { id: 'cups', label: 'Cups' },
    { id: 'fixtures', label: 'Fixtures' },
  ],
  transfers: [
    { id: 'market', label: 'Market' },
    { id: 'offers', label: 'Offers' },
    { id: 'sell', label: 'Sell' },
  ],
};
export function pickSub(tab: string, want: string | null | undefined): string | null {
  const list = SUBTABS[tab];
  if (!list) return null;
  return list.some((s) => s.id === want) ? want! : list[0]!.id;
}
