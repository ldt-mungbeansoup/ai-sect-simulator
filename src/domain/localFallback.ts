import type { AnnualReport, Axis, ParsedDecree, StanceName, TurnFacts } from "./types";

interface FallbackRule {
  axis: Axis;
  stance: StanceName;
  keywords: string[];
  summary: string;
}

const rules: FallbackRule[] = [
  { axis: "人", stance: "安抚", keywords: ["安抚", "稳住", "稳定", "安定", "抚恤", "抚慰", "慰问", "讲道", "人心", "心气", "休整"], summary: "安定弟子心气，稳住宗门内务。" },
  { axis: "人", stance: "广招", keywords: ["广招", "招收", "招募", "招揽", "收徒", "纳新", "开山门", "广开山门", "扩充人手"], summary: "广开山门，补充弟子与人手。" },
  { axis: "人", stance: "精培", keywords: ["精培", "培养", "内门", "核心弟子", "内门弟子", "点拨", "闭关", "天才", "传功"], summary: "集中资源培养核心弟子。" },
  { axis: "人", stance: "严训", keywords: ["严训", "苦训", "训练", "演武", "试炼", "操练"], summary: "以严训提升弟子战力。" },
  { axis: "人", stance: "整肃", keywords: ["整肃", "整顿", "约束", "清查", "门规", "惩戒", "肃清"], summary: "整肃门规，压住宗门内耗。" },
  { axis: "财", stance: "搜刮", keywords: ["搜刮", "重税", "压榨", "榨取"], summary: "强行聚敛灵石，承担民怨代价。" },
  { axis: "财", stance: "赈济", keywords: ["赈济", "救济", "开仓", "施药", "扶助"], summary: "以财物扶危济困，换取声望与人心。" },
  { axis: "财", stance: "投资", keywords: ["投资", "购置", "产业", "商会", "灵脉"], summary: "投入灵石经营产业，换取长期收益。" },
  { axis: "财", stance: "节流", keywords: ["节流", "缩减", "省", "省钱", "裁撤", "账册"], summary: "收紧用度，降低宗门支出。" },
  { axis: "财", stance: "开源", keywords: ["灵石", "财", "商路", "收入", "丹药售卖", "赚钱"], summary: "拓展财源，改善宗门收入。" },
  { axis: "物", stance: "防御", keywords: ["防御", "护山", "戒备", "阵法", "护山阵", "巡山"], summary: "加固山门防御，压低外患威胁。" },
  { axis: "物", stance: "新建", keywords: ["新建", "兴建", "建造", "动工", "增筑", "演武场"], summary: "动工建设新设施，扩展宗门根基。" },
  { axis: "物", stance: "维护", keywords: ["维护", "修缮", "检修", "整理", "保养"], summary: "修缮维护设施，换取稳定运转。" },
  { axis: "物", stance: "专精", keywords: ["专精", "丹道", "武修", "藏经", "专修"], summary: "确立设施专精方向，集中强化收益。" },
  { axis: "物", stance: "升级", keywords: ["升级", "扩建", "改造", "设施", "炼丹房", "藏经阁", "灵田"], summary: "升级现有设施，提升宗门产出。" },
  { axis: "势", stance: "避世", keywords: ["避世", "封山", "闭门", "低调", "隐修", "不要争", "不争"], summary: "收束外务，避开风头以稳住局势。" },
  { axis: "势", stance: "结交", keywords: ["结交", "盟", "盟友", "往来", "礼聘", "互换"], summary: "经营宗门关系，争取外部支援。" },
  { axis: "势", stance: "震慑", keywords: ["震慑", "立威", "斩妖", "强硬", "巡狩"], summary: "以强硬姿态震慑外敌。" },
  { axis: "势", stance: "占机", keywords: ["占机", "占卜", "观星", "趋吉避凶", "天机"], summary: "观测天机，提前规避风险。" },
  { axis: "势", stance: "扬名", keywords: ["扬名", "名声", "声望", "论道", "名"], summary: "主动扬名，提高宗门影响。" }
];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function matchScore(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => score + (text.includes(keyword) ? keyword.length : 0), 0);
}

function inferIntensity(decree: string) {
  if (includesAny(decree, ["全力", "大力", "重金", "不惜", "立刻"])) return 0.95;
  if (includesAny(decree, ["稍", "略", "暂且", "小幅", "试行"])) return 0.45;
  return 0.7;
}

export function parseDecreeFallback(decree: string): ParsedDecree {
  const rule = rules.reduce<{ rule: FallbackRule; score: number }>(
    (best, candidate) => {
      const score = matchScore(decree, candidate.keywords);
      return score > best.score ? { rule: candidate, score } : best;
    },
    { rule: rules[0], score: 0 }
  ).rule;

  return {
    axis: rule.axis,
    stance: rule.stance,
    intensity: inferIntensity(decree),
    summary: rule.summary
  };
}

export function draftReportFallback(facts: TurnFacts): Omit<AnnualReport, "decree" | "consequences" | "warnings"> {
  const deltaText = facts.deltas
    .slice(0, 3)
    .map((delta) => `${delta.label}${delta.change > 0 ? "+" : ""}${delta.change}`)
    .join("，");
  const systemicEvents = facts.eventSeeds.filter((seed) =>
    ["供养", "人心", "气运", "威胁", "声望", "设施"].some((keyword) => seed.includes(keyword))
  ).slice(0, 2);

  return {
    title: `${facts.parsed.stance}施行年报`,
    events: [
      `执事长老奉命推行“${facts.parsed.stance}”，宗门上下以${facts.eventSeeds[0]}为本年要务。`,
      ...systemicEvents,
      deltaText ? `年终清点可见：${deltaText}。` : "年终清点未见显著波动。"
    ].slice(0, 4),
    executiveSummary: facts.parsed.summary
  };
}
