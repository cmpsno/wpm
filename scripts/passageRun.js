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
    mistakes: []
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
