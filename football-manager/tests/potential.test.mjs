import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  hash01,
  POS_PEAK,
  peakAgeOf,
  spawnPotential,
  weeklyGrowth,
  reviewCeiling,
  scoutEstimate,
  prospectBoost,
  migratePotential,
} from '../src/potential.ts';

function player(over = {}) {
  return {
    id: 'p',
    age: 18,
    position: 'MF',
    rating: 60,
    potential: 85,
    ...over,
  };
}

test('hash01 is deterministic and in [0,1)', () => {
  assert.equal(hash01('abc'), hash01('abc'));
  for (const s of ['', 'a', 'player-1', 'touchline', 'x|y|z']) {
    const h = hash01(s);
    assert.ok(h >= 0 && h < 1);
  }
});

test('position peak ages and personal bloom', () => {
  assert.equal(POS_PEAK.GK, 30);
  assert.equal(POS_PEAK.DF, 28);
  assert.equal(POS_PEAK.MF, 27);
  assert.equal(POS_PEAK.FW, 26);

  assert.equal(peakAgeOf(player({ id: 'gk', position: 'GK', bloom: 0 })), 30);
  assert.equal(peakAgeOf(player({ id: 'df', position: 'DF', bloom: 0 })), 28);
  assert.equal(peakAgeOf(player({ id: 'mf', position: 'MF', bloom: 0 })), 27);
  assert.equal(peakAgeOf(player({ id: 'fw', position: 'FW', bloom: 0 })), 26);
  assert.equal(peakAgeOf(player({ id: 'fw', position: 'FW', bloom: 3 })), 29);
});

test('spawnPotential respects bounds, wonderkid floor, and age/academy trends', () => {
  for (let i = 0; i < 500; i++) {
    const rating = 80;
    const wonderkid = i % 2 === 0;
    const pot = spawnPotential({
      id: `bounds-${i}`,
      rating,
      age: 16,
      position: 'FW',
      academy: 5,
      wonderkid,
      leagueLevel: 1,
    });
    assert.ok(pot >= rating);
    assert.ok(pot <= 99);
    if (wonderkid) assert.ok(pot >= 86);
  }

  function avgHeadroom(age, academy) {
    let sum = 0;
    const n = 250;
    for (let i = 0; i < n; i++) {
      sum +=
        spawnPotential({
          id: `trend-${i}`,
          rating: 55,
          age,
          position: 'MF',
          academy,
          leagueLevel: 2,
        }) - 55;
    }
    return sum / n;
  }

  const young = avgHeadroom(16, 3);
  const old = avgHeadroom(25, 3);
  assert.ok(young > old + 3);

  const highAcademy = avgHeadroom(16, 5);
  const lowAcademy = avgHeadroom(16, 0);
  assert.ok(highAcademy > lowAcademy + 3);
});

test('weeklyGrowth: young starter grows more than unused benchwarmer', () => {
  const base = player({
    id: 'starter',
    age: 18,
    position: 'MF',
    rating: 60,
    potential: 85,
    bloom: 0,
  });

  let starterTotal = 0;
  let benchTotal = 0;

  for (let i = 0; i < 50; i++) {
    for (let w = 0; w < 38; w++) {
      starterTotal += weeklyGrowth(
        { ...base, id: `starter-${i}` },
        {
          minutes: 1,
          coaching: 18,
          facilities: 4,
          professionalism: 16,
          leagueLevel: 2,
          oppLevel: 70,
          form: 7.5,
          injured: false,
          salt: `w${w}`,
        },
      );

      benchTotal += weeklyGrowth(
        { ...base, id: `bench-${i}` },
        {
          minutes: 0.05,
          coaching: 18,
          facilities: 4,
          professionalism: 16,
          leagueLevel: 2,
          oppLevel: 70,
          form: 6,
          injured: false,
          salt: `w${w}`,
        },
      );
    }
  }

  assert.ok(starterTotal > benchTotal);
});

test('weeklyGrowth: injured players do not grow', () => {
  let total = 0;
  for (let w = 0; w < 25; w++) {
    total += weeklyGrowth(
      player({ id: 'injured', age: 18, rating: 60, potential: 85 }),
      {
        minutes: 1,
        coaching: 18,
        facilities: 4,
        professionalism: 16,
        leagueLevel: 2,
        oppLevel: 70,
        form: 8,
        injured: true,
        salt: `inj-${w}`,
      },
    );
  }
  assert.equal(total, 0);
});

