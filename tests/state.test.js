import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  loadState,
  getRunsChronological,
  pushHistory,
  resetRunState,
  saveState,
  state,
  validateSettings
} from '../scripts/state.js';

import { MemoryStorage } from './helpers/memoryStorage.js';

test.beforeEach(() => {
  globalThis.localStorage = new MemoryStorage();
  state.settings = { ...DEFAULT_SETTINGS };
  state.history = [];
  resetRunState();
});

test('settings validation accepts only supported values', () => {
  assert.deepEqual(validateSettings({
    mode: 'code', language: 'python', category: 'loops', difficulty: 'hard', lengthBand: 'long'
  }), {
    mode: 'code', language: 'python', category: 'loops', difficulty: 'hard', lengthBand: 'long'
  });
  assert.deepEqual(validateSettings({
    mode: '<script>', language: 'ruby', category: '', difficulty: '<script>', lengthBand: 'huge'
  }), DEFAULT_SETTINGS);
});

test('legacy numeric word counts migrate to valid passage length bands', () => {
  assert.deepEqual(validateSettings({ difficulty: 'easy', wordCount: 10 }), { ...DEFAULT_SETTINGS, difficulty: 'easy', lengthBand: 'short' });
  assert.deepEqual(validateSettings({ difficulty: 'easy', wordCount: '25' }), { ...DEFAULT_SETTINGS, difficulty: 'easy', lengthBand: 'medium' });
  assert.deepEqual(validateSettings({ difficulty: 'hard', wordCount: 50 }), { ...DEFAULT_SETTINGS, difficulty: 'hard', lengthBand: 'long' });
  assert.deepEqual(validateSettings({ difficulty: 'hard', wordCount: 99 }), { ...DEFAULT_SETTINGS, difficulty: 'hard', lengthBand: 'medium' });
});

test('loadState migrates old settings while preserving valid history', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    settings: { difficulty: 'easy', wordCount: 25 },
    history: [
      { wpm: 72.4, accuracy: 96.2, difficulty: 'easy', date: '2026-08-21T12:00:00.000Z' },
      { wpm: 90, accuracy: 101, difficulty: 'hard', date: 'invalid' }
    ]
  }));
  assert.equal(loadState(), true);
  assert.deepEqual(state.settings, { ...DEFAULT_SETTINGS, difficulty: 'easy', lengthBand: 'medium' });
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].wpm, 72);
  assert.equal(state.history[0].mode, 'prose');
  assert.deepEqual(state.history[0].mistakes, []);
  assert.equal(state.history[0].isTargetedRetry, false);
});

test('chronological history is oldest-first without mutating storage order', () => {
  const newestFirst = [{ id: 'new' }, { id: 'old' }];
  assert.deepEqual(getRunsChronological(newestFirst).map(({ id }) => id), ['old', 'new']);
  assert.deepEqual(newestFirst.map(({ id }) => id), ['new', 'old']);
});

test('malformed storage resets to safe defaults', () => {
  localStorage.setItem(STORAGE_KEY, '{broken');
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(loadState(), false);
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(state.settings, DEFAULT_SETTINGS);
  assert.deepEqual(state.history, []);
});

test('history is stored newest-first and capped at 20 entries', () => {  for (let index = 0; index < 24; index += 1) {
    pushHistory({
      wpm: index,
      accuracy: 95,
      difficulty: 'medium',
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString()
    });
  }
  assert.equal(state.history.length, 20);
  assert.equal(state.history[0].wpm, 23);
});

test('history preserves latency-annotated mistakes and session provenance', () => {
  pushHistory({
    wpm: 72,
    accuracy: 96,
    difficulty: 'medium',
    completedAt: '2026-09-19T12:00:00.000Z',
    passageId: 'passage-1',
    passageTitle: 'Hello World',
    totalCharacters: 120,
    mistakes: [{
      expected: 'e',
      actual: 'w',
      word: 'the',
      characterIndex: 2,
      timestamp: 1695000000000,
      latencyMs: 45,
      prevChar: 'h',
      nextChar: ' ',
      positionInWord: 'end',
      wasCorrected: true,
      injected: 'dropped'
    }]
  });
  const [run] = state.history;
  assert.equal(run.passageId, 'passage-1');
  assert.equal(run.passageTitle, 'Hello World');
  assert.equal(run.totalCharacters, 120);
  assert.deepEqual(run.mistakes, [{
    expected: 'e',
    actual: 'w',
    word: 'the',
    characterIndex: 2,
    timestamp: 1695000000000,
    latencyMs: 45,
    prevChar: 'h',
    nextChar: ' ',
    positionInWord: 'end',
    wasCorrected: true
  }]);
});

