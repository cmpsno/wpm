import { handleKeyDown, initGame, resetTest, startTargetedRetry } from './game.js';
import { loadState, state, updateSettings } from './state.js';
import { getCategories } from './snippets.js';

const modeSelect = document.getElementById('modeSelect');
const languageSelect = document.getElementById('languageSelect');
const categorySelect = document.getElementById('categorySelect');
const difficultySelect = document.getElementById('difficultySelect');
const passageLengthSelect = document.getElementById('passageLengthSelect');
const languageGroup = document.getElementById('languageGroup');
const categoryGroup = document.getElementById('categoryGroup');
const passageLengthGroup = document.getElementById('passageLengthGroup');
const resetButton = document.getElementById('resetButton');
const resultRestartButton = document.getElementById('resultRestartButton');
const resultModal = document.getElementById('resultModal');
const passageStream = document.getElementById('passageStream');
const practiceMistakesButton = document.getElementById('practiceMistakesButton');

function rebuildCategories() {
  const categories = getCategories(state.settings.language, state.settings.difficulty);
  const selected = categories.includes(state.settings.category) ? state.settings.category : 'all';
  categorySelect.replaceChildren(
    Object.assign(document.createElement('option'), { value: 'all', textContent: 'All' }),
    ...categories.map((category) => Object.assign(document.createElement('option'), {
      value: category,
      textContent: category.replace(/(^|-)\w/g, (match) => match.toUpperCase())
    }))
  );
  if (selected !== state.settings.category) updateSettings({ category: selected });
  categorySelect.value = selected;
}

function syncControls() {
  modeSelect.value = state.settings.mode;
  languageSelect.value = state.settings.language;
  difficultySelect.value = state.settings.difficulty;
  passageLengthSelect.value = state.settings.lengthBand;

  const isCode = state.settings.mode === 'code';
  languageGroup.hidden = !isCode;
  categoryGroup.hidden = !isCode;
  passageLengthGroup.hidden = isCode;
  rebuildCategories();
}

function handleSettingsChange() {
  updateSettings({
    mode: modeSelect.value,
    language: languageSelect.value,
    category: categorySelect.value || 'all',
    difficulty: difficultySelect.value,
    lengthBand: passageLengthSelect.value
  });
  syncControls();
  resetTest();
}

loadState();
syncControls();
initGame();

window.addEventListener('keydown', handleKeyDown);
modeSelect.addEventListener('change', handleSettingsChange);
languageSelect.addEventListener('change', handleSettingsChange);
categorySelect.addEventListener('change', handleSettingsChange);
difficultySelect.addEventListener('change', handleSettingsChange);
passageLengthSelect.addEventListener('change', handleSettingsChange);
resetButton.addEventListener('click', () => resetTest());
resultRestartButton.addEventListener('click', () => resetTest());
practiceMistakesButton.addEventListener('click', () => startTargetedRetry());
passageStream.addEventListener('click', () => passageStream.focus({ preventScroll: true }));
resultModal.addEventListener('cancel', (event) => event.preventDefault());
