import { describe, expect, it } from "vitest";
import { createInitialState } from "../initialState";
import { rateSect } from "../rating";

describe("rateSect", () => {
  it("calculates four axis scores and a rank", () => {
    const state = createInitialState();
    state.disciples.total = 18;
    state.disciples.elite = 5;
    state.disciples.combat = 82;
    state.finance.spiritStones = 900;
    state.finance.yearlyIncome = 260;
    state.finance.yearlyExpense = 120;
    state.facilities.trainingGround = 2;
    state.facilities.scripturePavilion = 1;
    state.facilities.spiritField = 2;
    state.facilities.alchemyRoom = 1;
    state.influence.reputation = 58;
    state.influence.luck = 12;
    state.influence.threat = 20;
    state.history = ["第1年：广招弟子。", "第2年：整顿财计。", "第3年：修缮山门。"];

    const rating = rateSect(state);

    expect(rating.axisScores.人).toBeGreaterThan(60);
    expect(rating.axisScores.财).toBeGreaterThan(70);
    expect(rating.totalScore).toBeGreaterThan(60);
    expect(rating.turningPoints).toHaveLength(3);
  });
});
