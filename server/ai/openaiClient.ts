import "dotenv/config";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ParsedDecree, TurnFacts } from "../../src/domain/types";
import { draftReportFallback, parseDecreeFallback } from "./fallback";
import { buildDecreeUserPrompt, buildReportUserPrompt, DECREE_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT } from "./prompts";
import { ParsedDecreeSchema, ReportDraftSchema, type ReportDraftOutput } from "./schemas";

function getClient() {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("AI API key is not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL || process.env.OPENAI_BASE_URL
  });
}

function isDeepSeekProvider() {
  return process.env.AI_PROVIDER === "deepseek" || Boolean(process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_BASE_URL);
}

function parseJsonContent(content: string | null | undefined) {
  if (!content) {
    throw new Error("AI returned empty JSON content");
  }

  return JSON.parse(content) as unknown;
}

async function parseDecreeWithDeepSeek(client: OpenAI, decree: string): Promise<ParsedDecree> {
  const response = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-v4-pro",
    messages: [
      { role: "system", content: DECREE_SYSTEM_PROMPT },
      { role: "user", content: `${buildDecreeUserPrompt(decree)}\n请只输出 json 对象。` }
    ],
    response_format: { type: "json_object" },
    max_tokens: 800
  });

  return ParsedDecreeSchema.parse(parseJsonContent(response.choices[0]?.message?.content));
}

async function draftReportWithDeepSeek(client: OpenAI, facts: TurnFacts): Promise<ReportDraftOutput> {
  const response = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || process.env.OPENAI_MODEL || "deepseek-v4-pro",
    messages: [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      { role: "user", content: `${buildReportUserPrompt(facts)}\n请只输出 json 对象。` }
    ],
    response_format: { type: "json_object" },
    max_tokens: 1200
  });

  return ReportDraftSchema.parse(parseJsonContent(response.choices[0]?.message?.content));
}

export async function parseDecreeWithAI(decree: string) {
  if (process.env.AI_TEST_MODE === "true") {
    return parseDecreeFallback(decree);
  }

  const client = getClient();
  if (isDeepSeekProvider()) {
    return parseDecreeWithDeepSeek(client, decree);
  }

  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: DECREE_SYSTEM_PROMPT },
      { role: "user", content: buildDecreeUserPrompt(decree) }
    ],
    text: {
      format: zodTextFormat(ParsedDecreeSchema, "parsed_decree")
    }
  });

  return ParsedDecreeSchema.parse(response.output_parsed);
}

export async function draftReportWithAI(facts: TurnFacts) {
  if (process.env.AI_TEST_MODE === "true") {
    return draftReportFallback(facts);
  }

  const client = getClient();
  if (isDeepSeekProvider()) {
    return draftReportWithDeepSeek(client, facts);
  }

  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      { role: "user", content: buildReportUserPrompt(facts) }
    ],
    text: {
      format: zodTextFormat(ReportDraftSchema, "report_draft")
    }
  });

  return ReportDraftSchema.parse(response.output_parsed);
}
