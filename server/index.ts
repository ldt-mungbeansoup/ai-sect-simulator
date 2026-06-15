import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateDivineSenseCost, countDecreeChars, MAX_DECREE_CHARS } from "../src/domain/decreeCost";
import { createInitialState, normalizeSectState } from "../src/domain/initialState";
import { rateSect } from "../src/domain/rating";
import { resolveTurn } from "../src/domain/resolveTurn";
import type { AnnualReport, SectState } from "../src/domain/types";
import { draftReportWithAI, parseDecreeWithAI } from "./ai/openaiClient";

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));

app.get("/api/new-game", (_req, res) => {
  res.json({ state: createInitialState() });
});

app.post("/api/turn", async (req, res) => {
  try {
    const { state, decree } = req.body as { state?: SectState; decree?: string };
    if (!state || typeof decree !== "string" || decree.trim().length < 2) {
      res.status(400).json({ error: "请输入至少两个字的宗主谕令。" });
      return;
    }
    if (countDecreeChars(decree) > MAX_DECREE_CHARS) {
      res.status(400).json({ error: `宗主谕令最多${MAX_DECREE_CHARS}字。` });
      return;
    }

    const normalizedState = normalizeSectState(state);
    const parsed = await parseDecreeWithAI(decree);
    const divineSenseCost = calculateDivineSenseCost(decree);
    if (normalizedState.divineSense < divineSenseCost) {
      res.status(400).json({
        error: `神念不足：本令需消耗${divineSenseCost}点神念，当前仅余${normalizedState.divineSense}点。`
      });
      return;
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

    const nextState: SectState = {
      ...resolved.nextState,
      lastReport: report
    };

    res.json({ state: nextState, facts: resolved.facts, report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    res.status(message.includes("AI API key") ? 503 : 500).json({
      error: message.includes("AI API key")
        ? "缺少服务端 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，无法进行联网 AI 试玩。"
        : `本回合演算失败：${message}`
    });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../dist")));
} else {
  const { createServer: createViteServer } = await import("vite");
  const hmrPort = Number(process.env.VITE_HMR_PORT || port + 10000);
  const vite = await createViteServer({
    configLoader: "runner",
    server: {
      middlewareMode: true,
      hmr: { port: hmrPort }
    },
    appType: "spa"
  });
  app.use(vite.middlewares);
}

if (process.env.NODE_ENV === "production") {
  app.use((_req, res) => {
    res.sendFile(path.resolve(__dirname, "../dist/index.html"));
  });
}

app.listen(port, "127.0.0.1", () => {
  console.log(`Sect simulator listening at http://127.0.0.1:${port}`);
});
