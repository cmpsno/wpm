// Mechanical error classification for typing mistakes.
//
// This module implements the classification layer of the typing error
// analyzer: a static QWERTY finger map, key-adjacency geometry, substitution
// taxonomy (adjacent / same-finger / homologous), latency bands, a severity
// score, and the rule-based mechanical diagnosis used as the no-LLM fallback.
//
// Note on the input model: this app locks printable input after an error
// until Backspace clears it, so every logged mistake is a substitution
// (expected -> actual). Insertion / omission / transposition are not
// observable here, which is why the taxonomy below only classifies
// substitutions.

const FINGER_KEY_MAP = Object.freeze({
  leftPinky: ['q', 'a', 'z'],
  leftRing: ['w', 's', 'x'],
  leftMiddle: ['e', 'd', 'c'],
  leftIndex: ['r', 't', 'f', 'g', 'v', 'b'],
  rightIndex: ['y', 'u', 'h', 'j', 'n', 'm'],
  rightMiddle: ['i', 'k'],
  rightRing: ['o', 'l'],
  rightPinky: ['p', ';', '/'],
  thumb: [' ']
});

const KEY_TO_FINGER = new Map();
for (const [finger, keys] of Object.entries(FINGER_KEY_MAP)) {
  for (const key of keys) KEY_TO_FINGER.set(key, finger);
}

// Physical layout used for adjacency. Rows are the unshifted QWERTY rows;
// columns follow visual order, so Chebyshev distance on this grid is the
// number of keys between two positions.
const KEYBOARD_ROWS = Object.freeze(['`1234567890-=', 'qwertyuiop[]', "asdfghjkl;'", 'zxcvbnm,./']);
const KEY_POSITION = new Map();
KEYBOARD_ROWS.forEach((row, rowIndex) => {
  [...row].forEach((key, colIndex) => KEY_POSITION.set(key, [rowIndex, colIndex]));
});

const MIRROR_FINGERS = Object.freeze({
  leftPinky: 'rightPinky',
  leftRing: 'rightRing',
  leftMiddle: 'rightMiddle',
  leftIndex: 'rightIndex',
  rightIndex: 'leftIndex',
  rightMiddle: 'leftMiddle',
  rightRing: 'leftRing',
  rightPinky: 'leftPinky'
});

const LATENCY = Object.freeze({
  motor: 80,        // Fallback when no per-user baseline exists.
  transition: 400   // Fallback when no per-user baseline exists.
});

// Latency cutoffs relative to a per-user baseline: a "fast" keystroke for a
// slow typist is different from a fast one for a speed demon. motor <
// baseline*0.5, transition <= baseline*2.0. With no valid baseline we fall
// back to the absolute LATENCY constants above.
function baselineCutoffs(baseline) {
  const hasBaseline = Number.isFinite(baseline) && baseline > 0;
  return {
    motor: hasBaseline ? baseline * 0.5 : LATENCY.motor,
    transition: hasBaseline ? baseline * 2.0 : LATENCY.transition
  };
}

// Diagnosis precedence, most specific first. When several mechanical
// diagnoses fire for one session they share a root cause more often than
// not, so the list is ordered by specificity and at most MAX_DIAGNOSES are
// returned: one primary, the rest secondary. The most specific claim is
// also the most actionable, and it usually explains the generic one.
const DIAGNOSIS_PRECEDENCE = Object.freeze([
  'hand-mapping-confusion',
  'index-finger-overreach',
  'high-cognitive-load',
  'vertical-finger-drift'
]);

const MAX_DIAGNOSES = 2;

function normalizeKey(key) {
  return typeof key === 'string' && [...key].length === 1 ? key.toLowerCase() : null;
}

export function fingerForKey(key) {
  const normalized = normalizeKey(key);
  return normalized === null ? null : KEY_TO_FINGER.get(normalized) ?? null;
}

export function keyboardDistance(a, b) {
  const first = normalizeKey(a);
  const second = normalizeKey(b);
  if (first === null || second === null) return null;
  const posA = KEY_POSITION.get(first);
  const posB = KEY_POSITION.get(second);
  if (!posA || !posB) return null;
  return Math.max(Math.abs(posA[0] - posB[0]), Math.abs(posA[1] - posB[1]));
}

export function isHomologousPair(a, b) {
  const first = normalizeKey(a);
  const second = normalizeKey(b);
  if (first === null || second === null || first === second) return false;
  const fingerA = KEY_TO_FINGER.get(first);
  const fingerB = KEY_TO_FINGER.get(second);
  return Boolean(fingerA && fingerB && MIRROR_FINGERS[fingerA] === fingerB);
}

// Classify one substitution. A mistake can carry several labels at once
// (e.g. e -> d is both adjacent and same-finger); 'other' is used only when
// none of the mechanical explanations apply.
export function classifySubstitution(expected, actual) {
  const types = [];
  const adjacencyDistance = keyboardDistance(expected, actual);
  if (adjacencyDistance === 1) types.push('adjacent');
  const expectedFinger = fingerForKey(expected);
  const actualFinger = fingerForKey(actual);
  if (expectedFinger !== null && expectedFinger === actualFinger) types.push('same-finger');
  if (isHomologousPair(expected, actual)) types.push('homologous');
  if (types.length === 0) types.push('other');
  return { expected, actual, types, adjacencyDistance, expectedFinger, actualFinger };
}

