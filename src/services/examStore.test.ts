import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../domain/initialState";
import type { SectRating } from "../domain/types";
import {
  getCompletedExamRating,
  hasShownTenYearExam,
  markTenYearExamShown,
  resetTenYearExamShown,
  shouldAutoShowTenYearExam
} from "./examStore";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key)
});

afterEach(() => store.clear());

const rating: SectRating = {
  rank: "一方大宗",
  totalScore: 72,
  axisScores: { 人: 68, 财: 80, 物: 62, 势: 70 },
  summary: "十年大考显示，贵宗以财见长，而物仍是短板。",
  turningPoints: ["第八年：修缮山门。"]
};

describe("examStore", () => {
  it("auto-shows only a completed and unseen ten-year rating", () => {
    const state = createInitialState();
    state.year = 11;
    state.lastReport = {
      title: "十年年报",
      decree: "整顿山门",
      events: ["十年大考落定，仙盟使者封存考卷。", "诸堂清点案牍，宗门继续经营。"],
      consequences: [],
      executiveSummary: "十年整顿至此暂告一段落。",
      warnings: [],
      rating
    };

    expect(getCompletedExamRating(state)).toEqual(rating);
    expect(shouldAutoShowTenYearExam(state)).toBe(true);
    markTenYearExamShown();
    expect(hasShownTenYearExam()).toBe(true);
    expect(shouldAutoShowTenYearExam(state)).toBe(false);
    resetTenYearExamShown();
    expect(hasShownTenYearExam()).toBe(false);
  });

  it("does not show before the tenth turn is complete", () => {
    const state = createInitialState();
    state.lastReport = { rating } as never;

    expect(getCompletedExamRating(state)).toBeNull();
    expect(shouldAutoShowTenYearExam(state)).toBe(false);
  });
});
