import test from 'node:test';
import assert from 'node:assert/strict';
import { buildErrorProfile, buildSubstitutionMatrix, findStickyHabits, isImproving, sessionRate } from '../scripts/errorProfile.js';
import { DEFAULT_SETTINGS, STORAGE_KEY, loadState, state } from '../scripts/state.js';
import { MemoryStorage } from './helpers/memoryStorage.js';

const mistake = (expected, actual, overrides = {}) => ({
  expected,
  actual,
  word: 'word',
  characterIndex: 0,
  timestamp: 1_000,
  latencyMs: 45,
  prevChar: null,
  nextChar: null,
  positionInWord: 'middle',
  wasCorrected: false,
  ...overrides
});

test('buildSubstitutionMatrix counts pairs and averages latency', () => {
  const matrix = buildSubstitutionMatrix([
    mistake('e', 'w', { latencyMs: 40 }),
    mistake('e', 'w', { latencyMs: 60 }),
    mistake('e', 'r', { latencyMs: 200 })
  ]);
  assert.equal(matrix.e.w.count, 2);
  assert.equal(matrix.e.w.avgLatencyMs, 50);
  assert.equal(matrix.e.r.count, 1);
  assert.equal(matrix.e.r.avgLatencyMs, 200);
});

test('buildSubstitutionMatrix skips malformed mistakes', () => {
  assert.deepEqual(buildSubstitutionMatrix([null, { expected: 'e' }]), {});
});

test('buildErrorProfile aggregates distributions, rates, and diagnoses', () => {
  const runs = [{
    id: 'run-1',
    mistakes: [
      mistake('e', 'w', { latencyMs: 40, positionInWord: 'start', wasCorrected: true }),
      mistake('e', 'w', { latencyMs: 50, positionInWord: 'middle' }),
      mistake('e', 'd', { latencyMs: 900, positionInWord: 'end' })
    ]
  }];
  const profile = buildErrorProfile(runs);
  assert.equal(profile.runsAnalyzed, 1);
  assert.equal(profile.totalMistakes, 3);
  assert.equal(profile.commonSubstitutions[0].expected, 'e');
  assert.equal(profile.commonSubstitutions[0].actual, 'w');
  assert.equal(profile.commonSubstitutions[0].count, 2);
  assert.deepEqual(profile.positionBias, { start: 1, middle: 1, end: 1 });
  assert.equal(profile.correctionRate, 1 / 3);
  assert.deepEqual(profile.latencyBands, { motor: 2, cognitive: 1 });
  assert.equal(profile.fingerErrorDistribution.leftMiddle, 3);
  assert.ok(profile.classificationSummary.adjacentRate > 0.5);
  assert.ok(Array.isArray(profile.diagnoses));
  assert.ok(profile.diagnoses.length <= 2, 'diagnoses are capped at two');
  if (profile.diagnoses.length > 0) {
    assert.equal(
      profile.diagnoses.filter((d) => d.primary).length,
      1,
      'exactly one primary diagnosis'
    );
  }
});

test('buildErrorProfile on empty input returns zeroed rates and no diagnoses', () => {
  const profile = buildErrorProfile([]);
  assert.equal(profile.totalMistakes, 0);
  assert.equal(profile.correctionRate, 0);
  assert.deepEqual(profile.diagnoses, []);
  assert.deepEqual(profile.stickyHabits, []);
});

test('findStickyHabits flags pairs persisting across three sessions without declining', () => {
  const runs = [1, 2, 3].map((session) => ({
    id: `run-${session}`,
    // Ascending timestamps: oldest first in the fixture, but the function
    // must not depend on caller order.
    completedAt: `2026-09-${10 + session}T12:00:00.000Z`,
    totalCharacters: 100,
    mistakes: [mistake('e', 'w'), mistake('t', 'y')]
  }));
  const habits = findStickyHabits(runs);
  assert.equal(habits[0].expected, 'e');
  assert.equal(habits[0].actual, 'w');
  assert.equal(habits[0].sessions, 3);
  // Flat rate 0.01 across sessions is not improving, so both pairs are sticky.
  assert.equal(habits.length, 2);
});

