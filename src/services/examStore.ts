import type { SectRating, SectState } from "../domain/types";

const EXAM_SHOWN_KEY = "sect-simulator-exam-shown-v1";

export function hasShownTenYearExam() {
  return localStorage.getItem(EXAM_SHOWN_KEY) === "true";
}

export function markTenYearExamShown() {
  localStorage.setItem(EXAM_SHOWN_KEY, "true");
}

export function resetTenYearExamShown() {
  localStorage.removeItem(EXAM_SHOWN_KEY);
}

export function getCompletedExamRating(state: SectState | null): SectRating | null {
  if (!state || state.year < 11) return null;
  return state.lastReport?.rating ?? null;
}

export function shouldAutoShowTenYearExam(state: SectState | null) {
  return Boolean(getCompletedExamRating(state) && !hasShownTenYearExam());
}
