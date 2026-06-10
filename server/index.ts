import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createViteServer } from "vite";
import { createInitialState } from "../src/domain/initialState";
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

    const parsed = await parseDecreeWithAI(decree);
    const resolved = resolveTurn(state, decree, parsed);
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
    res.status(message.includes("OPENAI_API_KEY") ? 503 : 500).json({
      error: message.includes("OPENAI_API_KEY")
        ? "缺少服务端 OPENAI_API_KEY，无法进行联网 AI 试玩。"
        : `本回合演算失败：${message}`
    });
  }
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.resolve(__dirname, "../dist")));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
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
