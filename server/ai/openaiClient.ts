import "dotenv/config";
import OpenAI from "openai";
import type { TurnFacts } from "../../src/domain/types";
import { draftReportFallback, parseDecreeFallback } from "./fallback";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

export async function parseDecreeWithAI(decree: string) {
  if (process.env.AI_TEST_MODE === "true") {
    return parseDecreeFallback(decree);
  }

  getClient();
  throw new Error("联网 AI 解析将在后续任务中接入结构化输出。当前可使用 AI_TEST_MODE=true 验证框架。");
}

export async function draftReportWithAI(facts: TurnFacts) {
  if (process.env.AI_TEST_MODE === "true") {
    return draftReportFallback(facts);
  }

  getClient();
  throw new Error("联网 AI 年报将在后续任务中接入结构化输出。当前可使用 AI_TEST_MODE=true 验证框架。");
}
