import type { AnnualReport, ParsedDecree, TurnFacts } from "../../src/domain/types";

export function parseDecreeFallback(decree: string): ParsedDecree {
  if (decree.includes("灵石") || decree.includes("账") || decree.includes("财")) {
    return { axis: "财", stance: decree.includes("搜") ? "搜刮" : "开源", intensity: 0.7, summary: "整顿宗门财计。" };
  }
  if (decree.includes("修") || decree.includes("阵") || decree.includes("建")) {
    return { axis: "物", stance: decree.includes("防") || decree.includes("阵") ? "防御" : "升级", intensity: 0.7, summary: "调整宗门设施。" };
  }
  if (decree.includes("名") || decree.includes("盟") || decree.includes("封山")) {
    return { axis: "势", stance: decree.includes("封山") ? "避世" : "扬名", intensity: 0.7, summary: "调整宗门对外姿态。" };
  }
  return { axis: "人", stance: decree.includes("严") ? "严训" : "广招", intensity: 0.7, summary: "调整弟子事务。" };
}

export function draftReportFallback(facts: TurnFacts): Omit<AnnualReport, "decree" | "consequences" | "warnings"> {
  const deltaText = facts.deltas
    .slice(0, 3)
    .map((delta) => `${delta.label}${delta.change > 0 ? "+" : ""}${delta.change}`)
    .join("，");

  return {
    title: `第${facts.parsed.axis}策年报`,
    events: [
      `执事长老奉命推行“${facts.parsed.stance}”，宗门上下以${facts.eventSeeds[0]}为本年要务。`,
      deltaText ? `年终清点可见：${deltaText}。` : "年终清点未见显著波动。"
    ],
    executiveSummary: facts.parsed.summary
  };
}
