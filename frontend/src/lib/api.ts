import type { Commentary, CreateCommentaryInput, CreateMatchInput, Match } from "./types";

// Requests go through the Next.js rewrite in next.config.ts, which forwards /api/* to the backend.
const API_BASE = "/api";

export interface ApiIssue {
  path: (string | number)[];
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Field-level messages keyed by the first path segment of each validation issue. */
  fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {};
    for (const issue of this.issues) {
      const key = String(issue.path[0] ?? "");
      if (key && !errors[key]) errors[key] = issue.message;
    }
    return errors;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
      cache: "no-store",
    });
  } catch {
    throw new ApiError("Can't reach the Sportz server. Check that the backend is running.", 0);
  }

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    const issues = Array.isArray(body?.details) ? body.details : [];
    const fallback =
      res.status >= 500 ? "The Sportz server ran into a problem." : `Request failed (${res.status}).`;
    throw new ApiError(body?.error ?? fallback, res.status, issues);
  }

  return body as T;
}

export async function listMatches(limit = 100): Promise<Match[]> {
  const { data } = await request<{ data: Match[] }>(`/matches?limit=${limit}`);
  return data;
}

export async function createMatch(input: CreateMatchInput): Promise<Match> {
  const { data } = await request<{ data: Match }>("/matches", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export async function listCommentary(matchId: number, limit = 100): Promise<Commentary[]> {
  const { data } = await request<{ data: Commentary[] }>(
    `/matches/${matchId}/commentary?limit=${limit}`,
  );
  return data;
}

export async function createCommentary(
  matchId: number,
  input: CreateCommentaryInput,
): Promise<Commentary> {
  const { data } = await request<{ data: Commentary }>(`/matches/${matchId}/commentary`, {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
