import { describe, expect, it } from "vitest";
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
});
