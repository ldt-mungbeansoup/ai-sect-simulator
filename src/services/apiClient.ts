import type { AnnualReport, SectState, TurnFacts } from "../domain/types";

export interface TurnResponse {
  state: SectState;
  facts: TurnFacts;
  report: AnnualReport;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "请求失败");
  }
  return body as T;
}

export async function fetchNewGame(): Promise<SectState> {
  const response = await fetch("/api/new-game");
  const body = await parseResponse<{ state: SectState }>(response);
  return body.state;
}

export async function submitTurn(state: SectState, decree: string): Promise<TurnResponse> {
  const response = await fetch("/api/turn", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state, decree })
  });

  return parseResponse<TurnResponse>(response);
}
