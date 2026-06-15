import type { NumericDelta, SectState } from "./types";

type NumericPath = {
  path: string;
  label: string;
  read: (state: SectState) => number;
};

export const NUMERIC_PATHS: NumericPath[] = [
  { path: "divineSense", label: "神念", read: (state) => state.divineSense },
  { path: "disciples.total", label: "弟子总数", read: (state) => state.disciples.total },
  { path: "disciples.elite", label: "精英弟子", read: (state) => state.disciples.elite },
  { path: "disciples.morale", label: "士气", read: (state) => state.disciples.morale },
  { path: "disciples.loyalty", label: "忠诚", read: (state) => state.disciples.loyalty },
  { path: "disciples.combat", label: "战力", read: (state) => state.disciples.combat },
  { path: "finance.spiritStones", label: "灵石", read: (state) => state.finance.spiritStones },
  { path: "finance.yearlyIncome", label: "年收入", read: (state) => state.finance.yearlyIncome },
  { path: "finance.yearlyExpense", label: "年支出", read: (state) => state.finance.yearlyExpense },
  { path: "facilities.trainingGround", label: "演武场", read: (state) => state.facilities.trainingGround },
  { path: "facilities.scripturePavilion", label: "藏经阁", read: (state) => state.facilities.scripturePavilion },
  { path: "facilities.spiritField", label: "灵田", read: (state) => state.facilities.spiritField },
  { path: "facilities.alchemyRoom", label: "炼丹房", read: (state) => state.facilities.alchemyRoom },
  { path: "influence.reputation", label: "声望", read: (state) => state.influence.reputation },
  { path: "influence.luck", label: "气运", read: (state) => state.influence.luck },
  { path: "influence.threat", label: "威胁", read: (state) => state.influence.threat }
];

export function collectDeltas(before: SectState, after: SectState): NumericDelta[] {
  return NUMERIC_PATHS.map((item) => {
    const previous = item.read(before);
    const next = item.read(after);
    return {
      path: item.path,
      label: item.label,
      before: previous,
      after: next,
      change: next - previous
    };
  }).filter((delta) => delta.change !== 0);
}
