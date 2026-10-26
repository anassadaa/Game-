import type { Player, Position } from './game.ts';

export type GrowthCtx = {
  minutes: number;
  coaching: number;
  facilities: number;
  professionalism: number;
  leagueLevel: number;
  oppLevel?: number;
  form?: number;
  injured?: boolean;
  salt: string;
};

type PotPlayer = Player & {
  peakAge?: number;
  bloom?: number;
  boosted?: boolean;
  potTrend?: -1 | 0 | 1;
};

const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v));

const finite = (v: number | undefined, fallback: number): number =>
  Number.isFinite(v) ? (v as number) : fallback;

const POS_BASE_HEAD: Record<Position, number> = {
  GK: 16,
  DF: 17,
  MF: 19,
  FW: 20,
};

export function hash01(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export const POS_PEAK: Record<Position, number> = {
  GK: 30,
  DF: 28,
  MF: 27,
  FW: 26,
};

function deterministicBloom(id: string): number {
  return Math.floor(hash01(id + ':bloom') * 5) - 1;
}

export function peakAgeOf(p: PotPlayer): number {
  const base = POS_PEAK[p.position] ?? POS_PEAK.MF;
  const raw = Number.isFinite(p.bloom) ? (p.bloom as number) : deterministicBloom(p.id);
  const bloom = clamp(Math.round(raw), -1, 3);
  return clamp(base + bloom, 15, 40);
}

export function spawnPotential(o: {
  id: string;
  rating: number;
  age: number;
  position: Position;
  academy?: number;
  wonderkid?: boolean;
  leagueLevel?: number;
  regenPeak?: number;
}): number {
  const rating = clamp(Math.round(finite(o.rating, 50)), 0, 99);
  const age = clamp(finite(o.age, 18), 14, 45);
  const academy = clamp(Math.round(finite(o.academy ?? 2, 2)), 0, 5);
  const leagueLevel = clamp(Math.round(finite(o.leagueLevel ?? 1, 1)), 1, 5);
  const regenPeak = clamp(finite(o.regenPeak ?? rating, rating), rating, 99);

  const peak = POS_PEAK[o.position] + deterministicBloom(o.id);
  const ageFactor = clamp((peak - age) / Math.max(1, peak - 14), 0, 1);
  const leagueMod = clamp(1.18 - (leagueLevel - 1) * 0.075, 0.82, 1.18);
  const regenHead = Math.max(0, regenPeak - rating) * 0.45;
  const wonderBonus = o.wonderkid ? 7 : 0;

  const baseHead =
    (POS_BASE_HEAD[o.position] + 7 + academy * 2.6 + regenHead + wonderBonus) *
    ageFactor *
    leagueMod;

  const noise =
    (hash01(o.id + ':spawn:noise') - 0.5) * 6 * (0.15 + 0.85 * ageFactor);

  let head = baseHead + noise;
  const outlier = hash01(o.id + ':spawn:outlier');
  if (outlier < 0.018) {
    head += 5 + hash01(o.id + ':spawn:outlier2') * 11;
  } else if (outlier > 0.985) {
    head -= hash01(o.id + ':spawn:bad') * 4;
  }

  head = Math.max(0, head);
  let potential = clamp(Math.round(rating + head), rating, 99);

  if (o.wonderkid) {
    potential = Math.max(potential, Math.min(99, 86));
  }

  return clamp(potential, rating, 99);
}

export function weeklyGrowth(p: PotPlayer, ctx: GrowthCtx): number {
  if (ctx.injured) return 0;

  const actualRating = clamp(finite(p.rating, 50), 1, 99);
  const rating = Math.round(actualRating);
  const potential = clamp(
    Math.max(actualRating, Math.round(finite(p.potential, actualRating))),
    actualRating,
    99,
  );
  const age = clamp(finite(p.age, 18), 14, 50);
  const peak = peakAgeOf(p);
  const salt = ctx.salt ?? '';

  if (age < peak) {
    if (actualRating >= potential || actualRating + 1 > potential + 1e-9) return 0;

    const gap = clamp(potential - actualRating, 0, 99);
    const minutes = clamp(finite(ctx.minutes, 0), 0, 1);
    const coaching = clamp(finite(ctx.coaching, 10), 0, 20);
    const facilities = clamp(finite(ctx.facilities, 2), 0, 5);
    const professionalism = clamp(finite(ctx.professionalism, 10), 1, 20);
    const leagueLevel = clamp(Math.round(finite(ctx.leagueLevel, 3)), 1, 5);
    const oppLevel = clamp(finite(ctx.oppLevel ?? 60, 60), 40, 90);
    const form = clamp(finite(ctx.form ?? 0, 0), 0, 9);
    const formEff = form > 0 ? clamp(form, 5, 9) : 6.5;

    const gapFactor = Math.pow(Math.max(1, gap) / 10, 0.8);
    const minFactor = 0.45 + minutes * 0.85;
    const coachFactor = 0.65 + (coaching / 20) * 0.8;
    const facFactor = 0.75 + (facilities / 5) * 0.35;
    const profFactor = 0.75 + (professionalism / 20) * 0.45;
    const formFactor = 0.85 + clamp((formEff - 5) / 4, 0, 1) * 0.3;
    const levelFactor = clamp(
      0.88 + (6 - leagueLevel) * 0.03 + (oppLevel - 60) / 150,
      0.82,
      1.18,
    );
    const ageFactor = clamp(
      0.55 + 0.45 * clamp((peak - age) / 8, 0, 1),
      0.55,
      1,
    );

    const chance = clamp(
      0.035 *
        gapFactor *
        minFactor *
        coachFactor *
        facFactor *
        profFactor *
        formFactor *
        levelFactor *
        ageFactor,
      0,
      0.32,
    );

    const roll = hash01(
      p.id + ':growth:' + salt + ':' + rating + ':' + age,
    );
    return roll < chance ? 1 : 0;
  }

  if (actualRating <= 31) return 0;

  const yearsPast = Math.max(0, age - peak);
  const posRate =
    p.position === 'GK'
      ? 0.006
      : p.position === 'DF'
        ? 0.008
        : p.position === 'MF'
          ? 0.011
          : 0.014;
  const professionalism = clamp(finite(ctx.professionalism, 10), 1, 20);
  const profMod = clamp(1.25 - (professionalism / 20) * 0.5, 0.75, 1.25);
  const declineChance = clamp(0.006 + yearsPast * posRate * profMod, 0, 0.35);
  const roll = hash01(
    p.id + ':decline:' + salt + ':' + rating + ':' + age,
  );
  return roll < declineChance ? -1 : 0;
}

export function reviewCeiling(
  p: PotPlayer,
  ctx: GrowthCtx,
): { potential: number; trend: -1 | 0 | 1 } {
  const rating = clamp(Math.round(finite(p.rating, 50)), 1, 99);
  const originalPotential = clamp(
    Math.round(finite(p.potential, rating)),
    rating,
    99,
  );
  let current = originalPotential;
  const age = clamp(finite(p.age, 18), 14, 50);
  const peak = peakAgeOf(p);
  const minutes = clamp(finite(ctx.minutes, 0), 0, 1);
  const form = clamp(finite(ctx.form ?? 0, 0), 0, 9);
  const injured = !!ctx.injured;
  const salt = ctx.salt ?? '';

  let trend: -1 | 0 | 1 = 0;

  if (age > peak) {
    if (current > rating) {
      const roll = hash01(
        p.id + ':reviewPast:' + salt + ':' + current + ':' + age,
      );
      const chance = clamp(0.35 + (age - peak) * 0.05, 0.35, 0.85);
      if (roll < chance) {
        const cut =
          1 +
          Math.floor(
            hash01(p.id + ':reviewPastCut:' + salt) * 2,
          );
        current = Math.max(rating, current - cut);
        trend = current < originalPotential ? -1 : 0;
      }
    }
    return { potential: current, trend };
  }

  const bloom = clamp(
    Math.round(
      Number.isFinite(p.bloom) ? (p.bloom as number) : deterministicBloom(p.id),
    ),
    -1,
    3,
  );

  const good = !injured && minutes >= 0.5 && form >= 7;
  const stall =
    injured || minutes < 0.2 || (form > 0 && form < 6);

  if (good) {
    const chance = clamp(
      0.2 +
        Math.max(0, bloom) * 0.06 +
        (minutes - 0.5) * 0.1 +
        (form - 7) * 0.04,
      0,
      0.6,
    );
    const roll = hash01(
      p.id + ':reviewGood:' + salt + ':' + current + ':' + rating,
    );
    if (roll < chance && current < 99) {
      const delta =
        1 +
        Math.floor(
          hash01(p.id + ':reviewGoodDelta:' + salt) * 3,
        );
      current = Math.min(99, current + delta);
      trend = 1;
    }
  } else if (stall && current > rating) {
    const chance = clamp(
      0.22 +
        (1 - minutes) * 0.18 +
        (injured ? 0.16 : 0) +
        Math.max(0, 6 - (form || 6)) * 0.05 -
        Math.max(0, bloom) * 0.03,
      0,
      0.65,
    );
    const roll = hash01(
      p.id + ':reviewStall:' + salt + ':' + current + ':' + rating,
    );
    if (roll < chance) {
      const delta =
        1 +
        Math.floor(
          hash01(p.id + ':reviewStallDelta:' + salt) * 3,
        );
      current = Math.max(rating, current - delta);
      trend = -1;
    }
  }

  return { potential: clamp(current, rating, 99), trend };
}

export function scoutEstimate(o: {
  playerId: string;
  scoutId: string;
  scoutSkill: number;
  knowledge: number;
  rating: number;
  age: number;
  position: Position;
  apps?: number;
  ratingSum?: number;
}): {
  lo: number;
  hi: number;
  mid: number;
  confidence: 'Low' | 'Medium' | 'High';
} {
  const rating = clamp(Math.round(finite(o.rating, 50)), 1, 99);
  const age = clamp(finite(o.age, 18), 14, 45);
  const skill = clamp(finite(o.scoutSkill, 10), 0, 20);
  const knowledge = clamp(finite(o.knowledge, 0), 0, 100);
  const peak = POS_PEAK[o.position] ?? POS_PEAK.MF;

  const apps = Math.max(0, finite(o.apps ?? 0, 0));
  const ratingSum = finite(o.ratingSum ?? 0, 0);
  const form = apps > 0 ? clamp(ratingSum / apps, 5, 9) : 6.5;

  const formBonus = (form - 6.5) * 1.2;
  const ageTrajectory =
    age <= peak ? (peak - age) * 0.75 : -(age - peak) * 0.9;

  const rawBias =
    (hash01(o.scoutId + '|' + o.playerId + '|bias') - 0.5) * 12;
  const skillShrink = clamp(1 - (skill / 20) * 0.7, 0.3, 1);
  const bias = rawBias * skillShrink;

  let mid = Math.round(rating + ageTrajectory + formBonus + bias);
  mid = clamp(mid, rating, 99);

  const baseWidth =
    2.5 +
    (100 - knowledge) * 0.105 +
    (20 - skill) * 0.22 +
    Math.max(0, 24 - age) * 0.18;
  const width = clamp(baseWidth, 2, 27);

  let lo = clamp(Math.round(mid - width), 1, 99);
  let hi = clamp(Math.round(mid + width), 1, 99);
  if (lo > mid) lo = mid;
  if (hi < mid) hi = mid;
  lo = Math.max(1, Math.min(lo, mid));
  hi = Math.min(99, Math.max(hi, mid));

  const confidence: 'Low' | 'Medium' | 'High' =
    knowledge >= 70 ? 'High' : knowledge >= 35 ? 'Medium' : 'Low';

  return { lo, hi, mid, confidence };
}

export function prospectBoost(p: PotPlayer): number {
  const rating = finite(p.rating, 0);
  const potential = finite(p.potential, rating);
  if (p.age <= 23 && rating < potential && !p.boosted) return 1;
  return 0;
}

export function migratePotential(p: PotPlayer): PotPlayer {
  const out: PotPlayer = { ...p };
  const id = String(p.id ?? '');

  const bloom = Number.isFinite(p.bloom)
    ? clamp(Math.round(p.bloom as number), -1, 3)
    : deterministicBloom(id);

  out.bloom = bloom;

  if (!Number.isFinite(p.peakAge)) {
    out.peakAge = clamp((POS_PEAK[p.position] ?? POS_PEAK.MF) + bloom, 15, 40);
  } else {
    out.peakAge = p.peakAge as number;
  }

  const ratingFloor = clamp(finite(p.rating, 50), 0, 99);
  out.potential = clamp(
    finite(p.potential, ratingFloor),
    ratingFloor,
    99,
  );

  return out;
}
