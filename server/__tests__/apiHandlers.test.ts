import { afterEach, describe, expect, it, vi } from "vitest";
import { createInitialState } from "../../src/domain/initialState";
import { buildHealthResponse, buildNewGameResponse, buildTurnResponse, formatApiError } from "../apiHandlers";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("apiHandlers", () => {
  it("builds a normalized new game response", () => {
    const response = buildNewGameResponse();

    expect(response.state.year).toBe(1);
    expect(response.state.divineSense).toBe(100);
  });

  it("reports AI runtime status without exposing key values", () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "sk-secret");
    vi.stubEnv("AI_PROVIDER", "deepseek");

    const response = buildHealthResponse();

    expect(response.ai.provider).toBe("deepseek");
    expect(response.ai.hasDeepSeekKey).toBe(true);
    expect(JSON.stringify(response)).not.toContain("sk-secret");
  });

  it("resolves a turn through shared api logic", async () => {
    vi.stubEnv("AI_TEST_MODE", "true");

    const response = await buildTurnResponse({
      state: createInitialState(),
      decree: "安抚弟子，稳住人心"
    });

    expect(response.state.year).toBe(2);
    expect(response.facts.parsed.stance).toBe("安抚");
    expect(response.report.decree).toBe("安抚弟子，稳住人心");
  });

  it("returns a friendly validation error when divine sense is insufficient", async () => {
    vi.stubEnv("AI_TEST_MODE", "true");

    await expect(buildTurnResponse({
      state: { ...createInitialState(), divineSense: 1 },
      decree: "安抚弟子"
    })).rejects.toThrow("神念不足");
  });

  it("formats missing AI key errors for clients", () => {
    const formatted = formatApiError(new Error("AI API key is not configured"));

    expect(formatted.status).toBe(503);
    expect(formatted.body.error).toContain("未读取到");
  });

  it("does not leak invalid API key details to clients", () => {
    const formatted = formatApiError(Object.assign(
      new Error("401 Incorrect API key provided: sk-test"),
      { status: 401, code: "invalid_api_key" }
    ));

    expect(formatted.status).toBe(503);
    expect(formatted.body.error).toContain("无效");
    expect(formatted.body.error).not.toContain("sk-test");
  });
});
