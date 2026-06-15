import { calculateDivineSenseCost, countDecreeChars, MAX_DECREE_CHARS } from "../src/domain/decreeCost";
import { createInitialState, normalizeSectState } from "../src/domain/initialState";
import { rateSect } from "../src/domain/rating";
import { resolveTurn } from "../src/domain/resolveTurn";
import type { AnnualReport, SectState, TurnFacts } from "../src/domain/types";
import { draftReportWithAI, parseDecreeWithAI } from "./ai/openaiClient";

export interface TurnResponse {
  state: SectState;
  facts: TurnFacts;
  report: AnnualReport;
}

export function buildNewGameResponse() {
  return { state: createInitialState() };
}

export async function buildTurnResponse(body: { state?: SectState; decree?: string }): Promise<TurnResponse> {
  const { state, decree } = body;
  if (!state || typeof decree !== "string" || decree.trim().length < 2) {
    throw createApiError(400, "请输入至少两个字的宗主谕令。");
  }
  if (countDecreeChars(decree) > MAX_DECREE_CHARS) {
    throw createApiError(400, `宗主谕令最多${MAX_DECREE_CHARS}字。`);
  }

  const normalizedState = normalizeSectState(state);
  const parsed = await parseDecreeWithAI(decree);
  const divineSenseCost = calculateDivineSenseCost(decree);
  if (normalizedState.divineSense < divineSenseCost) {
    throw createApiError(400, `神念不足：本令需消耗${divineSenseCost}点神念，当前仅余${normalizedState.divineSense}点。`);
  }

  const resolved = resolveTurn(normalizedState, decree, parsed, { divineSenseCost });
  const reportDraft = await draftReportWithAI(resolved.facts);
  const rating = resolved.nextState.year === 11 ? rateSect(resolved.nextState) : undefined;
  const report: AnnualReport = {
    ...reportDraft,
    decree,
    consequences: resolved.facts.deltas,
    warnings: resolved.facts.warnings,
    rating
  };

  return {
    state: {
      ...resolved.nextState,
      lastReport: report
    },
    facts: resolved.facts,
    report
  };
}

export function formatApiError(error: unknown) {
  const status = getApiErrorStatus(error);
  const message = error instanceof Error ? error.message : "未知错误";

  return {
    status,
    body: {
      error: message.includes("AI API key")
        ? "缺少服务端 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，无法进行联网 AI 试玩。"
        : status >= 500
          ? `本回合演算失败：${message}`
          : message
    }
  };
}

function createApiError(status: number, message: string) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function getApiErrorStatus(error: unknown) {
  if (error instanceof Error && "status" in error && typeof error.status === "number") return error.status;
  if (error instanceof Error && error.message.includes("AI API key")) return 503;
  return 500;
}
