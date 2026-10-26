import test from 'node:test'; import assert from 'node:assert/strict';
import { newGame, startMatch, advanceWeek, minSaleFee } from '../src/game.ts';
import { simToEnd } from '../src/highlights.ts';
import { setMode, managerCandidates, hireManager } from '../src/managers.ts';
import { plan } from '../src/delegate.ts';
import { isProtected } from '../src/protect.ts';
import { stepValue } from '../src/value.ts';
test('3.3 sim: a club deep in the red for a whole season never sells below value and never sells a protected player', () => {
  for (const [seed, mode] of [[12, 'chairman'], [7, 'owner'], [21, 'director']]) {
    let s = setMode(newGame(seed), mode); s = hireManager(s, managerCandidates(s).find(m => m.rating >= 3).id, 3);
    plan(s).approveOver = 1e9; const mine = (x) => x.players.filter(p => p.clubId === x.clubId);
    mine(s).slice(0, 4).forEach((p, i) => { p.boughtAt = { s: 1, w: 1, paid: p.price * (1.3 + i * 0.2) }; });
    const start = s.season; let sales = 0, loans = 0;
    while (s.season === start && s.week < 18) {
      s.budget = Math.min(s.budget, -3000);
      const before = new Map(mine(s).map(p => [p.id, { ...p }]));
      const n = advanceWeek(simToEnd(startMatch(s)));
      if (n.season !== start || n.sacked || n === s) break; // season over, or the board sacked us
      for (const [id, p] of before) {
        if (mine(n).some(q => q.id === id)) continue;
        if ((n.loansOut ?? []).some(q => q.id === id)) { loans++; assert.ok(!isProtected(p), `protected ${p.name} loaned`); continue; }
        const h = n.headlines.find(x => x.startsWith(`${p.name} departs for £`)); if (!h) continue; // released / retired, not a sale
        sales++; const fee = Number(h.match(/£(\d+)k/)[1]);
        assert.ok(!isProtected(p), `seed ${seed} W${s.week}: protected ${p.name} sold`);
        // 3.4: values move weekly (≤8%) before sales run, so compare with the lowest value he could have had at sale time; never below what we paid.
        const floor = minSaleFee({ ...p, price: stepValue(p.price, 0) });
        assert.ok(fee >= floor, `seed ${seed} W${s.week}: ${p.name} sold for ${fee} < ${floor}`);
      }
      s = n;
    }
    assert.ok(sales + loans > 0, `seed ${seed}: the board did nothing in the red`);
  }
});
