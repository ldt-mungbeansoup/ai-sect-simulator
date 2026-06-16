import type { AnnualReport, SectState, TurnFacts } from "../domain/types";
import { ANNUAL_DIVINE_SENSE_RECOVERY, calculateDivineSenseCost, MAX_DIVINE_SENSE } from "../domain/decreeCost";
import { createInitialState, normalizeSectState } from "../domain/initialState";
import { draftReportFallback, parseDecreeFallback } from "../domain/localFallback";
import { rateSect } from "../domain/rating";
import { resolveTurn } from "../domain/resolveTurn";

export interface TurnResponse {
  state: SectState;
  facts: TurnFacts;
  report: AnnualReport;
}

class ApiResponseError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiResponseError";
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  const rawBody = await response.text();
  let body: unknown = {};

  if (rawBody.trim().length > 0) {
    try {
      body = JSON.parse(rawBody) as unknown;
    } catch {
      body = { error: rawBody };
    }
  }

  if (!response.ok) {
    const message = body && typeof body === "object" && "error" in body
      ? String((body as { error?: unknown }).error)
      : "";
    throw new ApiResponseError(message || `请求失败（HTTP ${response.status}）`, response.status);
  }

  return body as T;
}

export async function fetchNewGame(): Promise<SectState> {
  try {
    const response = await fetchApi("/api/new-game");
    const body = await parseResponse<{ state: SectState }>(response);
    return normalizeSectState(body.state);
  } catch (error) {
    if (shouldUseStaticFallback() && shouldUseLocalFallback(error)) return createInitialState();
    throw error;
  }
}

export async function submitTurn(state: SectState, decree: string, signal?: AbortSignal): Promise<TurnResponse> {
  try {
    const response = await fetchApi("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state, decree }),
      signal
    });

    const body = await parseResponse<TurnResponse>(response);
    return { ...body, state: normalizeTurnState(body.state, state, decree) };
  } catch (error) {
    if (shouldUseStaticFallback() && !(signal?.aborted) && shouldUseLocalFallback(error)) return resolveTurnLocally(state, decree);
    throw error;
  }
}

async function fetchApi(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error("无法连接宗门演算服务，请确认本地服务仍在运行后重试。");
  }
}

function normalizeTurnState(responseState: SectState, previousState: SectState, decree: string) {
  if (Number.isFinite(responseState.divineSense)) {
    return normalizeSectState(responseState);
  }

  return normalizeSectState({
    ...responseState,
    divineSense: estimateDivineSenseAfterTurn(previousState, decree)
  });
}

function estimateDivineSenseAfterTurn(previousState: SectState, decree: string) {
  const normalizedPreviousState = normalizeSectState(previousState);
  const spentDivineSense = Math.max(0, normalizedPreviousState.divineSense - calculateDivineSenseCost(decree));

  return spentDivineSense < MAX_DIVINE_SENSE
    ? Math.min(MAX_DIVINE_SENSE, spentDivineSense + ANNUAL_DIVINE_SENSE_RECOVERY)
    : spentDivineSense;
}

function shouldUseStaticFallback() {
  if (!import.meta.env.PROD || typeof window === "undefined") return false;
  return !["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function shouldUseLocalFallback(error: unknown) {
  if (error instanceof ApiResponseError) return error.status === 404;
  return true;
}

function resolveTurnLocally(state: SectState, decree: string): TurnResponse {
  const normalizedState = normalizeSectState(state);
  const parsed = parseDecreeFallback(decree);
  const resolved = resolveTurn(normalizedState, decree, parsed, { divineSenseCost: calculateDivineSenseCost(decree) });
  const reportDraft = draftReportFallback(resolved.facts);
  const rating = resolved.nextState.year === 11 ? rateSect(resolved.nextState) : undefined;
  const report: AnnualReport = {
    ...reportDraft,
    decree,
    consequences: resolved.facts.deltas,
    warnings: resolved.facts.warnings,
    rating
  };

  return {
    state: normalizeSectState({ ...resolved.nextState, lastReport: report }),
    facts: resolved.facts,
    report
  };
}
