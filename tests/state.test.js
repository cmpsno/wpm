import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  loadState,
  getRunsChronological,
  pushHistory,
  resetRunState,
  state,
  validateSettings
} from '../scripts/state.js';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}

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

test('history is stored newest-first and capped at 20 entries', () => {
  for (let index = 0; index < 24; index += 1) {
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
