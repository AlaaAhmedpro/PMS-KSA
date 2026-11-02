import { loadJson, removeKey, saveJson } from "../demo-mode/storage";

/** Thin localStorage repository — swap for HTTP adapters when leaving Demo Mode. */
export function createLocalJsonRepository<T>(key: string, seed: T) {
  return {
    key,
    read(): T {
      return loadJson(key, seed);
    },
    write(value: T): void {
      saveJson(key, value);
    },
    clear(): void {
      removeKey(key);
    },
  };
}
