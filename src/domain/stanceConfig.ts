import type { Axis, StanceEffect, StanceName } from "./types";

export const STANCE_CONFIG: Record<Axis, Record<string, StanceEffect>> = {
  人: {
    广招: {
      axis: "人",
      stance: "广招",
      positive: "弟子数量上升，声望小幅增加",
      cost: "消耗灵石，管理压力上升",
      eventSeeds: ["开山收徒", "散修投靠", "山门热闹"],
      effects: { totalDisciples: 5, spiritStones: -190, morale: -6, loyalty: -3, reputation: 7, yearlyExpense: 45, threat: 4 }
    },
    精培: {
      axis: "人",
      stance: "精培",
      positive: "精英弟子成长，战力质量上升",
      cost: "消耗灵石，人数增长缓慢",
      eventSeeds: ["闭关点拨", "内门选拔", "天才突破"],
      effects: { eliteDisciples: 2, combat: 16, spiritStones: -180, morale: -2, reputation: 3, yearlyExpense: 30 }
    },
    严训: {
      axis: "人",
      stance: "严训",
      positive: "战力和威胁应对上升",
      cost: "士气与忠诚下降，有受伤隐患",
      eventSeeds: ["演武试炼", "弟子抱怨", "苦训成效"],
      effects: { combat: 24, morale: -13, loyalty: -8, reputation: 2, threat: -6 }
    },
    安抚: {
      axis: "人",
      stance: "安抚",
      positive: "士气与忠诚上升，内忧风险下降",
      cost: "战力成长变慢，灵石小幅消耗",
      eventSeeds: ["宗主讲道", "抚恤弟子", "派系缓和"],
      effects: { morale: 17, loyalty: 14, spiritStones: -100, combat: -2, reputation: 2, threat: -2 }
    },
    整肃: {
      axis: "人",
      stance: "整肃",
      positive: "纪律和效率上升，内忧下降",
      cost: "忠诚波动，声望可能下降",
      eventSeeds: ["清查门规", "惩戒执事", "派系震动"],
      effects: { loyalty: -10, morale: -9, combat: 12, yearlyExpense: -40, reputation: -5, threat: -3 }
    }
  },
  财: {
    开源: {
      axis: "财",
      stance: "开源",
      positive: "年度收入上升，长期财力增强",
      cost: "需要初期投入",
      eventSeeds: ["重开商路", "灵田增收", "丹药售卖"],
      effects: { spiritStones: -130, yearlyIncome: 145, reputation: 4, threat: 3 }
    },
    节流: {
      axis: "财",
      stance: "节流",
      positive: "支出下降，破产风险降低",
      cost: "士气小降，成长速度下降",
      eventSeeds: ["缩减用度", "账册清查", "库房封存"],
      effects: { spiritStones: 70, yearlyExpense: -115, morale: -9, loyalty: -3, combat: -4, reputation: -2 }
    },
    投资: {
      axis: "财",
      stance: "投资",
      positive: "未来收益上升",
      cost: "当前灵石大幅下降",
      eventSeeds: ["购置灵脉", "扩建产业", "商会往来"],
      effects: { spiritStones: -290, yearlyIncome: 220, reputation: 7, luck: -4, threat: 4 }
    },
    赈济: {
      axis: "财",
      stance: "赈济",
      positive: "声望、气运和忠诚上升",
      cost: "灵石下降，短期收益较弱",
      eventSeeds: ["救济凡民", "扶助散修", "开仓施药"],
      effects: { spiritStones: -230, reputation: 16, luck: 11, loyalty: 9, morale: 6, yearlyIncome: -20 }
    },
    搜刮: {
      axis: "财",
      stance: "搜刮",
      positive: "灵石快速上升",
      cost: "士气、声望、气运下降",
      eventSeeds: ["重税", "压榨附庸", "怨言四起"],
      effects: { spiritStones: 380, yearlyIncome: 35, morale: -18, loyalty: -15, reputation: -17, luck: -11, threat: 11 }
    }
  },
  物: {
    新建: {
      axis: "物",
      stance: "新建",
      positive: "解锁或补足设施成长方向",
      cost: "灵石大幅消耗，维护压力上升",
      eventSeeds: ["动工扩建", "山门增筑", "匠修入山"],
      effects: { spiritStones: -270, trainingGround: 2, spiritField: 1, reputation: 5, yearlyExpense: 55 }
    },
    升级: {
      axis: "物",
      stance: "升级",
      positive: "已有设施效果增强",
      cost: "灵石消耗，收益集中",
      eventSeeds: ["炼丹房扩炉", "藏经阁增典", "灵田改造"],
      effects: { spiritStones: -230, trainingGround: 1, scripturePavilion: 2, yearlyIncome: 65, combat: 9, yearlyExpense: 20 }
    },
    维护: {
      axis: "物",
      stance: "维护",
      positive: "设施稳定，事故风险下降",
      cost: "爆发收益较低",
      eventSeeds: ["修缮阵法", "整理库房", "检查炉火"],
      effects: { spiritStones: -95, morale: 8, luck: 5, yearlyExpense: -40, threat: -4 }
    },
    专精: {
      axis: "物",
      stance: "专精",
      positive: "某类设施收益显著上升",
      cost: "其他方向发展变慢",
      eventSeeds: ["丹道专修", "武修立宗", "藏经传承"],
      effects: { spiritStones: -220, scripturePavilion: 1, alchemyRoom: 2, yearlyIncome: 105, morale: -3, reputation: 8, yearlyExpense: 25 }
    },
    防御: {
      axis: "物",
      stance: "防御",
      positive: "威胁损失下降，评级安全感上升",
      cost: "灵石消耗，经济收益弱",
      eventSeeds: ["护山大阵", "巡山机关", "山门戒备"],
      effects: { spiritStones: -220, combat: 12, luck: 3, threat: -18, yearlyExpense: 25 }
    }
  },
  势: {
    扬名: {
      axis: "势",
      stance: "扬名",
      positive: "声望和招募质量上升",
      cost: "外部关注上升",
      eventSeeds: ["论道扬名", "收服小派", "名声远播"],
      effects: { reputation: 24, eliteDisciples: 2, yearlyExpense: 15, luck: -2, threat: 12 }
    },
    结交: {
      axis: "势",
      stance: "结交",
      positive: "支援机会增加，气运小升",
      cost: "消耗灵石和人情",
      eventSeeds: ["宗门往来", "礼聘盟友", "互换典籍"],
      effects: { spiritStones: -155, yearlyIncome: 40, reputation: 10, luck: 8, threat: -7 }
    },
    避世: {
      axis: "势",
      stance: "避世",
      positive: "威胁压力下降，内修稳定",
      cost: "声望增长慢，机遇减少",
      eventSeeds: ["封山闭关", "低调隐修", "外务收束"],
      effects: { threat: -18, morale: 9, loyalty: 5, reputation: -8, yearlyIncome: -50, luck: 3 }
    },
    震慑: {
      axis: "势",
      stance: "震慑",
      positive: "威胁短期下降，战力威名上升",
      cost: "敌意积累，失败代价高",
      eventSeeds: ["斩妖立威", "强硬警告", "边境巡狩"],
      effects: { combat: 16, reputation: 10, morale: -4, threat: -10, luck: -6 }
    },
    占机: {
      axis: "势",
      stance: "占机",
      positive: "气运上升，风险缓和",
      cost: "收益偏间接",
      eventSeeds: ["占卜观星", "趋吉避凶", "预警异动"],
      effects: { luck: 17, threat: -8, spiritStones: -100, yearlyIncome: -15, reputation: 3 }
    }
  }
};

export function getStanceEffect(axis: Axis, stance: StanceName): StanceEffect {
  const effect = STANCE_CONFIG[axis][stance];
  if (!effect) {
    throw new Error(`未知姿态: ${axis}/${stance}`);
  }
  return effect;
}
