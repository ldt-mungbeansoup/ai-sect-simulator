import type { SectState } from "../domain/types";
import { normalizeSectState } from "../domain/initialState";

const SAVE_KEY = "sect-simulator-save-v1";

export function loadSavedState(): SectState | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;

  try {
    return normalizeSectState(JSON.parse(raw) as SectState);
  } catch {
    localStorage.removeItem(SAVE_KEY);
    return null;
  }
}

export function saveState(state: SectState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(normalizeSectState(state)));
}

export function clearSavedState() {
  localStorage.removeItem(SAVE_KEY);
}