test('findStickyHabits ignores declining pairs and single-session pairs', () => {
  const runs = [
    { id: 'run-1', completedAt: '2026-09-11T12:00:00.000Z', totalCharacters: 100, mistakes: [mistake('e', 'w'), mistake('e', 'w'), mistake('e', 'w'), mistake('e', 'w')] },
    { id: 'run-2', completedAt: '2026-09-12T12:00:00.000Z', totalCharacters: 100, mistakes: [mistake('e', 'w')] },
    { id: 'run-3', completedAt: '2026-09-13T12:00:00.000Z', totalCharacters: 100, mistakes: [mistake('e', 'w')] },
    { id: 'run-4', completedAt: '2026-09-14T12:00:00.000Z', totalCharacters: 100, mistakes: [mistake('a', 's')] }
  ];
  const habits = findStickyHabits(runs);
  // Rates 0.04 -> 0.01 -> 0.01: newest <= oldest * 0.6 and the middle rate
  // is below the oldest, so the pair is improving and not sticky.
  assert.ok(!habits.some(({ expected }) => expected === 'e'), 'improving pair is not sticky');
  assert.ok(!habits.some(({ expected }) => expected === 'a'), 'single-session pair is not sticky');
});

test('latency bands are relative to the rolling run baseline when available', () => {
  const mistakes = [
    mistake('e', 'w', { latencyMs: 100 }),
    mistake('e', 'w', { latencyMs: 50 }),
    mistake('e', 'd', { latencyMs: 500 })
  ];
  const relative = buildErrorProfile([{ id: 'run-1', latencyBaseline: 300, mistakes }]);
  // baseline 300: motor < 150, transition <= 600
  assert.deepEqual(relative.latencyBands, { motor: 2, transition: 1 });

  const fallback = buildErrorProfile([{ id: 'run-1', mistakes }]);
  // absolute thresholds: 50 motor, 100 transition, 500 cognitive
  assert.deepEqual(fallback.latencyBands, { motor: 1, transition: 1, cognitive: 1 });
});

test('overall baseline uses the 5 most recent valid run baselines', () => {
  // Runs arrive newest-first; the first 5 valid baselines are the 5 most
  // recent, so the overall baseline is median(160,150,140,130,120) = 140.
  const runs = [160, 150, 140, 130, 120, 110, 100].map((latencyBaseline, index) => ({
    id: `run-${index}`,
    latencyBaseline,
    mistakes: [mistake('e', 'w', { latencyMs: 260 })]
  }));
  const profile = buildErrorProfile(runs);
  // 260 <= 140*2 is transition; against 120 it would be cognitive.
  assert.deepEqual(profile.latencyBands, { transition: 7 });
});

test('invalid or missing run baselines fall back to absolute thresholds', () => {
  for (const latencyBaseline of [-5, 0, 'abc', null, undefined]) {
    const profile = buildErrorProfile([{
      id: 'run-1',
      latencyBaseline,
      mistakes: [mistake('e', 'w', { latencyMs: 100 })]
    }]);
    assert.deepEqual(profile.latencyBands, { transition: 1 }, `baseline ${String(latencyBaseline)} falls back`);
  }
});

test('the overall baseline reaches the mechanical diagnosis', () => {
  const mistakes = Array.from({ length: 5 }, () =>
    mistake('e', 'w', { latencyMs: 90 })); // adjacent, avg 90ms
  const withBaseline = buildErrorProfile([{ id: 'run-1', latencyBaseline: 200, mistakes }]);
  assert.ok(
    withBaseline.diagnoses.some(({ pattern }) => pattern === 'vertical-finger-drift'),
    '90ms is fast against a 200ms baseline'
  );
  const withoutBaseline = buildErrorProfile([{ id: 'run-1', mistakes }]);
  assert.ok(
    !withoutBaseline.diagnoses.some(({ pattern }) => pattern === 'vertical-finger-drift'),
    '90ms is not fast against the absolute 80ms threshold'
  );
});

const runWith = (id, day, totalCharacters, count, expected = 'e', actual = 'w') => ({
  id,
  completedAt: `2026-09-${String(day).padStart(2, '0')}T12:00:00.000Z`,
  totalCharacters,
  mistakes: Array.from({ length: count }, () => mistake(expected, actual))
});

