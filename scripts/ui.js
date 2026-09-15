import { calcAccuracy, calcWPM, formatDate, formatTime } from './stats.js';
import { getRunsChronological } from './state.js';

const GAUGE_MAX = 150;
const GAUGE_REDLINE = 120;

const el = {
  passageTrack: document.getElementById('passageTrack'),
  passageStream: document.getElementById('passageStream'),
  passageAttribution: document.getElementById('passageAttribution'),
  progressFill: document.getElementById('progressFill'),
  runStatus: document.getElementById('runStatus'),
  wpmValue: document.getElementById('wpmValue'),
  wpmNeedle: document.getElementById('wpmNeedle'),
  accuracyValue: document.getElementById('accuracyValue'),
  timeValue: document.getElementById('timeValue'),
  resultModal: document.getElementById('resultModal'),
  resultStats: document.getElementById('resultStats'),
  logBody: document.getElementById('logBody'),
  logSection: document.getElementById('logSection'),
  resultInsights: document.getElementById('resultInsights'),
  practiceMistakesButton: document.getElementById('practiceMistakesButton')
};

export function buildPassage(passage) {
  const characters = [...passage.text].map((character, index) => {
    const span = document.createElement('span');
    span.className = 'char char--untyped';
    span.dataset.charIndex = String(index);
    span.textContent = character;
    return span;
  });
  el.passageTrack.replaceChildren(...characters);
  el.passageAttribution.textContent = `${passage.title} — ${passage.author}`;
  el.passageStream.scrollTop = 0;
}

export function renderPassageState(gameState) {
  const characters = el.passageTrack.children;
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    character.className = 'char';
    character.textContent = gameState.passage.text[index];
    if (index < gameState.currentIndex) character.classList.add('char--correct');
    else if (index === gameState.currentIndex && gameState.errorChar !== null) {
      character.classList.add('char--incorrect', 'char--current');
      character.textContent = gameState.errorChar;
    } else {
      character.classList.add('char--untyped');
      if (index === gameState.currentIndex) character.classList.add('char--current');
    }
  }

  const current = el.passageTrack.querySelector('.char--current');
  if (current) {
    requestAnimationFrame(() => current.scrollIntoView({ block: 'center', inline: 'nearest' }));
  }
}

export function updateProgress(currentIndex, total) {
  const percentage = total > 0 ? Math.min(100, (currentIndex / total) * 100) : 0;
  el.progressFill.style.width = `${percentage}%`;
}

export function updateStats(gameState, now) {
  const wpm = calcWPM(gameState.correctKeystrokes, gameState.startedAt, now);
  const accuracy = calcAccuracy(gameState.correctKeystrokes, gameState.totalKeystrokes);
  const elapsed = gameState.startedAt ? now - gameState.startedAt : 0;
  el.wpmValue.textContent = String(wpm);
  el.accuracyValue.textContent = `${accuracy}%`;
  el.timeValue.textContent = formatTime(elapsed);
  const rotation = -180 + (Math.min(wpm, GAUGE_MAX) / GAUGE_MAX) * 180;
  el.wpmNeedle.style.setProperty('--rotation', `${rotation}deg`);
  el.wpmNeedle.classList.toggle('gauge__needle--redline', wpm >= GAUGE_REDLINE);
  return wpm;
}

export function resetGaugeAndStats() {
  el.wpmValue.textContent = '0';
  el.accuracyValue.textContent = '100%';
  el.timeValue.textContent = '0:00';
  el.wpmNeedle.style.setProperty('--rotation', '-180deg');
  el.wpmNeedle.classList.remove('gauge__needle--redline');
  el.progressFill.style.width = '0%';
  setStatus('Start typing when ready.');
}

export function setStatus(message, tone = 'neutral') {
  el.runStatus.textContent = message;
  el.runStatus.dataset.tone = tone;
}

function addResult(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'modal__stat';
  const term = document.createElement('dt');
  const description = document.createElement('dd');
  term.textContent = label;
  description.textContent = value;
  wrapper.append(term, description);
  return wrapper;
}

export function formatInsight(insight) {
  if (insight.type === 'word') return `“${insight.word}” caused errors in ${insight.affectedRuns} recent runs.`;
  const lines = [`You missed “${insight.char}” in ${insight.affectedRuns} recent runs.`];
  if (insight.topSubstitution) lines.push(`Most common substitution: “${insight.topSubstitution.actual}” → “${insight.char}”`);
  if (insight.techniqueHint) lines.push(`Technique: ${insight.techniqueHint}`);
  return lines.join('\n');
}

export function showResultModal({ finalWpm, peakWpm, accuracy, timeTakenMs, insights = [], canOfferRetry = false }) {
  el.resultStats.replaceChildren(
    addResult('Final WPM', String(finalWpm)),
    addResult('Peak WPM', String(peakWpm)),
    addResult('Accuracy', `${accuracy}%`),
    addResult('Time', formatTime(timeTakenMs))
  );
  el.resultInsights.replaceChildren(...(insights.length > 0
    ? insights.map((insight) => {
      const item = document.createElement('li');
      item.textContent = formatInsight(insight);
      return item;
    })
    : [Object.assign(document.createElement('li'), { textContent: 'Complete more runs to identify recurring patterns.' })]));
  el.practiceMistakesButton.hidden = !canOfferRetry;
  if (!el.resultModal.open) el.resultModal.showModal();
}

export function hideResultModal() {
  if (el.resultModal.open) el.resultModal.close();
}

export function renderLog(history) {
  el.logSection.hidden = history.length === 0;
  const rows = getRunsChronological(history).map((entry) => {
    const row = document.createElement('tr');
    const mode = entry.mode === 'code' && entry.language ? entry.language.toUpperCase() : 'PROSE';
    [formatDate(entry.completedAt), String(entry.wpm), `${entry.accuracy}%`, mode, String(entry.mistakes.length)]
      .forEach((value) => {
        const cell = document.createElement('td');
        cell.textContent = value;
        row.append(cell);
      });
    return row;
  });
  el.logBody.replaceChildren(...rows);
}

export function focusTypingArea() {
  el.passageStream.focus({ preventScroll: true });
}
