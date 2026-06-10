import { z } from "zod";

export const AxisSchema = z.enum(["人", "财", "物", "势"]);

export const StanceSchema = z.enum([
  "广招",
  "精培",
  "严训",
  "安抚",
  "整肃",
  "开源",
  "节流",
  "投资",
  "赈济",
  "搜刮",
  "新建",
  "升级",
  "维护",
  "专精",
  "防御",
  "扬名",
  "结交",
  "避世",
  "震慑",
  "占机"
]);

export const ParsedDecreeSchema = z.object({
  axis: AxisSchema,
  stance: StanceSchema,
  intensity: z.number().min(0.2).max(1.2),
  summary: z.string().min(4).max(120)
});

export const ReportDraftSchema = z.object({
  title: z.string().min(4).max(40),
  events: z.array(z.string().min(8).max(160)).min(2).max(4),
  executiveSummary: z.string().min(8).max(180)
});

export type ParsedDecreeOutput = z.infer<typeof ParsedDecreeSchema>;
export type ReportDraftOutput = z.infer<typeof ReportDraftSchema>;