test('findStickyHabits handles newest-first input identically to chronological input', () => {
  // Fixtures mimic state.history (newest-first) in one call and chronological
  // in the other; internal sorting must make the results identical.
  const chronological = [
    runWith('run-1', 11, 100, 1),
    runWith('run-2', 12, 100, 1),
    runWith('run-3', 13, 100, 1)
  ];
  const newestFirst = [...chronological].reverse();
  assert.deepEqual(
    findStickyHabits(newestFirst).map(({ expected, actual, sessions, totalCount }) => ({ expected, actual, sessions, totalCount })),
    findStickyHabits(chronological).map(({ expected, actual, sessions, totalCount }) => ({ expected, actual, sessions, totalCount })),
    'caller order does not affect results'
  );
});

test('findStickyHabits ignores an improving-but-nonzero pair', () => {
  // Rates 0.08 -> 0.05 -> 0.02: newest <= oldest * 0.6 and a middle rate is
  // strictly below the oldest, so the pair is improving despite nonzero.
  const runs = [
    runWith('run-1', 11, 50, 4),
    runWith('run-2', 12, 60, 3),
    runWith('run-3', 13, 100, 2)
  ];
  const habits = findStickyHabits(runs);
  assert.ok(!habits.some(({ expected }) => expected === 'e'), 'improving pair is not sticky');
});

test('findStickyHabits keeps flat and rising rates sticky', () => {
  const flat = [
    runWith('run-1', 11, 100, 2),
    runWith('run-2', 12, 100, 2),
    runWith('run-3', 13, 100, 2)
  ];
  const flatHabits = findStickyHabits(flat);
  assert.equal(flatHabits.length, 1, 'flat rate is sticky');
  assert.deepEqual(flatHabits[0].rates, [0.02, 0.02, 0.02]);

  const rising = [
    runWith('run-1', 11, 200, 1),
    runWith('run-2', 12, 200, 2),
    runWith('run-3', 13, 200, 3)
  ];
  const risingHabits = findStickyHabits(rising);
  assert.equal(risingHabits.length, 1, 'rising rate is sticky');
});

test('findStickyHabits skips sessions with null totalCharacters from the trend but counts them', () => {
  const runs = [
    runWith('run-1', 11, 100, 2),
    runWith('run-2', 12, null, 2),
    runWith('run-3', 13, 100, 2)
  ];
  // Only 2 usable rates: no trend can be assessed, so not sticky and no crash.
  assert.deepEqual(findStickyHabits(runs), []);
});

test('findStickyHabits treats a single-session cliff as not improving', () => {
  // Rates 0.10 -> 0.10 -> 0.02: the newest rate dropped enough, but no
  // middle rate is strictly below the oldest, so it is not a trend.
  const runs = [
    runWith('run-1', 11, 100, 10),
    runWith('run-2', 12, 100, 10),
    runWith('run-3', 13, 100, 2)
  ];
  const habits = findStickyHabits(runs);
  assert.equal(habits.length, 1, 'single-session cliff stays sticky');
  assert.equal(habits[0].sessions, 3);
});

test('findStickyHabits windows the trend to the last 5 sessions', () => {
  // Six sessions: a very high rate in the oldest, flat afterwards. The
  // window ignores the oldest session, so the flat tail is not improving.
  const runs = [
    runWith('run-1', 10, 50, 20),
    runWith('run-2', 11, 100, 1),
    runWith('run-3', 12, 100, 1),
    runWith('run-4', 13, 100, 1),
    runWith('run-5', 14, 100, 1),
    runWith('run-6', 15, 100, 1)
  ];
  const habits = findStickyHabits(runs);
  assert.equal(habits.length, 1, 'flat last-5 window stays sticky despite old high rate');
  assert.equal(habits[0].sessions, 6);
  assert.equal(habits[0].rates.length, 5, 'exposed rates reflect the 5-session window');
});

