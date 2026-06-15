import type { SectState } from "./types";
import { MAX_DIVINE_SENSE } from "./decreeCost";

export const SAMPLE_DECREES = [
  "广开山门，凡有灵根者皆可入我宗。",
  "闭门清修，先稳住弟子心气，不要争一时虚名。",
  "盘清账册，把灵石花在刀刃上。",
  "修缮山门，护山阵法不可再拖。",
  "遣人论道扬名，让四方知道我宗还未衰落。"
];

export function createInitialState(): SectState {
  return {
    year: 1,
    divineSense: MAX_DIVINE_SENSE,
    disciples: {
      total: 10,
      elite: 3,
      morale: 62,
      loyalty: 66,
      combat: 44
    },
    finance: {
      spiritStones: 500,
      yearlyIncome: 140,
      yearlyExpense: 110
    },
    facilities: {
      trainingGround: 0,
      scripturePavilion: 0,
      spiritField: 0,
      alchemyRoom: 0
    },
    influence: {
      reputation: 20,
      luck: 0,
      threat: 18
    },
    history: ["旧封印渐松，宗主闭关前留下十年整顿之期。"]
  };
}

export function normalizeSectState(state: SectState): SectState {
  const divineSense = Number.isFinite(state.divineSense) ? state.divineSense : MAX_DIVINE_SENSE;

  return {
    ...state,
    divineSense: Math.min(MAX_DIVINE_SENSE, Math.max(0, Math.round(divineSense)))
  };
}
