import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { resolveTurn } from "../resolveTurn";
import { STANCE_CONFIG, getStanceEffect } from "../stanceConfig";

describe("hidden stance config", () => {
  it("defines five stances for each axis", () => {
    expect(Object.keys(STANCE_CONFIG.人)).toHaveLength(5);
    expect(Object.keys(STANCE_CONFIG.财)).toHaveLength(5);
    expect(Object.keys(STANCE_CONFIG.物)).toHaveLength(5);
    expect(Object.keys(STANCE_CONFIG.势)).toHaveLength(5);
  });

  it("returns a deterministic effect by axis and stance", () => {
    const effect = getStanceEffect("人", "广招");

    expect(effect.effects.totalDisciples).toBe(3);
    expect(effect.effects.spiritStones).toBe(-120);
    expect(effect.eventSeeds).toContain("开山收徒");
  });
});

describe("resolveTurn", () => {
  it("applies a stance effect scaled by intensity and advances the year", () => {
    const state = createInitialState();

    const result = resolveTurn(state, "广开山门，今年重在收徒。", {
      axis: "人",
      stance: "广招",
      intensity: 0.7,
      summary: "放宽山门，快速扩充弟子。"
    });

    expect(result.nextState.year).toBe(2);
    expect(result.nextState.disciples.total).toBe(12);
    expect(result.nextState.finance.spiritStones).toBe(432);
    expect(result.facts.deltas.map((delta) => delta.label)).toContain("弟子总数");
    expect(result.facts.eventSeeds).toContain("开山收徒");
  });

  it("marks game over when disciples are gone", () => {
    const state = createInitialState();
    state.disciples.total = 0;

    const result = resolveTurn(state, "一切从简。", {
      axis: "财",
      stance: "节流",
      intensity: 0.5,
      summary: "压缩支出。"
    });

    expect(result.nextState.gameOver?.reason).toBe("弟子断绝");
  });
});