test('findStickyHabits orders runs by completedAt, then date, then id', () => {
  // Caller order is scrambled; sorting must recover true chronological order.
  // With rates 0.04 -> 0.01 -> 0.01 the pair is improving only if the
  // timestamps (not the ids or the caller order) drive the sort.
  const runs = [
    runWith('run-z', 13, 100, 1),
    runWith('run-a', 11, 100, 4),
    { id: 'run-m', date: '2026-09-12', totalCharacters: 100, mistakes: [mistake('e', 'w')] }
  ];
  const habits = findStickyHabits(runs);
  assert.ok(!habits.some(({ expected }) => expected === 'e'), 'ordering by completedAt > date > id');

  // Id fallback with no timestamps at all: id order 'a' < 'b' < 'c' gives
  // rates 0.01 -> 0.01 -> 0.04 (sticky); raw caller order would give
  // 0.04 -> 0.01 -> 0.01 (improving, not sticky).
  const idOnly = [
    { id: 'c', totalCharacters: 100, mistakes: Array.from({ length: 4 }, () => mistake('e', 'w')) },
    { id: 'a', totalCharacters: 100, mistakes: [mistake('e', 'w')] },
    { id: 'b', totalCharacters: 100, mistakes: [mistake('e', 'w')] }
  ];
  const idHabits = findStickyHabits(idOnly);
  assert.equal(idHabits.length, 1, 'id string order is used when no timestamps exist');
});

test('sessionRate rejects invalid denominators', () => {
  assert.equal(sessionRate(4, { totalCharacters: 100 }), 0.04);
  assert.equal(sessionRate(4, { totalCharacters: null }), null);
  assert.equal(sessionRate(4, { totalCharacters: 0 }), null);
  assert.equal(sessionRate(4, { totalCharacters: -10 }), null);
  assert.equal(sessionRate(4, { totalCharacters: 10.5 }), null);
  assert.equal(sessionRate(4, null), null);
  assert.equal(sessionRate(4, {}), null);
});

test('isImproving applies the 60% drop and middle-rate guard', () => {
  assert.ok(isImproving([0.08, 0.05, 0.02]), 'clear decline');
  assert.ok(!isImproving([0.10, 0.10, 0.02]), 'single-session cliff is not a trend');
  assert.ok(!isImproving([0.02, 0.02, 0.02]), 'flat rates are not improving');
  assert.ok(!isImproving([0.02, 0.03, 0.04]), 'rising rates are not improving');
  assert.ok(!isImproving([0.08, 0.05]), 'fewer than 3 rates');
  assert.ok(!isImproving([0.08, NaN, 0.02]), 'non-finite rate');
  assert.ok(isImproving([0, 0.05, 0.02]), 'cannot improve from zero');
});

test('buildErrorProfile exposes labelOverlap for multi-label mistakes', () => {
  const runs = [{
    id: 'run-1',
    totalCharacters: 30,
    completedAt: '2026-09-19T12:00:00.000Z',
    mistakes: [
      mistake('e', 'w'), // adjacent: 1 label
      mistake('e', 'd'), // adjacent + same-finger: 2 labels
      mistake('e', 'i')  // homologous: 1 label
    ]
  }];
  const profile = buildErrorProfile(runs);
  assert.equal(profile.totalMistakes, 3);
  // total labels = 4, so overlap = 4/3.
  assert.ok(Math.abs(profile.labelOverlap - 4 / 3) < 1e-9);
  assert.equal(profile.classificationSummary.labelOverlap, profile.labelOverlap);
  assert.ok(profile.classificationSummary.adjacentRate > 0.5);
  assert.deepEqual(profile.classificationSummary.counts, {
    adjacent: 2,
    'same-finger': 1,
    homologous: 1,
    other: 0
  });
});

test('category rates are not mutually exclusive and can sum above 1', () => {
  const runs = [{
    id: 'run-1',
    totalCharacters: 20,
    completedAt: '2026-09-19T12:00:00.000Z',
    mistakes: [mistake('e', 'd'), mistake('e', 'd')] // each carries 2 labels
  }];
  const profile = buildErrorProfile(runs);
  const { adjacentRate, sameFingerRate, homologousRate } = profile.classificationSummary;
  assert.ok(adjacentRate + sameFingerRate + homologousRate > 1.0,
    `expected overlapping rates, got sum=${adjacentRate + sameFingerRate + homologousRate}`);
  assert.equal(profile.labelOverlap, 2.0);
});

test('buildErrorProfile exposes zero labelOverlap with no mistakes', () => {
  const profile = buildErrorProfile([]);
  assert.equal(profile.labelOverlap, 0);
  assert.deepEqual(profile.diagnoses, []);
});

