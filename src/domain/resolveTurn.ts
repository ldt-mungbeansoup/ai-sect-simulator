import { collectDeltas } from "./reportFacts";
import { getStanceEffect } from "./stanceConfig";
import type { ParsedDecree, SectState, TurnFacts } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const scaled = (value: number, intensity: number) => Math.round(value * clamp(intensity, 0.2, 1.2));

function cloneState(state: SectState): SectState {
  return JSON.parse(JSON.stringify(state)) as SectState;
}

function applyDelta(state: SectState, key: string, value: number) {
  switch (key) {
    case "totalDisciples":
      state.disciples.total = Math.max(0, state.disciples.total + value);
      break;
    case "eliteDisciples":
      state.disciples.elite = clamp(state.disciples.elite + value, 0, state.disciples.total);
      break;
    case "morale":
      state.disciples.morale = clamp(state.disciples.morale + value, 0, 100);
      break;
    case "loyalty":
      state.disciples.loyalty = clamp(state.disciples.loyalty + value, 0, 100);
      break;
    case "combat":
      state.disciples.combat = Math.max(0, state.disciples.combat + value);
      break;
    case "spiritStones":
      state.finance.spiritStones += value;
      break;
    case "yearlyIncome":
      state.finance.yearlyIncome = Math.max(0, state.finance.yearlyIncome + value);
      break;
    case "yearlyExpense":
      state.finance.yearlyExpense = Math.max(0, state.finance.yearlyExpense + value);
      break;
    case "trainingGround":
      state.facilities.trainingGround = clamp(state.facilities.trainingGround + value, 0, 3);
      break;
    case "scripturePavilion":
      state.facilities.scripturePavilion = clamp(state.facilities.scripturePavilion + value, 0, 3);
      break;
    case "spiritField":
      state.facilities.spiritField = clamp(state.facilities.spiritField + value, 0, 3);
      break;
    case "alchemyRoom":
      state.facilities.alchemyRoom = clamp(state.facilities.alchemyRoom + value, 0, 3);
      break;
    case "reputation":
      state.influence.reputation = clamp(state.influence.reputation + value, 0, 100);
      break;
    case "luck":
      state.influence.luck = clamp(state.influence.luck + value, -50, 50);
      break;
    case "threat":
      state.influence.threat = Math.max(0, state.influence.threat + value);
      break;
  }
}

function applyAnnualEconomy(state: SectState) {
  state.finance.spiritStones += state.finance.yearlyIncome - state.finance.yearlyExpense;
  state.influence.threat = Math.max(0, state.influence.threat + 2);
}

function detectGameOver(state: SectState) {
  if (state.disciples.total <= 0) {
    state.gameOver = { reason: "弟子断绝", chronicle: "山门灯火渐熄，传承无人续接。" };
  } else if (state.finance.spiritStones <= 0 && state.finance.yearlyIncome < state.finance.yearlyExpense) {
    state.gameOver = { reason: "灵石枯竭", chronicle: "库藏见底，供奉断绝，众弟子各寻出路。" };
  } else if (state.disciples.morale <= 5 && state.disciples.loyalty <= 10) {
    state.gameOver = { reason: "宗门离散", chronicle: "人心散尽，长老再难维系山门。" };
  }
}

export function resolveTurn(
  state: SectState,
  decree: string,
  parsed: ParsedDecree
): { nextState: SectState; facts: TurnFacts } {
  const before = cloneState(state);
  const nextState = cloneState(state);
  const effect = getStanceEffect(parsed.axis, parsed.stance);

  for (const [key, value] of Object.entries(effect.effects)) {
    applyDelta(nextState, key, scaled(value, parsed.intensity));
  }

  applyAnnualEconomy(nextState);
  nextState.year += 1;
  nextState.history = [
    ...nextState.history,
    `第${state.year}年：${parsed.axis}/${parsed.stance}，${parsed.summary}`
  ].slice(-12);

  detectGameOver(nextState);

  const facts: TurnFacts = {
    decree,
    parsed,
    deltas: collectDeltas(before, nextState),
    eventSeeds: effect.eventSeeds,
    warnings: nextState.gameOver ? [nextState.gameOver.chronicle] : []
  };

  return { nextState, facts };
}
