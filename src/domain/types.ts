export type Axis = "人" | "财" | "物" | "势";

export type StanceName =
  | "广招"
  | "精培"
  | "严训"
  | "安抚"
  | "整肃"
  | "开源"
  | "节流"
  | "投资"
  | "赈济"
  | "搜刮"
  | "新建"
  | "升级"
  | "维护"
  | "专精"
  | "防御"
  | "扬名"
  | "结交"
  | "避世"
  | "震慑"
  | "占机";

export interface SectState {
  year: number;
  disciples: {
    total: number;
    elite: number;
    morale: number;
    loyalty: number;
    combat: number;
  };
  finance: {
    spiritStones: number;
    yearlyIncome: number;
    yearlyExpense: number;
  };
  facilities: {
    trainingGround: number;
    scripturePavilion: number;
    spiritField: number;
    alchemyRoom: number;
  };
  influence: {
    reputation: number;
    luck: number;
    threat: number;
  };
  history: string[];
  lastReport?: AnnualReport;
  gameOver?: GameOverState;
}

export interface GameOverState {
  reason: "弟子断绝" | "灵石枯竭" | "宗门离散";
  chronicle: string;
}

export interface ParsedDecree {
  axis: Axis;
  stance: StanceName;
  intensity: number;
  summary: string;
}

export interface NumericDelta {
  path: string;
  label: string;
  before: number;
  after: number;
  change: number;
}

export interface TurnFacts {
  decree: string;
  parsed: ParsedDecree;
  deltas: NumericDelta[];
  eventSeeds: string[];
  warnings: string[];
}

export interface AnnualReport {
  title: string;
  decree: string;
  events: string[];
  consequences: NumericDelta[];
  executiveSummary: string;
  warnings: string[];
  rating?: SectRating;
}

export interface SectRating {
  rank: "覆灭" | "勉强立足" | "小有名望" | "一方大宗" | "仙门新星";
  totalScore: number;
  axisScores: Record<Axis, number>;
  summary: string;
  turningPoints: string[];
}

export interface StanceEffect {
  axis: Axis;
  stance: StanceName;
  positive: string;
  cost: string;
  eventSeeds: string[];
  effects: Partial<{
    totalDisciples: number;
    eliteDisciples: number;
    morale: number;
    loyalty: number;
    combat: number;
    spiritStones: number;
    yearlyIncome: number;
    yearlyExpense: number;
    trainingGround: number;
    scripturePavilion: number;
    spiritField: number;
    alchemyRoom: number;
    reputation: number;
    luck: number;
    threat: number;
  }>;
}
