import "dotenv/config";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { ParsedDecree, TurnFacts } from "../../src/domain/types";
import { draftReportFallback, parseDecreeFallback } from "./fallback";
import { buildDecreeUserPrompt, buildReportUserPrompt, DECREE_SYSTEM_PROMPT, REPORT_SYSTEM_PROMPT } from "./prompts";
import { ParsedDecreeSchema, ReportDraftSchema, type ReportDraftOutput } from "./schemas";

function getClient() {
  const apiKey = getProviderConfig().apiKey;
  if (!apiKey) {
    throw new Error("AI API key is not configured");
  }
  return new OpenAI({
    apiKey,
    baseURL: getProviderConfig().baseURL
  });
}

function isDeepSeekProvider() {
  return getProviderConfig().provider === "deepseek";
}

export function getAIRuntimeStatus() {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase() || "auto";
  const hasDeepSeekKey = Boolean(process.env.DEEPSEEK_API_KEY);
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
  const provider = configuredProvider === "deepseek" || configuredProvider === "openai"
    ? configuredProvider
    : hasDeepSeekKey
      ? "deepseek"
      : hasOpenAIKey
        ? "openai"
        : "unconfigured";

  return {
    provider,
    configuredProvider,
    hasDeepSeekKey,
    hasOpenAIKey,
    deepSeekModel: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
    openAIModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    aiTestMode: process.env.AI_TEST_MODE === "true"
  };
}

function getProviderConfig() {
  const configuredProvider = process.env.AI_PROVIDER?.toLowerCase();

  if (configuredProvider === "deepseek") {
    if (!process.env.DEEPSEEK_API_KEY) {
      throw new Error("AI provider is deepseek but DEEPSEEK_API_KEY is not configured");
    }
    return {
      provider: "deepseek" as const,
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
    };
  }

  if (configuredProvider === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("AI provider is openai but OPENAI_API_KEY is not configured");
    }
    return {
      provider: "openai" as const,
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    return {
      provider: "deepseek" as const,
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"
    };
  }

  return {
    provider: "openai" as const,
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
  };
}

function parseJsonContent(content: string | null | undefined) {
  if (!content) {
    throw new Error("AI returned empty JSON content");
  }

  return JSON.parse(content) as unknown;
}

function normalizeParsedDecree(value: unknown) {
  const draft = { ...(value as Record<string, unknown>) };
  if (typeof draft.intensity === "string") {
    draft.intensity = Number(draft.intensity);
  }
  if (typeof draft.summary !== "string" || draft.summary.trim().length === 0) {
    draft.summary = `执事长老将谕令理解为${String(draft.axis ?? "宗门")}·${String(draft.stance ?? "施策")}。`;
  }
  return draft;
}

function normalizeReportDraft(value: unknown) {
  const draft = { ...(value as Record<string, unknown>) };
  if (Array.isArray(draft.events)) {
    draft.events = draft.events.map((event) => {
      if (typeof event === "string") return event;
      if (event && typeof event === "object") {
        const record = event as Record<string, unknown>;
        const parts = [record.title, record.event, record.description, record.summary, record.effect]
          .filter((part): part is string => typeof part === "string" && part.trim().length > 0);
        if (parts.length > 0) return parts.join("：");
      }
      return String(event);
    });
  }
  return draft;
}

async function parseDecreeWithDeepSeek(client: OpenAI, decree: string): Promise<ParsedDecree> {
  const response = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
    messages: [
      { role: "system", content: DECREE_SYSTEM_PROMPT },
      { role: "user", content: `${buildDecreeUserPrompt(decree)}\n请只输出 json 对象。` }
    ],
    response_format: { type: "json_object" },
    max_tokens: 800
  });

  return ParsedDecreeSchema.parse(normalizeParsedDecree(parseJsonContent(response.choices[0]?.message?.content)));
}

async function draftReportWithDeepSeek(client: OpenAI, facts: TurnFacts): Promise<ReportDraftOutput> {
  const response = await client.chat.completions.create({
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-pro",
    messages: [
      { role: "system", content: REPORT_SYSTEM_PROMPT },
      { role: "user", content: `${buildReportUserPrompt(facts)}\n请只输出 json 对象。` }
    ],
    response_format: { type: "json_object" },
    max_tokens: 1200
  });

  return ReportDraftSchema.parse(normalizeReportDraft(parseJsonContent(response.choices[0]?.message?.content)));
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
