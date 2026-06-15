import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SectState } from "../src/domain/types";
import { buildNewGameResponse, buildTurnResponse, formatApiError } from "./apiHandlers";

const app = express();
const port = Number(process.env.PORT || 8787);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json({ limit: "1mb" }));

app.get("/api/new-game", (_req, res) => {
  res.json(buildNewGameResponse());
});

app.post("/api/turn", async (req, res) => {
  try {
    res.json(await buildTurnResponse(req.body as { state?: SectState; decree?: string }));
  } catch (error) {
    const formatted = formatApiError(error);
    res.status(formatted.status).json(formatted.body);
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
