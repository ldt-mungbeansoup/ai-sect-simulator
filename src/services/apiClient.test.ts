import { afterEach, describe, expect, it, vi } from "vitest";
import type { SectState } from "../domain/types";
import { fetchNewGame, submitTurn } from "./apiClient";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiClient", () => {
  it("reports a friendly message when the backend is unreachable", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(fetchNewGame()).rejects.toThrow("无法连接宗门演算服务");
  });

  it("surfaces structured backend errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ error: "缺少服务端 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，无法进行联网 AI 试玩。" }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    ));

    await expect(submitTurn({} as SectState, "安抚弟子")).rejects.toThrow("缺少服务端");
  });

  it("does not crash when the backend returns non-json text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("服务临时不可用", { status: 500 }));

    await expect(submitTurn({} as SectState, "安抚弟子")).rejects.toThrow("服务临时不可用");
  });

  it("normalizes missing divine sense from new-game responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({ state: { year: 1 } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

    const state = await fetchNewGame();

    expect(state.divineSense).toBe(100);
  });

  it("estimates divine sense when old turn responses omit it", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({
        state: { year: 2 },
        facts: { decree: "安抚弟子", parsed: { axis: "人", stance: "安抚", intensity: 0.7, summary: "安定弟子。" }, deltas: [], eventSeeds: [], warnings: [] },
        report: { title: "安抚施行年报", decree: "安抚弟子", events: ["执事奉命安抚弟子。", "年终清点未见显著波动。"], consequences: [], executiveSummary: "安定弟子。", warnings: [] }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

    const response = await submitTurn({ year: 1, divineSense: 100 } as SectState, "安抚弟子");

    expect(response.state.divineSense).toBe(100);
  });

  it("preserves divine sense from current turn responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(
      JSON.stringify({
        state: { year: 2, divineSense: 92 },
        facts: { decree: "重修山门阵法", parsed: { axis: "财", stance: "建设", intensity: 0.7, summary: "修缮阵法。" }, deltas: [], eventSeeds: [], warnings: [] },
        report: { title: "阵法修缮年报", decree: "重修山门阵法", events: ["执事奉命重修山门阵法。"], consequences: [], executiveSummary: "阵法渐稳。", warnings: [] }
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    ));

    const response = await submitTurn({ year: 1, divineSense: 100 } as SectState, "重修山门阵法");

    expect(response.state.divineSense).toBe(92);
  });
});
