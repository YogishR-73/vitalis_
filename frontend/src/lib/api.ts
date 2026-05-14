import { TriageResponse } from "./types";

/**
 * Browser -> FastAPI triage route. The OpenRouter API key lives only on the server.
 * NEXT_PUBLIC_API_URL should point at the FastAPI origin (e.g. http://localhost:8000).
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DEFAULT_TIMEOUT_MS = 95_000;

export class TriageApiError extends Error {
  status: number;
  detail?: string;

  constructor(message: string, status: number, detail?: string) {
    super(message);
    this.name = "TriageApiError";
    this.status = status;
    this.detail = detail;
  }
}

export async function sendTriageMessage(
  message: string,
  sessionId?: string,
  signal?: AbortSignal
): Promise<TriageResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(`${API_BASE}/api/triage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal: controller.signal,
    });

    if (!res.ok) {
      let detail: string | undefined;
      try {
        const errBody = await res.json();
        detail = typeof errBody?.detail === "string" ? errBody.detail : JSON.stringify(errBody);
      } catch {
        detail = await res.text().catch(() => undefined);
      }
      throw new TriageApiError("Triage request failed", res.status, detail);
    }

    return res.json() as Promise<TriageResponse>;
  } catch (e) {
    if (e instanceof TriageApiError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new TriageApiError("Request timed out or was cancelled", 408);
    }
    throw new TriageApiError("Connection failure", 0, e instanceof Error ? e.message : String(e));
  } finally {
    clearTimeout(timeout);
  }
}
