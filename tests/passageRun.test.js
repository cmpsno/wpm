import test from 'node:test';
import assert from 'node:assert/strict';
import { backspace, createPassageRunState, getContainingWord, typeCharacter, wordPositionInText } from '../scripts/passageRun.js';
import { calcAccuracy, calcWPM } from '../scripts/stats.js';

const passage = Object.freeze({ text: 'A, b.' });

test('a correct character advances and increments both counters', () => {
  const run = createPassageRunState(passage);
  assert.deepEqual(typeCharacter(run, 'A', 1_000), { accepted: true, correct: true, finished: false });
  assert.equal(run.currentIndex, 1);
  assert.equal(run.correctKeystrokes, 1);
  assert.equal(run.totalKeystrokes, 1);
  assert.equal(run.typedText, 'A');
});

test('an incorrect character starts the timer, counts, and locks progress', () => {
  const run = createPassageRunState(passage);
  typeCharacter(run, 'x', 2_000);
  assert.equal(run.startedAt, 2_000);
  assert.equal(run.currentIndex, 0);
  assert.equal(run.correctKeystrokes, 0);
  assert.equal(run.totalKeystrokes, 1);
  assert.equal(run.errorChar, 'x');

  typeCharacter(run, 'y', 2_100);
  assert.equal(run.currentIndex, 0);
  assert.equal(run.totalKeystrokes, 1);
  assert.equal(run.errorChar, 'x');
  assert.deepEqual(run.mistakes, [{
    expected: 'A',
    actual: 'x',
    word: 'A,',
    characterIndex: 0,
    timestamp: 2_000,
    latencyMs: null,
    prevChar: null,
    nextChar: ',',
    positionInWord: 'start',
    wasCorrected: false
  }]);
});

test('word extraction uses whitespace boundaries at passage edges', () => {
  assert.equal(getContainingWord('array[index] then', 0), 'array[index]');
  assert.equal(getContainingWord('first don\'t', 10), "don't");
});

test('mistakes record latency, neighbors, word position, and correction state', () => {
  const run = createPassageRunState({ text: 'the cat' });
  typeCharacter(run, 't', 1_000);
  typeCharacter(run, 'h', 1_040);
  typeCharacter(run, 'x', 1_120);
  const [mistake] = run.mistakes;
  assert.equal(mistake.expected, 'e');
  assert.equal(mistake.actual, 'x');
  assert.equal(mistake.timestamp, 1_120);
  assert.equal(mistake.latencyMs, 80);
  assert.equal(mistake.prevChar, 'h');
  assert.equal(mistake.nextChar, ' ');
  assert.equal(mistake.positionInWord, 'end');
  assert.equal(mistake.wasCorrected, false);

  backspace(run);
  assert.equal(run.mistakes[0].wasCorrected, true);
});

test('wordPositionInText labels start, middle, and end of words', () => {
  assert.equal(wordPositionInText('the cat', 0), 'start');
  assert.equal(wordPositionInText('the cat', 1), 'middle');
  assert.equal(wordPositionInText('the cat', 2), 'end');
  assert.equal(wordPositionInText('the cat', 4), 'start');
  assert.equal(wordPositionInText('the cat', 3), 'middle');
});

test('Backspace clears only a current error and allows retry at the same index', () => {
  const run = createPassageRunState(passage);
  typeCharacter(run, 'x', 1_000);
  assert.equal(backspace(run), true);
  assert.equal(run.currentIndex, 0);
  assert.equal(run.errorChar, null);
  typeCharacter(run, 'A', 1_100);
  assert.equal(run.currentIndex, 1);
  assert.equal(backspace(run), false);
  assert.equal(run.currentIndex, 1);
});

test('spaces and punctuation must match exactly', () => {
  const run = createPassageRunState(passage);
  typeCharacter(run, 'A', 1_000);
  typeCharacter(run, ' ', 1_010);
  assert.equal(run.currentIndex, 1);
  assert.equal(run.errorChar, ' ');
  backspace(run);
  typeCharacter(run, ',', 1_020);
  typeCharacter(run, 'x', 1_030);
  assert.equal(run.currentIndex, 2);
  assert.equal(run.errorChar, 'x');
  backspace(run);
  typeCharacter(run, ' ', 1_040);
  assert.equal(run.currentIndex, 3);
});

test('startedAt is null before input and set once on the first printable key', () => {
  const run = createPassageRunState(passage);
  assert.equal(run.startedAt, null);
  typeCharacter(run, 'A', 3_000);
  typeCharacter(run, ',', 4_000);
  assert.equal(run.startedAt, 3_000);
});

test('the final correct character finishes exactly once and rejects later input', () => {
  const run = createPassageRunState({ text: 'a' });
  typeCharacter(run, 'a', 5_000);
  assert.equal(run.currentIndex, 1);
  assert.equal(run.finishedAt, 5_000);
  assert.deepEqual(typeCharacter(run, 'b', 6_000), { accepted: false, correct: false, finished: true });
  assert.equal(run.totalKeystrokes, 1);
  assert.equal(run.finishedAt, 5_000);
});

test('completed accuracy retains corrected mistakes and WPM uses correct keys', () => {
  const run = createPassageRunState({ text: 'ab' });
  typeCharacter(run, 'x', 1_000);
  backspace(run);
  typeCharacter(run, 'a', 30_000);
  typeCharacter(run, 'b', 61_000);
  assert.equal(run.finishedAt, 61_000);
  assert.equal(calcAccuracy(run.correctKeystrokes, run.totalKeystrokes), 67);
  assert.equal(calcWPM(run.correctKeystrokes, run.startedAt, run.finishedAt), 0);
  assert.equal(calcWPM(run.totalKeystrokes, run.startedAt, run.finishedAt), 1);
});
