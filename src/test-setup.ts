// Node 22+ exposes an experimental global `localStorage` that shadows jsdom's and is unusable
// without --localstorage-file. Install an in-memory Storage for tests when that happens.
if (typeof globalThis.localStorage?.clear !== 'function') {
  const data = new Map<string, string>();
  const memoryStorage: Storage = {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  };
  Object.defineProperty(globalThis, 'localStorage', { value: memoryStorage, configurable: true });
}
