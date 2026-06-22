import { describe, expect, it } from "vitest";
import { normalizeReportDraft } from "../ai/openaiClient";
import { ParsedDecreeSchema, ReportDraftSchema } from "../ai/schemas";

describe("AI schemas", () => {
  it("accepts a valid parsed decree", () => {
    const parsed = ParsedDecreeSchema.parse({
      axis: "人",
      stance: "广招",
      intensity: 0.7,
      summary: "放宽山门，快速扩充弟子。"
    });

    expect(parsed.stance).toBe("广招");
  });

  it("rejects a stance outside the allowed list", () => {
    expect(() =>
      ParsedDecreeSchema.parse({
        axis: "人",
        stance: "飞升",
        intensity: 0.7,
        summary: "越界姿态。"
      })
    ).toThrow();
  });

  it("accepts bounded report text", () => {
    const report = ReportDraftSchema.parse({
      title: "第1年年报",
      events: ["山门重开，散修闻讯而来。", "库藏因安置新人而略减。"],
      executiveSummary: "执事长老奉命广招弟子，宗门声势渐起。"
    });

    expect(report.events).toHaveLength(2);
  });

  it("expands an AI report title shorter than four characters", () => {
    const report = ReportDraftSchema.parse(normalizeReportDraft({
      title: "开源",
      events: ["坊市商路重新开张，库房渐有进项。", "外务堂往来频繁，威胁也随声望暗增。"],
      executiveSummary: "本年财路渐通，但仍需留意外部窥伺。"
    }));

    expect(report.title).toBe("开源施行年报");
  });
});