test('buildErrorProfile handles a single empty session', () => {
  const profile = buildErrorProfile([{
    id: 'run-1', mistakes: [], totalCharacters: 100, completedAt: '2026-09-19T12:00:00.000Z'
  }]);
  assert.equal(profile.runsAnalyzed, 1);
  assert.equal(profile.totalMistakes, 0);
  assert.equal(profile.correctionRate, 0);
  assert.deepEqual(profile.diagnoses, []);
  assert.deepEqual(profile.stickyHabits, []);
  assert.equal(profile.labelOverlap, 0);
});

test('buildErrorProfile tolerates null runs and non-array mistakes', () => {
  const profile = buildErrorProfile([null, { id: 'run-1' }, { id: 'run-2', mistakes: 'not-an-array' }]);
  assert.equal(profile.runsAnalyzed, 3);
  assert.equal(profile.totalMistakes, 0);
});

test('buildSubstitutionMatrix excludes non-positive and non-finite latencies from averages', () => {
  const matrix = buildSubstitutionMatrix([
    { expected: 'e', actual: 'w', latencyMs: 100 },
    { expected: 'e', actual: 'w', latencyMs: -5 },
    { expected: 'e', actual: 'w', latencyMs: NaN },
    // The real filter is Number.isFinite(latency) && latency >= 0, so
    // Infinity is excluded from the average even though Infinity >= 0.
    { expected: 'e', actual: 'w', latencyMs: Infinity },
    { expected: 'e', actual: 'w', latencyMs: null }
  ]);
  assert.equal(matrix.e.w.count, 5);
  assert.equal(matrix.e.w.avgLatencyMs, 100);
});

test('findStickyHabits is not sticky without per-session denominators', () => {
  // Rate-based contract (Issue 2): no totalCharacters means no rate, and
  // sessions without a usable rate are excluded from the trend — so this
  // pair can never be flagged, however often it repeats.
  const runs = [
    { mistakes: [{ expected: 'e', actual: 'w' }] },
    { mistakes: [{ expected: 'e', actual: 'w' }] },
    { mistakes: [{ expected: 'e', actual: 'w' }] }
  ];
  assert.deepEqual(findStickyHabits(runs), []);
});

test('error profile is stable across save/load', () => {
  const storage = new MemoryStorage();
  const runs = [
    { id: 'run-3', wpm: 62, accuracy: 94, difficulty: 'medium', totalCharacters: 100,
      completedAt: '2026-09-19T12:00:00.000Z',
      mistakes: [{ expected: 'e', actual: 'w', word: 'the', characterIndex: 2, timestamp: 1_000, latencyMs: 55, prevChar: 'h', nextChar: ' ', positionInWord: 'end', wasCorrected: false }] },
    { id: 'run-2', wpm: 61, accuracy: 93, difficulty: 'medium', totalCharacters: 100,
      completedAt: '2026-09-18T12:00:00.000Z',
      mistakes: [{ expected: 'e', actual: 'w', word: 'the', characterIndex: 2, timestamp: 1_000, latencyMs: 50, prevChar: 'h', nextChar: ' ', positionInWord: 'end', wasCorrected: false }] },
    { id: 'run-1', wpm: 60, accuracy: 92, difficulty: 'medium', totalCharacters: 100,
      completedAt: '2026-09-17T12:00:00.000Z',
      mistakes: [{ expected: 'e', actual: 'w', word: 'the', characterIndex: 2, timestamp: 1_000, latencyMs: 45, prevChar: 'h', nextChar: ' ', positionInWord: 'end', wasCorrected: false }] }
  ];
  storage.setItem(STORAGE_KEY, JSON.stringify({ settings: DEFAULT_SETTINGS, history: runs }));

  const previous = globalThis.localStorage;
  try {
    globalThis.localStorage = storage;
    assert.equal(loadState(), true);
  } finally {
    globalThis.localStorage = previous;
  }

  // Storage order is newest-first; findStickyHabits must sort internally.
  const profile = buildErrorProfile(state.history);
  assert.equal(profile.totalMistakes, 3);
  assert.equal(profile.commonSubstitutions[0].expected, 'e');
  assert.equal(profile.commonSubstitutions[0].actual, 'w');
  assert.equal(profile.commonSubstitutions[0].count, 3);
  assert.ok(profile.stickyHabits.some((h) => h.expected === 'e' && h.actual === 'w'));

  state.history = [];
});
