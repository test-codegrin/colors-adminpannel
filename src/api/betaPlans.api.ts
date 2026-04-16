import type { BetaPlan } from "@/types/betaPlans.types";

import api from "@/lib/axios";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  count: number;
  total: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    totalPages?: number;
  };
}

export async function getBetaPlans(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedApiResponse<BetaPlan>> {
  const response = await api.get<PaginatedApiResponse<BetaPlan>>(
    "/beta",
    { params },
  );

  return response.data;
}

export async function getBetaPlanById(
  id: number,
): Promise<ApiResponse<BetaPlan>> {
  const response = await api.get<ApiResponse<BetaPlan>>(`/beta/${id}`);

  return response.data;
}

export async function deleteBetaPlanById(
  id: number,
): Promise<ApiResponse<{ id: number }>> {
  const response = await api.delete<ApiResponse<{ id: number }>>(`/beta/${id}`);

  return response.data;
}

export function getBetaPlansErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to load beta plans.";
}
