import type {
  GameScoreUserDetail,
  GameScoreUsersDetailsResponse,
} from "@/types/gameScore.types";

import api from "@/lib/axios";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function normalizeGameScoreUserDetail(value: unknown): GameScoreUserDetail | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    username: typeof value.username === "string" ? value.username : "",
    useremail: typeof value.useremail === "string" ? value.useremail : "",
    highestscore: toNumber(value.highestscore),
    currentscore: toNumber(value.currentscore),
  };
}

function extractGameScoreUserDetails(raw: unknown): GameScoreUserDetail[] {
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => normalizeGameScoreUserDetail(entry))
      .filter((entry): entry is GameScoreUserDetail => entry !== null);
  }

  if (!isRecord(raw) || !Array.isArray(raw.data)) {
    return [];
  }

  return raw.data
    .map((entry) => normalizeGameScoreUserDetail(entry))
    .filter((entry): entry is GameScoreUserDetail => entry !== null);
}

export async function getGameScoreUsersDetails(): Promise<GameScoreUsersDetailsResponse> {
  const response = await api.get<unknown>("/admin/scores/users/details");

  return {
    success: isRecord(response.data)
      ? (response.data.success as boolean | undefined)
      : undefined,
    data: extractGameScoreUserDetails(response.data),
  };
}

export function getGameScoreErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load game scores.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Failed to load game scores.";
}

