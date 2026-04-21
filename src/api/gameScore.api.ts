import type { GameScoreUserDetail } from "@/types/gameScore.types";

import api from "@/lib/axios";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface GetGameScoreParams {
  search?: string;
  signal?: AbortSignal;
}

export async function getGameScoreUsersDetails(
  params?: GetGameScoreParams,
): Promise<ApiResponse<GameScoreUserDetail[]>> {
  const queryParams: Record<string, string> = {};

  if (params?.search?.trim()) {
    queryParams.search = params.search.trim();
  }

  const response = await api.get<ApiResponse<GameScoreUserDetail[]>>(
    "/admin/scores/users/details",
    {
      params: queryParams,
      signal: params?.signal,
    },
  );

  return response.data;
}

export function getGameScoreErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to load game scores.";
}

export function isGameScoreRequestCancelled(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ERR_CANCELED",
  );
}