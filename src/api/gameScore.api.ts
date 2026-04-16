import type { GameScoreUserDetail } from "@/types/gameScore.types";

import api from "@/lib/axios";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function getGameScoreUsersDetails(): Promise<
  ApiResponse<GameScoreUserDetail[]>
> {
  const response = await api.get<ApiResponse<GameScoreUserDetail[]>>(
    "/admin/scores/users/details",
  );

  return response.data;
}

export function getGameScoreErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to load game scores.";
}
