// Shared fixtures for error-analysis tests.
//
// Builds well-formed mistake and run objects so tests don't hand-roll them
// inline. All timestamps are literals and nothing touches the wall clock,
// so tests using these are deterministic. These fixtures construct inputs;
// they assert nothing about production behavior.

export function makeMistake(expected = 'e', actual = 'w', overrides = {}) {
  // Single-object shorthand: makeMistake({ latencyMs: 55 }).
  if (expected !== null && typeof expected === 'object') {
    overrides = expected;
    expected = 'e';
    actual = 'w';
  }
  return {
    expected,
    actual,
    word: 'the',
    characterIndex: 2,
    timestamp: 1_000,
    latencyMs: 45,
    prevChar: 'h',
    nextChar: ' ',
    positionInWord: 'middle',
    wasCorrected: false,
    ...overrides
  };
}

export function makeRun(overrides = {}) {
  return {
    id: 'run-1',
    totalCharacters: 100,
    completedAt: '2026-09-19T12:00:00.000Z',
    mistakes: [makeMistake()],
    ...overrides
  };
}

// n runs ordered oldest -> newest, each carrying the overlapping e->w
// substitution pattern the sticky-habit tests exercise. Override
// totalCharacters, mistakeCount, idPrefix, or startDay as needed; pass
// `mistakes` to use an explicit mistake array on every run instead of the
// generated one.
export function makeChronologicalRuns(n, overrides = {}) {
  const {
    totalCharacters = 100,
    mistakeCount = 1,
    idPrefix = 'run',
    startDay = 17,
    mistakes,
    ...runRest
  } = overrides;
  return Array.from({ length: n }, (_, i) => makeRun({
    id: `${idPrefix}-${i + 1}`,
    completedAt: `2026-09-${String(startDay + i).padStart(2, '0')}T12:00:00.000Z`,
    totalCharacters,
    mistakes: mistakes ?? Array.from({ length: mistakeCount }, () => makeMistake()),
    ...runRest
  }));
}
