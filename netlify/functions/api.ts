import { buildHealthResponse, buildNewGameResponse, buildTurnResponse, formatApiError } from "../../server/apiHandlers";
import type { SectState } from "../../src/domain/types";

interface NetlifyEvent {
  httpMethod: string;
  path: string;
  body: string | null;
}

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8"
};

export async function handler(event: NetlifyEvent) {
  try {
    if (event.httpMethod === "OPTIONS") {
      return response(204, {});
    }

    if (event.httpMethod === "GET" && event.path.endsWith("/new-game")) {
      return response(200, buildNewGameResponse());
    }

    if (event.httpMethod === "GET" && event.path.endsWith("/health")) {
      return response(200, buildHealthResponse());
    }

    if (event.httpMethod === "POST" && event.path.endsWith("/turn")) {
      const body = parseJsonBody(event.body);
      return response(200, await buildTurnResponse(body as { state?: SectState; decree?: string }));
    }

    return response(404, { error: "未找到宗门 API。" });
  } catch (error) {
    const formatted = formatApiError(error);
    return response(formatted.status, formatted.body);
  }
}

function parseJsonBody(body: string | null) {
  if (!body) return {};

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw Object.assign(new Error("请求内容不是有效 JSON。"), { status: 400 });
  }
}

function response(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: jsonHeaders,
    body: statusCode === 204 ? "" : JSON.stringify(body)
  };
}
