import test from 'node:test';
import assert from 'node:assert/strict';
import { buildErrorProfile, buildSubstitutionMatrix, findStickyHabits } from '../scripts/errorProfile.js';

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
    mistakes: [mistake('e', 'w'), mistake('t', 'y')]
  }));
  const habits = findStickyHabits(runs);
  assert.equal(habits[0].expected, 'e');
  assert.equal(habits[0].actual, 'w');
  assert.equal(habits[0].sessions, 3);
});

test('findStickyHabits ignores declining pairs and single-session pairs', () => {
  const runs = [
    { id: 'run-1', mistakes: [mistake('e', 'w'), mistake('e', 'w'), mistake('e', 'w'), mistake('e', 'w')] },
    { id: 'run-2', mistakes: [mistake('e', 'w')] },
    { id: 'run-3', mistakes: [mistake('e', 'w')] },
    { id: 'run-4', mistakes: [mistake('a', 's')] }
  ];
  const habits = findStickyHabits(runs);
  assert.ok(!habits.some(({ expected }) => expected === 'e'), 'declining pair is not sticky');
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
