import test from 'node:test';
import assert from 'node:assert/strict';
import { backspace, createPassageRunState, getContainingWord, getLatencyBaseline, median, typeCharacter, wordPositionInText } from '../scripts/passageRun.js';
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

test('median averages the middle pair and leaves the input untouched', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 2, 3]), 2.5);
  assert.equal(median([]), null);
  assert.equal(median(null), null);
  const input = [3, 1, 2];
  median(input);
  assert.deepEqual(input, [3, 1, 2]);
});

test('correctKeystrokeLatencies collects only correct, measurable keystrokes', () => {
  const run = createPassageRunState({ text: 'abcdef' });
  typeCharacter(run, 'a', 1_000); // first keystroke: no latency to record
  typeCharacter(run, 'b', 1_120);
  typeCharacter(run, 'x', 1_200); // incorrect: locked, must not be recorded
  backspace(run);
  typeCharacter(run, 'c', 1_300); // latency spans the error recovery (100ms)
  assert.deepEqual(run.correctKeystrokeLatencies, [120, 100]);
});

test('getLatencyBaseline needs 10 samples before returning the median', () => {
  const run = createPassageRunState({ text: 'abcdefghijk' });
  assert.equal(getLatencyBaseline(run), null);
  let now = 1_000;
  for (const character of 'abcdefghijk') {
    now += 120;
    typeCharacter(run, character, now);
  }
  // First keystroke had no latency, so 10 samples of 120ms were collected.
  assert.equal(run.correctKeystrokeLatencies.length, 10);
  assert.equal(getLatencyBaseline(run), 120);
  assert.equal(getLatencyBaseline({ correctKeystrokeLatencies: [1, 2, 3] }), null);
  assert.equal(getLatencyBaseline(null), null);
});

test('first keystroke of a run records a null latency', () => {
  const run = createPassageRunState({ text: 'ab' });
  typeCharacter(run, 'x', 1_000);
  assert.equal(run.mistakes.length, 1);
  assert.equal(run.mistakes[0].latencyMs, null);
});

test('second keystroke latency is measured from the previous accepted keystroke', () => {
  const run = createPassageRunState({ text: 'ab' });
  typeCharacter(run, 'a', 1_000);
  typeCharacter(run, 'x', 1_080);
  assert.equal(run.mistakes.length, 1);
  assert.equal(run.mistakes[0].latencyMs, 80);
});

test('backspace does not reset the inter-keystroke timer', () => {
  const run = createPassageRunState({ text: 'ab' });
  typeCharacter(run, 'x', 1_000);
  backspace(run);
  assert.equal(run.lastKeystrokeAt, 1_000);
  typeCharacter(run, 'a', 1_050);
  typeCharacter(run, 'y', 1_100);
  assert.equal(run.mistakes.length, 2);
  // 1_100 - 1_050: measured from the last accepted keystroke, not the backspace.
  assert.equal(run.mistakes[1].latencyMs, 50);
});

test('multi-character input is rejected without changing state', () => {
  const run = createPassageRunState({ text: 'ab' });
  const before = JSON.parse(JSON.stringify(run));
  assert.deepEqual(typeCharacter(run, 'ab', 1_000), { accepted: false, correct: false, finished: false });
  assert.deepEqual(run, before);
});

test('a single astral-plane character is accepted as one keystroke', () => {
  // [...'😀'].length === 1, so the length guard lets it through; it is simply
  // logged as a wrong character with no keyboard position or finger.
  const run = createPassageRunState({ text: 'a' });
  assert.deepEqual(typeCharacter(run, '😀', 1_000), { accepted: true, correct: false, finished: false });
  assert.equal(run.mistakes[0].latencyMs, null);
});

test('getContainingWord handles tabs, newlines, and multiple spaces', () => {
  assert.equal(getContainingWord('foo\tbar', 4), 'bar');
  assert.equal(getContainingWord('foo\nbar', 4), 'bar');
  assert.equal(getContainingWord('foo   bar', 6), 'bar');
  // An index on whitespace resolves to the word on its left when the
  // previous character is a letter, and to '' when it is also whitespace.
  assert.equal(getContainingWord('foo   bar', 3), 'foo');
  assert.equal(getContainingWord('foo   bar', 5), '');
});

test('wordPositionInText handles tab-separated words', () => {
  assert.equal(wordPositionInText('foo\tbar', 4), 'start');
  assert.equal(wordPositionInText('foo\tbar', 5), 'middle');
  assert.equal(wordPositionInText('foo\tbar', 6), 'end');
});

test('startedAt is set on the first accepted keystroke even if it is wrong', () => {
  const run = createPassageRunState({ text: 'a' });
  typeCharacter(run, 'x', 5_000);
  assert.equal(run.startedAt, 5_000);
});
