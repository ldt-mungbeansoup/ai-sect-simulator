import type { Axis, SectRating, SectState } from "./types";

const clampScore = (value: number) => Math.round(Math.min(100, Math.max(0, value)));

export function rateSect(state: SectState): SectRating {
  const axisScores: Record<Axis, number> = {
    人: clampScore(
      state.disciples.total * 1.5 +
        state.disciples.elite * 5 +
        state.disciples.morale * 0.25 +
        state.disciples.loyalty * 0.25 +
        state.disciples.combat * 0.35
    ),
    财: clampScore(
      state.finance.spiritStones / 18 +
        state.finance.yearlyIncome * 0.2 -
        state.finance.yearlyExpense * 0.16
    ),
    物: clampScore(
      (state.facilities.trainingGround +
        state.facilities.scripturePavilion +
        state.facilities.spiritField +
        state.facilities.alchemyRoom) *
        20
    ),
    势: clampScore(state.influence.reputation * 0.9 + state.influence.luck * 0.7 - state.influence.threat * 0.35 + 18)
  };

  const shortfallPenalty = Math.min(...Object.values(axisScores)) * 0.25;
  const average = Object.values(axisScores).reduce((sum, score) => sum + score, 0) / 4;
  const totalScore = clampScore(average * 0.75 + shortfallPenalty);

  const rank: SectRating["rank"] =
    totalScore < 25
      ? "覆灭"
      : totalScore < 45
        ? "勉强立足"
        : totalScore < 65
          ? "小有名望"
          : totalScore < 82
            ? "一方大宗"
            : "仙门新星";

  const weakestAxis = Object.entries(axisScores).sort((a, b) => a[1] - b[1])[0][0] as Axis;
  const strongestAxis = Object.entries(axisScores).sort((a, b) => b[1] - a[1])[0][0] as Axis;

  return {
    rank,
    totalScore,
    axisScores,
    summary: `十年大考显示，贵宗以${strongestAxis}见长，而${weakestAxis}仍是短板。`,
    turningPoints: state.history.slice(-3).concat(["第十年：宗门评级大考落定。"]).slice(0, 3)
  };
}
