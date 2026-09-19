import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifySubstitution,
  diagnoseMechanically,
  fingerForKey,
  isHomologousPair,
  keyboardDistance,
  latencyBand,
  severityScore,
  summarizeFingerDrift
} from '../scripts/errorClassification.js';

test('finger map covers the QWERTY home rows and thumbs', () => {
  assert.equal(fingerForKey('e'), 'leftMiddle');
  assert.equal(fingerForKey('E'), 'leftMiddle');
  assert.equal(fingerForKey('i'), 'rightMiddle');
  assert.equal(fingerForKey('r'), 'leftIndex');
  assert.equal(fingerForKey('u'), 'rightIndex');
  assert.equal(fingerForKey(';'), 'rightPinky');
  assert.equal(fingerForKey(' '), 'thumb');
  assert.equal(fingerForKey('?'), null);
  assert.equal(fingerForKey('ab'), null);
});

test('keyboard distance is Chebyshev distance on the QWERTY grid', () => {
  assert.equal(keyboardDistance('e', 'w'), 1);
  assert.equal(keyboardDistance('e', 'd'), 1);
  assert.equal(keyboardDistance('e', 'e'), 0);
  assert.equal(keyboardDistance('e', 'i'), 5);
  assert.equal(keyboardDistance('e', '?'), null);
});

test('homologous pairs mirror across hands on the same finger class', () => {
  assert.equal(isHomologousPair('e', 'i'), true);
  assert.equal(isHomologousPair('r', 'u'), true);
  assert.equal(isHomologousPair('e', 'w'), false);
  assert.equal(isHomologousPair('e', 'e'), false);
});

test('classifySubstitution labels adjacent, same-finger, and homologous errors', () => {
  assert.deepEqual(classifySubstitution('e', 'w').types, ['adjacent']);
  assert.deepEqual(classifySubstitution('e', 'd').types, ['adjacent', 'same-finger']);
  assert.deepEqual(classifySubstitution('e', 'i').types, ['homologous']);
  assert.deepEqual(classifySubstitution('e', 'z').types, ['other']);
  assert.equal(classifySubstitution('e', 'w').adjacencyDistance, 1);
});

test('latency bands split motor, transition, and cognitive errors', () => {
  assert.equal(latencyBand(79), 'motor');
  assert.equal(latencyBand(80), 'transition');
  assert.equal(latencyBand(400), 'transition');
  assert.equal(latencyBand(401), 'cognitive');
  assert.equal(latencyBand(null), 'unknown');
  assert.equal(latencyBand(-5), 'unknown');
});

test('latencyBand is relative to a per-user baseline when provided', () => {
  assert.equal(latencyBand(79, 200), 'motor');      // 79 < 200*0.5
  assert.equal(latencyBand(100, 200), 'transition'); // exactly at the motor cutoff
  assert.equal(latencyBand(150, 200), 'transition'); // 150 <= 200*2
  assert.equal(latencyBand(400, 200), 'transition'); // exactly at the transition cutoff
  assert.equal(latencyBand(500, 200), 'cognitive');  // 500 > 200*2
  // Invalid baselines fall back to the absolute 80/400 thresholds.
  assert.equal(latencyBand(79, null), 'motor');
  assert.equal(latencyBand(79, 0), 'motor');
  assert.equal(latencyBand(79, -5), 'motor');
  assert.equal(latencyBand(90, 100), 'transition');  // 90 >= 100*0.5 under a fast baseline
  assert.equal(latencyBand(null, 200), 'unknown');
});

test('severityScore and diagnoseMechanically accept a baseline', () => {
  const relative = severityScore({ adjacencyDistance: 5, latencyMs: 300, wasCorrected: true, baseline: 100 });
  const absolute = severityScore({ adjacencyDistance: 5, latencyMs: 300, wasCorrected: true });
  // 300ms is cognitive against a 100ms baseline but transition against 80/400.
  assert.ok(relative < absolute, 'baseline-relative band changes the score');

  const driftRelative = diagnoseMechanically({ adjacentRate: 0.5, avgLatencyMs: 90, baseline: 200 });
  assert.deepEqual(driftRelative.map(({ pattern }) => pattern), ['vertical-finger-drift']);
  const driftAbsolute = diagnoseMechanically({ adjacentRate: 0.5, avgLatencyMs: 90, baseline: null });
  assert.deepEqual(driftAbsolute, [], '90ms is not fast against the absolute 80ms threshold');
});

test('severity scores motor blind spots highest and corrected errors lowest', () => {
  const blindSpot = severityScore({ adjacencyDistance: 1, latencyMs: 40, wasCorrected: false });
  const corrected = severityScore({ adjacencyDistance: 1, latencyMs: 40, wasCorrected: true });
  const cognitive = severityScore({ adjacencyDistance: 5, latencyMs: 900, wasCorrected: false });
  assert.ok(blindSpot > corrected, 'corrected errors score lower');
  assert.ok(blindSpot > cognitive, 'fast adjacent blind spots score highest');
  assert.ok(severityScore() >= 0 && severityScore() <= 100, 'score stays in 0-100');
});

test('summarizeFingerDrift measures index encroachment from mistakes', () => {
  const mistakes = [
    { expected: 'e', actual: 'r' }, // leftMiddle -> leftIndex
    { expected: 'e', actual: 't' }, // leftMiddle -> leftIndex
    { expected: 'a', actual: 's' }  // leftPinky -> leftRing
  ];
  const { indexEncroachmentRate, transitions } = summarizeFingerDrift(mistakes);
  assert.equal(indexEncroachmentRate, 2 / 3);
  assert.equal(transitions[0].transition, 'leftMiddle->leftIndex');
  assert.equal(transitions[0].count, 2);
});

test('diagnoseMechanically fires each rule only past its threshold', () => {
  const overreach = diagnoseMechanically({ sameFingerRate: 0.4, indexEncroachmentRate: 0.3 });
  assert.deepEqual(overreach.map(({ pattern }) => pattern), ['index-finger-overreach']);

  const drift = diagnoseMechanically({ adjacentRate: 0.5, avgLatencyMs: 60 });
  assert.deepEqual(drift.map(({ pattern }) => pattern), ['vertical-finger-drift']);

  const mapping = diagnoseMechanically({ homologousRate: 0.2 });
  assert.deepEqual(mapping.map(({ pattern }) => pattern), ['hand-mapping-confusion']);

  const load = diagnoseMechanically({ cognitiveRate: 0.25 });
  assert.deepEqual(load.map(({ pattern }) => pattern), ['high-cognitive-load']);

  assert.deepEqual(diagnoseMechanically({ sameFingerRate: 0.4, indexEncroachmentRate: 0.1 }), []);
  assert.deepEqual(diagnoseMechanically({}), []);
});