test('legacy mistakes without latency fields load with null defaults', () => {
  pushHistory({
    wpm: 72,
    accuracy: 96,
    difficulty: 'medium',
    completedAt: '2026-09-19T12:00:00.000Z',
    mistakes: [{ expected: 'e', actual: 'w', word: 'the', characterIndex: 2 }]
  });
  const [mistake] = state.history[0].mistakes;
  assert.equal(mistake.latencyMs, null);
  assert.equal(mistake.positionInWord, null);
  assert.equal(mistake.wasCorrected, false);
});

test('latencyBaseline survives the history round-trip when valid', () => {
  pushHistory({
    wpm: 72,
    accuracy: 96,
    difficulty: 'medium',
    completedAt: '2026-09-19T12:00:00.000Z',
    latencyBaseline: 150,
    mistakes: []
  });
  assert.equal(state.history[0].latencyBaseline, 150);
});

test('invalid latencyBaseline values are sanitized to null', () => {
  for (const latencyBaseline of [-10, 0, 'abc', NaN]) {
    pushHistory({
      wpm: 72,
      accuracy: 96,
      difficulty: 'medium',
      completedAt: '2026-09-19T12:00:00.000Z',
      latencyBaseline,
      mistakes: []
    });
    assert.equal(state.history[0].latencyBaseline, null, `baseline ${String(latencyBaseline)} becomes null`);
  }
});

test('fractional latencyBaseline is rounded to whole milliseconds', () => {
  pushHistory({
    wpm: 72,
    accuracy: 96,
    difficulty: 'medium',
    completedAt: '2026-09-19T12:00:00.000Z',
    latencyBaseline: 150.6,
    mistakes: []
  });
  assert.equal(state.history[0].latencyBaseline, 151);
});

test('legacy history without latencyBaseline loads as null', () => {
  pushHistory({
    wpm: 72,
    accuracy: 96,
    difficulty: 'medium',
    completedAt: '2026-09-19T12:00:00.000Z',
    mistakes: []
  });
  assert.equal(state.history[0].latencyBaseline, null);
});

test('invalid totalCharacters sanitizes to null while completedAt stays an ISO string', () => {
  for (const totalCharacters of [-5, 10.5, 'abc', null, undefined]) {
    pushHistory({
      wpm: 72,
      accuracy: 96,
      difficulty: 'medium',
      completedAt: '2026-09-19T12:00:00.000Z',
      totalCharacters,
      mistakes: []
    });
    assert.equal(state.history[0].totalCharacters, null, `totalCharacters ${String(totalCharacters)} becomes null`);
    assert.equal(state.history[0].completedAt, '2026-09-19T12:00:00.000Z');
  }
});

test('saveState and loadState round-trip mistake fields including latency', () => {
  pushHistory({
    id: 'run-1',
    wpm: 72,
    accuracy: 96,
    difficulty: 'medium',
    completedAt: '2026-09-19T12:00:00.000Z',
    totalCharacters: 120,
    mistakes: [{
      expected: 'e', actual: 'w', word: 'the', characterIndex: 2,
      timestamp: 1_695_000_000_000, latencyMs: 45,
      prevChar: 'h', nextChar: ' ', positionInWord: 'end', wasCorrected: true
    }]
  });
  assert.equal(saveState(), true);
  state.history = [];
  assert.equal(loadState(), true);
  assert.equal(state.history.length, 1);
  assert.equal(state.history[0].mistakes[0].latencyMs, 45);
  assert.equal(state.history[0].mistakes[0].wasCorrected, true);
  assert.equal(state.history[0].totalCharacters, 120);
});

test('invalid totalCharacters sanitizes to null on load', () => {
  const storage = new MemoryStorage();
  const entry = (totalCharacters) => ({
    wpm: 70, accuracy: 95, difficulty: 'medium',
    completedAt: '2026-09-19T12:00:00.000Z', totalCharacters
  });
  storage.setItem(STORAGE_KEY, JSON.stringify({
    settings: DEFAULT_SETTINGS,
    history: [entry(-1), entry(1.5), entry('120'), entry(0)]
  }));
  globalThis.localStorage = storage;
  assert.equal(loadState(), true);
  // 0 is a valid non-negative integer and is preserved.
  assert.deepEqual(state.history.map((run) => run.totalCharacters), [null, null, null, 0]);
});

test('getRunsChronological returns a new array without mutating the input', () => {
  const input = [{ id: 'a' }, { id: 'b' }];
  const output = getRunsChronological(input);
  assert.notEqual(output, input);
  assert.deepEqual(input.map((run) => run.id), ['a', 'b']);
  assert.deepEqual(output.map((run) => run.id), ['b', 'a']);
});
