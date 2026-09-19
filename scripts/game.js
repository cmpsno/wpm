import { state, pushHistory, resetRunState } from './state.js';
import { PASSAGES, selectPassage } from './passages.js';
import { selectSnippet } from './snippets.js';
import { backspace, typeCharacter } from './passageRun.js';
import { calcAccuracy, calcWPM } from './stats.js';
import * as ui from './ui.js';
import { buildInsights, buildTargetedRetry } from './mistakeAnalysis.js';

let statsTimer = null;
let currentRunIsTargetedRetry = false;

function stopStatsTimer() {
  if (statsTimer !== null) {
    clearInterval(statsTimer);
    statsTimer = null;
  }
}

export function initGame() {
  resetTest(false);
}

export function resetTest(shouldFocus = true) {
  stopStatsTimer();
  const previousPassageId = state.passage?.id ?? state.previousPassageId;
  const passage = state.settings.mode === 'code'
    ? selectSnippet({
      language: state.settings.language,
      difficulty: state.settings.difficulty,
      category: state.settings.category,
      previousId: previousPassageId
    })
    : selectPassage(
      PASSAGES,
      state.settings.difficulty,
      state.settings.lengthBand,
      previousPassageId
    );
  currentRunIsTargetedRetry = false;
  startPassage(passage, shouldFocus);
}

function startPassage(passage, shouldFocus = true) {
  resetRunState(passage);
  state.previousPassageId = passage.id;
  ui.hideResultModal();
  ui.buildPassage(passage);
  ui.renderPassageState(state);
  ui.resetStats();
  ui.renderLog(state.history);
  if (shouldFocus) ui.focusTypingArea();
}

export function startTargetedRetry() {
  if (state.settings.mode === 'code') return false;
  const text = buildTargetedRetry(state.history);
  if (!text) return false;
  currentRunIsTargetedRetry = true;
  startPassage({ id: `targeted-${Date.now()}`, text, title: 'Targeted Retry', author: 'Local mistake patterns' });
  return true;
}

function startStatsTimer() {
  if (state.isActive) return;
  state.isActive = true;
  document.body.classList.add('is-running');
  ui.setStatus('Keep your rhythm.', 'active');
  statsTimer = setInterval(tickStats, 100);
}

function tickStats() {
  if (!state.isActive || state.finishedAt !== null) return;
  const now = Date.now();
  const wpm = ui.updateStats(state, now);
  recordPeakWpm(wpm, now);
}

function recordPeakWpm(wpm, now) {
  if (state.startedAt && now - state.startedAt >= 1000) {
    state.peakWpm = Math.max(state.peakWpm, wpm);
  }
}

function handleCharacter(key) {
  const now = Date.now();
  const transition = typeCharacter(state, key, now);
  if (!transition.accepted) return;

  startStatsTimer();
  ui.renderPassageState(state);
  ui.updateProgress(state.currentIndex, state.passage.text.length);
  const wpm = ui.updateStats(state, now);
  recordPeakWpm(wpm, now);

  if (!transition.correct) {
    ui.setStatus('Input blocked — press Backspace to clear the error.', 'error');
  } else if (transition.finished) {
    finishTest();
  }
}

function handleBackspace() {
  if (!backspace(state)) return;
  ui.renderPassageState(state);
  ui.setStatus('Error cleared. Retry the highlighted character.', 'active');
}

function handleTabIndent() {
  if (state.settings.mode !== 'code') return false;
  const remaining = state.passage.text.slice(state.currentIndex);
  if (!remaining.startsWith('    ')) return false;
  for (let index = 0; index < 4 && state.finishedAt === null; index += 1) handleCharacter(' ');
  return true;
}

function finishTest() {
  if (state.finishedAt === null) return;
  state.isActive = false;
  stopStatsTimer();

  const finalWpm = calcWPM(state.correctKeystrokes, state.startedAt, state.finishedAt);
  const accuracy = calcAccuracy(state.correctKeystrokes, state.totalKeystrokes);
  const timeTakenMs = Math.max(0, state.finishedAt - state.startedAt);
  const peakWpm = Math.max(state.peakWpm, finalWpm);

  const completedAt = new Date().toISOString();
  pushHistory({
    id: `run-${Date.now()}`,
    wpm: finalWpm,
    accuracy,
    difficulty: state.settings.difficulty,
    lengthBand: state.settings.lengthBand,
    mode: state.settings.mode,
    language: state.settings.mode === 'code' ? state.settings.language : null,
    category: state.settings.mode === 'code' ? state.settings.category : 'all',
    completedAt,
    isTargetedRetry: currentRunIsTargetedRetry,
    passageId: state.passage?.id ?? null,
    passageTitle: state.passage?.title ?? null,
    totalCharacters: state.totalKeystrokes,
    mistakes: state.mistakes
  });

  const insights = currentRunIsTargetedRetry || state.settings.mode === 'code' ? [] : buildInsights(state.history);

  ui.updateStats(state, state.finishedAt);
  ui.setStatus('Passage complete. Run saved.', 'complete');
  ui.renderLog(state.history);
  ui.showResultModal({ finalWpm, peakWpm, accuracy, timeTakenMs, insights, canOfferRetry: state.settings.mode === 'prose' && !currentRunIsTargetedRetry && insights.length > 0 });
}

export function handleKeyDown(event) {
  const activeElement = document.activeElement;
  if (activeElement && ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A', 'SUMMARY'].includes(activeElement.tagName)) return;

  if (state.finishedAt !== null) {
    if (event.key === 'Enter') {
      event.preventDefault();
      resetTest();
    }
    return;
  }

  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if (event.key === 'Backspace') {
    event.preventDefault();
    handleBackspace();
  } else if (state.settings.mode === 'code' && event.key === 'Enter') {
    event.preventDefault();
    handleCharacter('\n');
  } else if (state.settings.mode === 'code' && event.key === 'Tab' && !event.shiftKey && activeElement?.id === 'passageStream') {
    event.preventDefault();
    if (!handleTabIndent()) handleCharacter('\t');
  } else if ([...event.key].length === 1) {
    event.preventDefault();
    handleCharacter(event.key);
  }
}
