import "dotenv/config";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { TurnFacts } from "../../src/domain/types";
import { draftReportFallback, parseDecreeFallback } from "./fallback";
import { buildDecreeUserPrompt, buildReportUserPrompt, DECREE_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT } from "./prompts";
import { ParsedDecreeSchema, ReportDraftSchema } from "./schemas";

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

  const client = getClient();
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
