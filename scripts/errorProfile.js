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

// Per-session rate for a substitution pair: occurrences / totalCharacters.
// totalCharacters means total keypresses (including backspaced and
// corrected ones), consistent with how state.totalKeystrokes is recorded.
export function sessionRate(sessionCount, session) {
  const total = Number.isInteger(session?.totalCharacters) && session.totalCharacters > 0
    ? session.totalCharacters
    : null;
  if (total === null) return null;
  return sessionCount / total;
}

// Improvement test over per-session rates, oldest -> newest. A pair is
// improving when the newest rate is at most 60% of the oldest rate and at
// least one middle rate is strictly below the oldest, which guards against
// a single-session cliff (e.g. 0.10 -> 0.10 -> 0.02) looking like a trend.
export function isImproving(rates) {
  if (rates.length < 3) return false;
  const oldest = rates[0];
  const newest = rates[rates.length - 1];
  if (!Number.isFinite(oldest) || !Number.isFinite(newest)) return false;
  if (oldest === 0) return true;
  if (!(newest <= oldest * 0.6)) return false;
  return rates.slice(1, -1).some((rate) => Number.isFinite(rate) && rate < oldest);
}

function runTimestamp(run) {
  const fromCompletedAt = Date.parse(run?.completedAt ?? '');
  if (Number.isFinite(fromCompletedAt)) return fromCompletedAt;
  const fromDate = Date.parse(run?.date ?? '');
  if (Number.isFinite(fromDate)) return fromDate;
  // No timestamp: fall back to best-effort ordering by id string.
  return typeof run?.id === 'string' ? run.id : '';
}

// A sticky habit: the same (expected, actual) pair appears in at least 3
// separate sessions with a stable rate (no decline over time), independent
// of word context — a motor habit, not spelling uncertainty. Runs are
// sorted oldest-first internally so callers may pass them in any order,
// including newest-first as stored in state.history.
export function findStickyHabits(runs = []) {
  // Never mutate the caller's array.
  const chronological = [...runs].sort((a, b) => {
    const ta = runTimestamp(a);
    const tb = runTimestamp(b);
    if (typeof ta === 'number' && typeof tb === 'number') return ta - tb;
    return String(ta).localeCompare(String(tb));
  });

  const sessionsByPair = new Map();
  const sessionById = new Map();
  chronological.forEach((run, runIndex) => {
    // The index is from the sorted array so synthetic ids are stable
    // regardless of the caller's input order.
    const sessionId = run?.id ?? `run-index-${runIndex}`;
    sessionById.set(sessionId, run);
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
    // Map insertion order matches chronological iteration, so this
    // reconstructs the pair's history oldest -> newest.
    const ordered = [...sessions.entries()].map(([sessionId, count]) => ({
      count,
      rate: sessionRate(count, sessionById.get(sessionId))
    }));
    // Sessions without a usable denominator are excluded from the trend
    // but still count toward sessions.size. Without at least 3 usable
    // rates there is no trend to assess, so the pair is not sticky.
    const usable = ordered.filter((entry) => Number.isFinite(entry.rate));
    if (usable.length < 3) continue;
    const windowed = usable.slice(-5);
    const rates = windowed.map((entry) => entry.rate);
    if (isImproving(rates)) continue;
    const [expected, actual] = JSON.parse(pair);
    habits.push({
      expected,
      actual,
      sessions: sessions.size,
      totalCount: ordered.reduce((sum, entry) => sum + entry.count, 0),
      rates
    });
  }
  return habits.sort((a, b) => b.sessions - a.sessions || b.totalCount - a.totalCount);
}

// Rate semantics: sameFingerRate / adjacentRate / homologousRate are each
// "share of mistakes carrying this label". They are NOT mutually exclusive —
// a single mistake such as e->d carries both 'adjacent' and 'same-finger'.
// labelOverlap is the average number of labels per mistake (1.0 = disjoint,
// 2.0 = every mistake carries two labels). Do not treat the rates as
// summing to 1, and do not renormalize them to sum to 1 — thresholds in
// diagnoseMechanically depend on per-label shares.
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
  const totalLabels = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
  const labelOverlap = total === 0 ? 0 : totalLabels / total;
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
      counts: { ...typeCounts },
      adjacent: typeCounts.adjacent,
      sameFinger: typeCounts['same-finger'],
      homologous: typeCounts.homologous,
      other: typeCounts.other,
      adjacentRate: summary.adjacentRate,
      sameFingerRate: summary.sameFingerRate,
      homologousRate: summary.homologousRate,
      labelOverlap
    },
    fingerDrift: drift,
    stickyHabits: findStickyHabits(runs),
    diagnoses: diagnoseMechanically(summary),
    labelOverlap
  };
}
