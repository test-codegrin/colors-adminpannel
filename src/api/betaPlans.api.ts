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

export interface GetBetaPlansParams {
  page: number;
  limit: number;
  search?: string;
  signal?: AbortSignal;
}

export async function getBetaPlans(
  pageOrParams: number | GetBetaPlansParams,
  limit?: number,
): Promise<PaginatedApiResponse<BetaPlan>> {
  const request: GetBetaPlansParams =
    typeof pageOrParams === "number"
      ? { page: pageOrParams, limit: limit ?? 50 }
      : pageOrParams;

  const params: Record<string, number | string> = {
    page: request.page,
    limit: request.limit,
  };

  if (request.search?.trim()) {
    params.search = request.search.trim();
  }

  const response = await api.get<PaginatedApiResponse<BetaPlan>>("/beta", {
    params,
    signal: request.signal,
  });

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

export function isBetaPlansRequestCancelled(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ERR_CANCELED",
  );
}