// Classify latency relative to the user's baseline when one is provided;
// the second parameter defaults to null so single-argument call sites keep
// the absolute 80/400ms behavior.
export function latencyBand(latencyMs, baseline = null) {
  if (!Number.isFinite(latencyMs) || latencyMs < 0) return 'unknown';
  const { motor, transition } = baselineCutoffs(baseline);
  if (latencyMs < motor) return 'motor';
  if (latencyMs <= transition) return 'transition';
  return 'cognitive';
}

// 0-100 severity: closer keys + shorter latency => confident motor error;
// uncorrected mistakes count as blind spots and score higher than
// self-corrected ones.
export function severityScore({ adjacencyDistance = null, latencyMs = null, wasCorrected = false, baseline = null } = {}) {
  const adjacencyComponent = adjacencyDistance === 1 ? 1
    : adjacencyDistance === 2 ? 0.6
    : adjacencyDistance === 3 ? 0.3
    : 0.1;
  const band = latencyBand(latencyMs, baseline);
  const latencyComponent = band === 'motor' ? 1
    : band === 'transition' ? 0.6
    : band === 'cognitive' ? 0.2
    : 0.5;
  const correctionComponent = wasCorrected ? 0.4 : 1;
  const weighted = 0.45 * adjacencyComponent + 0.35 * latencyComponent + 0.2 * correctionComponent;
  return Math.round(100 * weighted);
}

const isIndexFinger = (finger) => finger === 'leftIndex' || finger === 'rightIndex';

// Summarize finger involvement across mistakes. Because only mistakes (not
// every keystroke) are logged, the plan's overuse ratio
// (actual/expected key counts per finger) is approximated with an
// encroachment rate: how often the landed key belongs to an index finger
// while the intended key did not.
export function summarizeFingerDrift(mistakes = []) {
  const transitions = new Map();
  let known = 0;
  let indexEncroachments = 0;
  for (const mistake of mistakes) {
    const expectedFinger = fingerForKey(mistake?.expected);
    const actualFinger = fingerForKey(mistake?.actual);
    if (expectedFinger === null || actualFinger === null) continue;
    known += 1;
    const key = `${expectedFinger}->${actualFinger}`;
    transitions.set(key, (transitions.get(key) ?? 0) + 1);
    if (isIndexFinger(actualFinger) && !isIndexFinger(expectedFinger)) indexEncroachments += 1;
  }
  return {
    transitions: [...transitions.entries()]
      .map(([transition, count]) => ({ transition, count }))
      .sort((a, b) => b.count - a.count),
    indexEncroachmentRate: known === 0 ? 0 : indexEncroachments / known
  };
}

// Rule-based mechanical diagnosis (no LLM required). Each rule maps to one
// of the plan's fallback patterns; the LLM layer can later consume these
// same signals for prose generation.
export function diagnoseMechanically(summary = {}) {
  const {
    sameFingerRate = 0,
    adjacentRate = 0,
    homologousRate = 0,
    cognitiveRate = 0,
    avgLatencyMs = null,
    indexEncroachmentRate = 0,
    // Optional per-user baseline (median correct-keystroke latency). When
    // absent, the vertical-finger-drift rule falls back to the absolute
    // 80ms motor threshold.
    baseline = null
  } = summary;
  // Unknown patterns sort LAST, never first: DIAGNOSIS_PRECEDENCE.indexOf
  // returns -1 for a missing pattern, which would otherwise sort it to the
  // front of the list.
  const precedenceOf = (pattern) => {
    const index = DIAGNOSIS_PRECEDENCE.indexOf(pattern);
    return index === -1 ? DIAGNOSIS_PRECEDENCE.length : index;
  };

  const candidates = [];
  const motorThreshold = baselineCutoffs(baseline).motor;

  if (sameFingerRate > 0.3 && indexEncroachmentRate > 0.2) {
    candidates.push({
      pattern: 'index-finger-overreach',
      detail: 'Errors repeatedly land on index-finger keys while aiming at neighboring columns.',
      recommendation: 'Drill home-row reaches with the middle and ring fingers held down, e.g. slow "dededed fdfdfd" rows before speeding up.'
    });
  }
  if (adjacentRate > 0.4 && avgLatencyMs !== null && avgLatencyMs < motorThreshold) {
    candidates.push({
      pattern: 'vertical-finger-drift',
      detail: 'Fast adjacent-key substitutions suggest fingers drifting up/down a column instead of curling to the home row.',
      recommendation: 'Practice column drills (qaz, wsx, edc, rfv) at low speed, lifting each finger straight up rather than sliding.'
    });
  }
  if (homologousRate > 0.15) {
    candidates.push({
      pattern: 'hand-mapping-confusion',
      detail: 'Mirror-position substitutions across hands point to a weak left/right hand map.',
      recommendation: 'Alternate-hand word drills (words typed one hand at a time) to separate the two hand maps.'
    });
  }
  if (cognitiveRate > 0.2) {
    candidates.push({
      pattern: 'high-cognitive-load',
      detail: 'A large share of errors follow long pauses, which reads as uncertainty rather than a motor habit.',
      recommendation: 'Slow down and prioritize accuracy over speed; preview unfamiliar words or code tokens before typing them.'
    });
  }

  // Sort by precedence (not insertion order), cap the count, and tag one
  // primary. Consumers reading diagnoses[0] get the primary diagnosis.
  return candidates
    .sort((a, b) => precedenceOf(a.pattern) - precedenceOf(b.pattern))
    .slice(0, MAX_DIAGNOSES)
    .map((diagnosis, index) => ({
      ...diagnosis,
      primary: index === 0,
      secondary: index > 0
    }));
}

export { FINGER_KEY_MAP, KEYBOARD_ROWS, LATENCY, DIAGNOSIS_PRECEDENCE, MAX_DIAGNOSES };