test('weeklyGrowth: after peak FW declines faster than GK on average', () => {
  let fwDeclines = 0;
  let gkDeclines = 0;

  for (let i = 0; i < 200; i++) {
    for (let w = 0; w < 12; w++) {
      fwDeclines += -weeklyGrowth(
        player({
          id: `fw-${i}`,
          age: 34,
          position: 'FW',
          rating: 80,
          potential: 80,
          bloom: 0,
        }),
        {
          minutes: 0.5,
          coaching: 10,
          facilities: 3,
          professionalism: 10,
          leagueLevel: 2,
          form: 6.5,
          salt: `d${w}`,
        },
      );

      gkDeclines += -weeklyGrowth(
        player({
          id: `gk-${i}`,
          age: 34,
          position: 'GK',
          rating: 80,
          potential: 80,
          bloom: 0,
        }),
        {
          minutes: 0.5,
          coaching: 10,
          facilities: 3,
          professionalism: 10,
          leagueLevel: 2,
          form: 6.5,
          salt: `d${w}`,
        },
      );
    }
  }

  assert.ok(fwDeclines > gkDeclines);
});

test('reviewCeiling produces both bloomers and busts', () => {
  let bloomers = 0;
  let busts = 0;

  for (let i = 0; i < 200; i++) {
    const good = i < 100;
    const p = player({
      id: `review-${i}`,
      age: 19,
      position: 'MF',
      rating: 60,
      potential: 70,
      bloom: (i % 5) - 1,
    });

    const r = reviewCeiling(p, {
      minutes: good ? 0.8 : 0.1,
      coaching: 15,
      facilities: 3,
      professionalism: 12,
      leagueLevel: 2,
      form: good ? 7.5 : 5.5,
      injured: false,
      salt: 'review',
    });

    assert.ok(r.potential >= 60);
    assert.ok(r.potential <= 99);
    if (r.trend === 1) bloomers++;
    if (r.trend === -1) busts++;
  }

  assert.ok(bloomers > 0);
  assert.ok(busts > 0);
});

test('scoutEstimate has stable scout bias, different scouts, and confidence tags', () => {
  const base = {
    playerId: 'target-player',
    scoutId: 'scout-0',
    scoutSkill: 10,
    knowledge: 50,
    rating: 60,
    age: 18,
    position: 'MF',
  };

  const a = scoutEstimate(base);
  const b = scoutEstimate(base);
  assert.deepEqual(a, b);
  assert.ok(a.lo >= 1);
  assert.ok(a.lo <= a.mid);
  assert.ok(a.mid <= a.hi);
  assert.ok(a.hi <= 99);

  const mids = new Set();
  for (let i = 0; i < 30; i++) {
    const est = scoutEstimate({ ...base, scoutId: `scout-${i}` });
    mids.add(est.mid);
  }
  assert.ok(mids.size > 1);

  assert.equal(scoutEstimate({ ...base, knowledge: 80 }).confidence, 'High');
  assert.equal(scoutEstimate({ ...base, knowledge: 50 }).confidence, 'Medium');
  assert.equal(scoutEstimate({ ...base, knowledge: 10 }).confidence, 'Low');
});

test('prospectBoost only fires once under the conditions', () => {
  assert.equal(
    prospectBoost(player({ age: 22, rating: 70, potential: 80 })),
    1,
  );
  assert.equal(
    prospectBoost(
      player({ age: 22, rating: 70, potential: 80, boosted: true }),
    ),
    0,
  );
  assert.equal(
    prospectBoost(player({ age: 24, rating: 70, potential: 80 })),
    0,
  );
  assert.equal(
    prospectBoost(player({ age: 22, rating: 80, potential: 80 })),
    0,
  );
});

test('migratePotential fills missing fields, clamps potential, and is idempotent', () => {
  const raw = player({
    id: 'migrate-me',
    age: 18,
    position: 'MF',
    rating: 70,
    potential: 120,
  });

  const migrated = migratePotential(raw);
  const migratedAgain = migratePotential(migrated);

  assert.deepEqual(migratedAgain, migrated);
  assert.ok(migrated.potential >= 70);
  assert.ok(migrated.potential <= 99);
  assert.ok(migrated.bloom >= -1);
  assert.ok(migrated.bloom <= 3);
  assert.ok(Number.isFinite(migrated.peakAge));
});
