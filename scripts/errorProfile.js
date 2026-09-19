// Rolling error profile: aggregates keystroke mistake logs across sessions
// into the structures the analyzer needs — substitution/confusion matrix,
// finger and position distributions, latency bands, and mechanical
// diagnoses. Only aggregated counts, latencies, and ratios ever leave this
// module; raw typed text stays out, per the plan's privacy rules.

import {
  classifySubstitution,
  diagnoseMechanically,
  fingerForKey,
  latencyBand,
  summarizeFingerDrift
} from './errorClassification.js';
import { median } from './passageRun.js';

function mistakesIn(runs = []) {
  return runs.flatMap((run) => (Array.isArray(run?.mistakes) ? run.mistakes : []));
}

function finiteLatencies(mistakes) {
  return mistakes
    .map((mistake) => mistake?.latencyMs)
    .filter((latency) => Number.isFinite(latency) && latency >= 0);
}

function average(values) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Personal confusion matrix: expected -> actual -> { count, avgLatencyMs }.
export function buildSubstitutionMatrix(mistakes = []) {
  const matrix = {};
  for (const mistake of mistakes) {
    if (typeof mistake?.expected !== 'string' || typeof mistake?.actual !== 'string') continue;
    const row = (matrix[mistake.expected] ??= {});
    const cell = (row[mistake.actual] ??= { count: 0, latencies: [] });
    cell.count += 1;
    if (Number.isFinite(mistake.latencyMs) && mistake.latencyMs >= 0) cell.latencies.push(mistake.latencyMs);
  }
  for (const row of Object.values(matrix)) {
    for (const [actual, cell] of Object.entries(row)) {
      row[actual] = { count: cell.count, avgLatencyMs: average(cell.latencies) };
    }
  }
  return matrix;
}

function flattenMatrix(matrix) {
  const pairs = [];
  for (const [expected, row] of Object.entries(matrix)) {
    for (const [actual, cell] of Object.entries(row)) {
      pairs.push({ expected, actual, count: cell.count, avgLatencyMs: cell.avgLatencyMs });
    }
  }
  return pairs.sort((a, b) => b.count - a.count);
}

function countBy(mistakes, keyFn) {
  const counts = {};
  for (const mistake of mistakes) {
    const key = keyFn(mistake) ?? 'unknown';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// Rolling typing-speed baseline across runs: median of the per-run
// baselines. Runs arrive newest-first (see state.history), so the first 5
// valid baselines are the 5 most recent — a short window keeps the estimate
// responsive to the user's current speed instead of going stale. No valid
// baselines (e.g. all legacy entries) => null, and callers fall back to the
// absolute 80/400ms thresholds.
function getOverallBaseline(runs = []) {
  const baselines = [];
  for (const run of runs) {
    const value = run?.latencyBaseline;
    if (Number.isFinite(value) && value > 0) baselines.push(value);
    if (baselines.length >= 5) break;
  }
  return median(baselines);
}

// A sticky habit: the same (expected, actual) pair appears in at least 3
// separate sessions with a stable rate (no decline over time), independent
// of word context — a motor habit, not spelling uncertainty.
export function findStickyHabits(runs = []) {
  const sessionsByPair = new Map();
  runs.forEach((run, runIndex) => {
    const sessionId = run?.id ?? `run-index-${runIndex}`;
    for (const mistake of mistakesIn([run])) {
      if (typeof mistake?.expected !== 'string' || typeof mistake?.actual !== 'string') continue;
      const pair = JSON.stringify([mistake.expected, mistake.actual]);
      if (!sessionsByPair.has(pair)) sessionsByPair.set(pair, new Map());
      const sessions = sessionsByPair.get(pair);
      sessions.set(sessionId, (sessions.get(sessionId) ?? 0) + 1);
    }
  });
  const habits = [];
  for (const [pair, sessions] of sessionsByPair) {
    if (sessions.size < 3) continue;
    const counts = [...sessions.values()];
    const latest = counts[counts.length - 1];
    const earliest = counts[0];
    const declining = latest < earliest * 0.5;
    if (declining) continue;
    const [expected, actual] = JSON.parse(pair);
    habits.push({
      expected,
      actual,
      sessions: sessions.size,
      totalCount: counts.reduce((sum, count) => sum + count, 0)
    });
  }
  return habits.sort((a, b) => b.sessions - a.sessions || b.totalCount - a.totalCount);
}

export function buildErrorProfile(runs = []) {
  const mistakes = mistakesIn(runs);
  const substitutionMatrix = buildSubstitutionMatrix(mistakes);
  const commonSubstitutions = flattenMatrix(substitutionMatrix).slice(0, 10);

  const classifications = mistakes.map((mistake) => classifySubstitution(mistake.expected, mistake.actual));
  const typeCounts = { adjacent: 0, 'same-finger': 0, homologous: 0, other: 0 };
  for (const { types } of classifications) {
    for (const type of types) typeCounts[type] = (typeCounts[type] ?? 0) + 1;
  }
  const total = mistakes.length;
  const rate = (count) => (total === 0 ? 0 : count / total);

  // Classify every mistake's latency against the user's own recent speed
  // when a baseline exists; otherwise the absolute thresholds apply.
  const baseline = getOverallBaseline(runs);
  const latencyBands = countBy(mistakes, (mistake) => latencyBand(mistake?.latencyMs, baseline));
  const corrected = mistakes.filter((mistake) => mistake?.wasCorrected === true).length;
  const drift = summarizeFingerDrift(mistakes);

  const summary = {
    sameFingerRate: rate(typeCounts['same-finger']),
    adjacentRate: rate(typeCounts.adjacent),
    homologousRate: rate(typeCounts.homologous),
    cognitiveRate: rate(latencyBands.cognitive ?? 0),
    avgLatencyMs: average(finiteLatencies(mistakes)),
    indexEncroachmentRate: drift.indexEncroachmentRate,
    baseline
  };

  return {
    runsAnalyzed: runs.length,
    totalMistakes: total,
    substitutionMatrix,
    commonSubstitutions,
    fingerErrorDistribution: countBy(mistakes, (mistake) => fingerForKey(mistake?.expected)),
    positionBias: countBy(mistakes, (mistake) => mistake?.positionInWord),
    latencyBands,
    correctionRate: rate(corrected),
    classificationSummary: {
      adjacent: typeCounts.adjacent,
      sameFinger: typeCounts['same-finger'],
      homologous: typeCounts.homologous,
      other: typeCounts.other,
      adjacentRate: summary.adjacentRate,
      sameFingerRate: summary.sameFingerRate,
      homologousRate: summary.homologousRate
    },
    fingerDrift: drift,
    stickyHabits: findStickyHabits(runs),
    diagnoses: diagnoseMechanically(summary)
  };
}
