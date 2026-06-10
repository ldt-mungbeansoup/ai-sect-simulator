import type { SectState } from "../domain/types";

const SAVE_KEY = "sect-simulator-save-v1";

export function loadSavedState(): SectState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SectState;
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export function saveState(state: SectState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function clearSavedState() {
  localStorage.removeItem(SAVE_KEY);
}
