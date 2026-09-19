export function createPassageRunState(passage = null) {
  return {
    passage,
    currentIndex: 0,
    typedText: '',
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    startedAt: null,
    finishedAt: null,
    errorChar: null,
    lockedAtIndex: null,
    lastKeystrokeAt: null,
    mistakes: [],
    // Latencies (ms) of correct keystrokes this run. Used only to derive a
    // per-run typing-speed baseline; the raw array is never persisted —
    // finishTest() stores just its median on the history entry.
    correctKeystrokeLatencies: []
  };
}

export function getContainingWord(text, index) {
  if (typeof text !== 'string' || !Number.isInteger(index) || index < 0 || index >= text.length) return '';
  let start = index;
  let end = index;
  while (start > 0 && !/\s/u.test(text[start - 1])) start -= 1;
  while (end < text.length && !/\s/u.test(text[end])) end += 1;
  return text.slice(start, end);
}

export function wordPositionInText(text, index) {
  const word = getContainingWord(text, index);
  if (!word) return null;
  let start = index;
  while (start > 0 && !/\s/u.test(text[start - 1])) start -= 1;
  const offset = index - start;
  if (offset === 0) return 'start';
  if (offset === word.length - 1) return 'end';
  return 'middle';
}

export function typeCharacter(runState, character, now = Date.now()) {
  if (!runState.passage || runState.finishedAt !== null || typeof character !== 'string' || [...character].length !== 1) {
    return { accepted: false, correct: false, finished: runState.finishedAt !== null };
  }

  // Once an error is visible, printable input remains locked out until Backspace.
  if (runState.lockedAtIndex !== null) {
    return { accepted: false, correct: false, finished: false };
  }

  if (runState.startedAt === null) runState.startedAt = now;
  const latencyMs = runState.lastKeystrokeAt === null ? null : now - runState.lastKeystrokeAt;
  runState.lastKeystrokeAt = now;
  runState.totalKeystrokes += 1;
  runState.typedText += character;

  const expected = runState.passage.text[runState.currentIndex];
  if (character !== expected) {
    runState.errorChar = character;
    runState.lockedAtIndex = runState.currentIndex;
    const text = runState.passage.text;
    const index = runState.currentIndex;
    runState.mistakes.push({
      expected,
      actual: character,
      word: getContainingWord(text, index),
      characterIndex: index,
      timestamp: now,
      latencyMs,
      prevChar: index > 0 ? text[index - 1] : null,
      nextChar: index + 1 < text.length ? text[index + 1] : null,
      positionInWord: wordPositionInText(text, index),
      wasCorrected: false
    });
    return { accepted: true, correct: false, finished: false };
  }

  runState.currentIndex += 1;
  runState.correctKeystrokes += 1;
  // Only correct keystrokes feed the baseline: incorrect ones can include
  // error-recognition pauses, and the first keystroke has no latency.
  if (Number.isFinite(latencyMs) && latencyMs >= 0) {
    runState.correctKeystrokeLatencies.push(latencyMs);
  }
  if (runState.currentIndex === runState.passage.text.length) {
    runState.finishedAt = now;
  }
  return { accepted: true, correct: true, finished: runState.finishedAt !== null };
}

export function backspace(runState) {
  if (runState.finishedAt !== null || runState.lockedAtIndex === null) return false;
  const lockedIndex = runState.lockedAtIndex;
  runState.errorChar = null;
  runState.lockedAtIndex = null;
  for (let index = runState.mistakes.length - 1; index >= 0; index -= 1) {
    if (runState.mistakes[index].characterIndex === lockedIndex) {
      runState.mistakes[index].wasCorrected = true;
      break;
    }
  }
  return true;
}

// Median of a numeric array. Sorts a copy so the caller's array is untouched;
// median (not mean) keeps a few long pauses from skewing the baseline.
export function median(values) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Per-run typing-speed baseline: median inter-keystroke interval of correct
// keystrokes. Requires a minimum of 10 samples so the median is stable;
// below that (short runs, error-heavy runs) we return null and callers fall
// back to the absolute 80/400ms thresholds.
export function getLatencyBaseline(runState) {
  const values = runState?.correctKeystrokeLatencies ?? [];
  if (values.length < 10) return null;
  return median(values);
}
