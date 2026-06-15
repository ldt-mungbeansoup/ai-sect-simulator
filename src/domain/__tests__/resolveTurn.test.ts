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

    expect(effect.effects.totalDisciples).toBe(5);
    expect(effect.effects.spiritStones).toBe(-190);
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
    expect(result.nextState.disciples.total).toBe(14);
    expect(result.nextState.finance.spiritStones).toBe(354);
    expect(result.facts.deltas.map((delta) => delta.label)).toContain("弟子总数");
    expect(result.facts.eventSeeds).toContain("开山收徒");
    expect(result.facts.eventSeeds).toContain("弟子供养牵动库藏，额外耗去12灵石。");
  });

  it("adds systemic link explanations to turn facts", () => {
    const state = createInitialState();
    state.facilities.trainingGround = 2;
    state.facilities.scripturePavilion = 1;
    state.influence.reputation = 52;

    const result = resolveTurn(state, "精培内门弟子。", {
      axis: "人",
      stance: "精培",
      intensity: 0.7,
      summary: "集中培养内门。"
    });

    expect(result.nextState.disciples.combat).toBeGreaterThan(state.disciples.combat);
    expect(result.nextState.influence.threat).toBeGreaterThan(state.influence.threat);
    expect(result.facts.eventSeeds.some((seed) => seed.includes("设施磨砺"))).toBe(true);
    expect(result.facts.eventSeeds.some((seed) => seed.includes("声望传远"))).toBe(true);
  });

  it("spends divine sense when a decree cost is provided", () => {
    const state = createInitialState();

    const result = resolveTurn(state, "宗主亲自传音。", {
      axis: "人",
      stance: "安抚",
      intensity: 0.7,
      summary: "安定弟子。"
    }, { divineSenseCost: 18 });

    expect(result.nextState.divineSense).toBe(92);
    expect(result.facts.deltas.some((delta) => delta.path === "divineSense")).toBe(true);
    expect(result.facts.eventSeeds).toContain("宗主耗用18点神念推行本年谕令。");
    expect(result.facts.eventSeeds).toContain("年末静息回复10点神念。");
  });

  it("recovers divine sense after spending during a turn", () => {
    const state = createInitialState();
    state.divineSense = 50;

    const result = resolveTurn(state, "宗主亲自传音。", {
      axis: "人",
      stance: "安抚",
      intensity: 0.7,
      summary: "安定弟子。"
    }, { divineSenseCost: 18 });

    expect(result.nextState.divineSense).toBe(42);
    expect(result.facts.eventSeeds).toContain("宗主耗用18点神念推行本年谕令。");
    expect(result.facts.eventSeeds).toContain("年末静息回复10点神念。");
  });

  it("warns when threat pressure creates annual losses", () => {
    const state = createInitialState();
    state.influence.threat = 55;

    const result = resolveTurn(state, "继续扬名。", {
      axis: "势",
      stance: "扬名",
      intensity: 0.7,
      summary: "主动扬名。"
    });

    expect(result.facts.eventSeeds.some((seed) => seed.includes("威胁逼近山门"))).toBe(true);
    expect(result.facts.warnings.some((warning) => warning.includes("外部威胁过高"))).toBe(true);
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
