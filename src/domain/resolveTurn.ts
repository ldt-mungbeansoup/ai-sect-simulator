import { collectDeltas } from "./reportFacts";
import { ANNUAL_DIVINE_SENSE_RECOVERY, MAX_DIVINE_SENSE } from "./decreeCost";
import { getStanceEffect } from "./stanceConfig";
import type { ParsedDecree, SectState, TurnFacts } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const scaled = (value: number, intensity: number) => Math.round(value * clamp(intensity, 0.2, 1.2));

function cloneState(state: SectState): SectState {
  return JSON.parse(JSON.stringify(state)) as SectState;
}

function applyDelta(state: SectState, key: string, value: number) {
  switch (key) {
    case "divineSense":
      state.divineSense = clamp(state.divineSense + value, 0, MAX_DIVINE_SENSE);
      break;
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

function applySystemicLinks(state: SectState) {
  const eventSeeds: string[] = [];
  const warnings: string[] = [];
  const facilityLevel = Object.values(state.facilities).reduce((sum, level) => sum + level, 0);

  const extraUpkeep = Math.floor(Math.max(0, state.disciples.total - 10) / 3) * 12;
  if (extraUpkeep > 0) {
    applyDelta(state, "spiritStones", -extraUpkeep);
    eventSeeds.push(`弟子供养牵动库藏，额外耗去${extraUpkeep}灵石。`);
  }

  if (facilityLevel > 0 && state.disciples.elite > 0) {
    const combatGain = Math.min(8, Math.floor((facilityLevel + state.disciples.elite) / 2));
    if (combatGain > 0) {
      applyDelta(state, "combat", combatGain);
      eventSeeds.push(`精英弟子借设施磨砺，宗门战力自然增长${combatGain}。`);
    }
  }

  if (state.influence.reputation >= 45) {
    const threatGain = Math.min(8, Math.floor((state.influence.reputation - 35) / 12));
    if (threatGain > 0) {
      applyDelta(state, "threat", threatGain);
      eventSeeds.push(`声望传远也招来窥伺，外部威胁随之上升${threatGain}。`);
    }
  }

  if (state.disciples.morale >= 76 && state.disciples.loyalty >= 76) {
    applyDelta(state, "yearlyIncome", 18);
    eventSeeds.push("士气与忠诚俱佳，弟子自发经营庶务，年收入小幅抬升。");
  } else if (state.disciples.morale <= 35 || state.disciples.loyalty <= 35) {
    applyDelta(state, "yearlyIncome", -24);
    applyDelta(state, "threat", 4);
    eventSeeds.push("人心不稳拖累山门庶务，年收入下降且外患更易趁虚。");
    warnings.push("弟子士气或忠诚过低，若继续恶化，宗门可能离散。");
  }

  if (state.influence.luck >= 15) {
    applyDelta(state, "spiritStones", 45);
    applyDelta(state, "threat", -3);
    eventSeeds.push("气运护持本年周转，库藏得补且祸患稍退。");
  } else if (state.influence.luck <= -15) {
    applyDelta(state, "spiritStones", -55);
    applyDelta(state, "threat", 4);
    eventSeeds.push("气运低迷牵出暗耗，库藏受损且外患加深。");
    warnings.push("气运已低，投资、外务与强硬策略的代价会更显眼。");
  }

  if (state.influence.threat >= 50) {
    const pressure = Math.min(60, Math.floor((state.influence.threat - 40) * 1.5));
    applyDelta(state, "spiritStones", -pressure);
    applyDelta(state, "morale", -4);
    eventSeeds.push(`威胁逼近山门，巡防与安抚额外耗去${pressure}灵石。`);
    warnings.push("外部威胁过高，若不防御、避世或结交，年度损耗会持续加重。");
  }

  return { eventSeeds, warnings };
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
  parsed: ParsedDecree,
  options: { divineSenseCost?: number } = {}
): { nextState: SectState; facts: TurnFacts } {
  const before = cloneState(state);
  const nextState = cloneState(state);
  const effect = getStanceEffect(parsed.axis, parsed.stance);
  const divineSenseCost = options.divineSenseCost ?? 0;
  const divineSenseEvents: string[] = [];

  if (divineSenseCost > 0) {
    applyDelta(nextState, "divineSense", -divineSenseCost);
  }

  if (nextState.divineSense < MAX_DIVINE_SENSE) {
    const beforeRecovery = nextState.divineSense;
    applyDelta(nextState, "divineSense", ANNUAL_DIVINE_SENSE_RECOVERY);
    const recovered = nextState.divineSense - beforeRecovery;
    if (recovered > 0) {
      divineSenseEvents.push(`年末静息回复${recovered}点神念。`);
    }
  }

  for (const [key, value] of Object.entries(effect.effects)) {
    applyDelta(nextState, key, scaled(value, parsed.intensity));
  }

  const systemicLinks = applySystemicLinks(nextState);
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
    eventSeeds: [
      ...effect.eventSeeds,
      ...(divineSenseCost > 0 ? [`宗主耗用${divineSenseCost}点神念推行本年谕令。`] : []),
      ...divineSenseEvents,
      ...systemicLinks.eventSeeds
    ],
    warnings: [...systemicLinks.warnings, ...(nextState.gameOver ? [nextState.gameOver.chronicle] : [])]
  };

  return { nextState, facts };
}
