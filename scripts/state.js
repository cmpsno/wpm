import { createPassageRunState } from './passageRun.js';

const STORAGE_KEY = 'terminalVelocityData';
export const DIFFICULTIES = Object.freeze(['easy', 'medium', 'hard']);
export const LENGTH_BANDS = Object.freeze(['short', 'medium', 'long']);
export const MODES = Object.freeze(['prose', 'code']);
export const LANGUAGES = Object.freeze(['cpp', 'python']);
export const DEFAULT_SETTINGS = Object.freeze({
  mode: 'prose',
  language: 'cpp',
  category: 'all',
  difficulty: 'medium',
  lengthBand: 'medium'
});

export const state = {
  ...createPassageRunState(),
  isActive: false,
  peakWpm: 0,
  previousPassageId: null,
  settings: { ...DEFAULT_SETTINGS },
  history: []
};

export function validateSettings(candidate = {}) {
  const mode = MODES.includes(candidate.mode) ? candidate.mode : DEFAULT_SETTINGS.mode;
  const language = LANGUAGES.includes(candidate.language) ? candidate.language : DEFAULT_SETTINGS.language;
  const category = typeof candidate.category === 'string' && candidate.category.trim()
    ? candidate.category
    : DEFAULT_SETTINGS.category;
  const difficulty = DIFFICULTIES.includes(candidate.difficulty)
    ? candidate.difficulty
    : DEFAULT_SETTINGS.difficulty;

  let lengthBand = LENGTH_BANDS.includes(candidate.lengthBand)
    ? candidate.lengthBand
    : null;

  if (!lengthBand && candidate.wordCount !== undefined) {
    lengthBand = ({ 10: 'short', 25: 'medium', 50: 'long' })[Number(candidate.wordCount)] ?? null;
  }

  return {
    mode,
    language,
    category,
    difficulty,
    lengthBand: lengthBand ?? DEFAULT_SETTINGS.lengthBand
  };
}

function sanitizeHistory(candidate) {
  if (!Array.isArray(candidate)) return [];
  return candidate
    .filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      return Number.isFinite(entry.wpm)
        && entry.wpm >= 0
        && Number.isFinite(entry.accuracy)
        && entry.accuracy >= 0
        && entry.accuracy <= 100
        && DIFFICULTIES.includes(entry.difficulty)
        && !Number.isNaN(new Date(entry.completedAt ?? entry.date).getTime());
    })
    .slice(0, 20)
    .map((entry) => ({
      wpm: Math.round(entry.wpm),
      accuracy: Math.round(entry.accuracy),
      difficulty: entry.difficulty,
      mode: MODES.includes(entry.mode) ? entry.mode : 'prose',
      language: LANGUAGES.includes(entry.language) ? entry.language : null,
      category: typeof entry.category === 'string' ? entry.category : 'all',
      lengthBand: LENGTH_BANDS.includes(entry.lengthBand) ? entry.lengthBand : DEFAULT_SETTINGS.lengthBand,
      completedAt: new Date(entry.completedAt ?? entry.date).toISOString(),
      id: typeof entry.id === 'string' ? entry.id : `run-${new Date(entry.completedAt ?? entry.date).getTime()}`,
      isTargetedRetry: entry.isTargetedRetry === true,
      mistakes: Array.isArray(entry.mistakes)
        ? entry.mistakes.filter((mistake) => mistake
          && typeof mistake.expected === 'string'
          && typeof mistake.actual === 'string'
          && typeof mistake.word === 'string'
          && Number.isInteger(mistake.characterIndex))
          .map(({ expected, actual, word, characterIndex }) => ({ expected, actual, word, characterIndex }))
        : []
    }));
}

export function getRunsChronological(history = state.history) {
  return [...history].reverse();
}

export function updateSettings(patch) {
  state.settings = validateSettings({ ...state.settings, ...patch });
  saveState();
}

export function saveState(storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({
      settings: validateSettings(state.settings),
      history: sanitizeHistory(state.history)
    }));
    return true;
  } catch (error) {
    console.warn('Could not save typing game state:', error);
    return false;
  }
}

export function loadState(storage = globalThis.localStorage) {
  if (!storage) return false;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    state.settings = validateSettings(parsed?.settings);
    state.history = sanitizeHistory(parsed?.history);
    return true;
  } catch (error) {
    state.settings = { ...DEFAULT_SETTINGS };
    state.history = [];
    console.warn('Could not load typing game state:', error);
    return false;
  }
}

export function resetRunState(passage = null) {
  Object.assign(state, createPassageRunState(passage), {
    isActive: false,
    peakWpm: 0
  });
}

export function pushHistory(entry) {
  state.history = sanitizeHistory([entry, ...state.history]);
  saveState();
}

export { STORAGE_KEY };
