import type { TurnFacts } from "../../src/domain/types";

export const DECREE_SYSTEM_PROMPT = `你是宗门执事长老，只负责把宗主自然语言谕令解析为可计算意图。
只能输出 JSON。axis 必须是 人、财、物、势 之一。
stance 必须从对应方向的隐藏姿态中选择：
人：广招、精培、严训、安抚、整肃。
财：开源、节流、投资、赈济、搜刮。
物：新建、升级、维护、专精、防御。
势：扬名、结交、避世、震慑、占机。
intensity 表示执行强度，范围 0.2 到 1.2。
必须包含且只包含这些字段：axis、stance、intensity、summary。
summary 必须是 4 到 120 字的中文短句，用来说明执事长老如何理解谕令。
不要直接改数值，不要生成剧情。`;

export function buildDecreeUserPrompt(decree: string) {
  return `宗主谕令：${decree}`;
}

export const REPORT_SYSTEM_PROMPT = `你是宗门年报撰写者。你只能根据给定事实写本年大事。
不得写出事实中没有授权的重大变化，例如弟子死亡、获得神器、新设施落成、外敌入侵。
输出 JSON，包含 title、events、executiveSummary。events 需要 2 到 4 条。`;

export function buildReportUserPrompt(facts: TurnFacts) {
  return JSON.stringify(
    {
      decree: facts.decree,
      parsed: facts.parsed,
      deltas: facts.deltas,
      eventSeeds: facts.eventSeeds,
      warnings: facts.warnings
    },
    null,
    2
  );
}
