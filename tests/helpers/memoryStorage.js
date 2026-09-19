// Minimal in-memory stand-in for window.localStorage, shared across test
// files so the persistence path can be exercised without a browser.
export class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
}
