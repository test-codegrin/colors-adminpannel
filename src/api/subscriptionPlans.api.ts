import type {
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from "@/types/subscriptionPlan.types";

import api from "@/lib/axios";

export type UserStatusFilter = "all" | "Active" | "unactive";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface SinglePlanResponse<T> {
  success: boolean;
  plan: T;
  message?: string;
}

interface SubscriptionPlansListResponse<T> {
  success: boolean;
  count: number;
  plans: T[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    totalPages?: number;
  };
}

export interface GetSubscriptionPlanParams {
  page: number;
  limit: number;
  search?: string;
  is_paid?: 0 | 1;
  is_active?: 0 | 1;
  is_beta?: 0 | 1;
  signal?: AbortSignal;
}

/**
 * 🔥 MAIN FUNCTION WITH FULL FILTER SUPPORT
 */
export async function getSubscriptionPlans(
pageOrParams: number | GetSubscriptionPlanParams, limit?: number, _p0?: string | undefined, _p1?: number | null, _p2?: number | null,
): Promise<SubscriptionPlansListResponse<SubscriptionPlan>> {
  const request: GetSubscriptionPlanParams =
    typeof pageOrParams === "number"
      ? { page: pageOrParams, limit: limit ?? 50 }
      : pageOrParams;

  const params: Record<string, number | string> = {
    page: request.page,
    limit: request.limit,
  };

  // ✅ Search filter
  if (request.search?.trim()) {
    params.search = request.search.trim();
  }

  // ✅ Paid filter
  if (typeof request.is_paid !== "undefined") {
    params.is_paid = request.is_paid;
  }

  // ✅ Active filter
  if (typeof request.is_active !== "undefined") {
    params.is_active = request.is_active;
  }

  // ✅ Beta filter
  if (typeof request.is_beta !== "undefined") {
    params.is_beta = request.is_beta;
  }

  const response = await api.get<
    SubscriptionPlansListResponse<SubscriptionPlan>
  >("/admin/subscription-plans", {
    params,
    signal: request.signal,
  });

  return response.data;
}

/**
 * 🔥 OPTIONAL HELPER: Convert UI filter → API params
 */
export function mapStatusToIsActive(
  status: UserStatusFilter,
): 0 | 1 | undefined {
  if (status === "Active") return 1;
  if (status === "unactive") return 0;
  return undefined; // "all"
}

/**
 * API CALLS
 */

export async function getSubscriptionPlanById(
  id: number,
): Promise<SinglePlanResponse<SubscriptionPlan>> {
  const response = await api.get<SinglePlanResponse<SubscriptionPlan>>(
    `/admin/subscription-plans/${id}`,
  );

  return response.data;
}

export async function createSubscriptionPlan(
  payload: SubscriptionPlanPayload,
): Promise<ApiResponse<SubscriptionPlan>> {
  const response = await api.post<ApiResponse<SubscriptionPlan>>(
    "/admin/subscription-plans",
    payload,
  );

  return response.data;
}

export async function updateSubscriptionPlanById(
  id: number,
  payload: SubscriptionPlanPayload,
): Promise<ApiResponse<SubscriptionPlan>> {
  const response = await api.put<ApiResponse<SubscriptionPlan>>(
    `/admin/subscription-plans/${id}`,
    payload,
  );

  return response.data;
}

export async function deleteSubscriptionPlanById(
  id: number,
): Promise<ApiResponse<{ id: number }>> {
  const response = await api.delete<ApiResponse<{ id: number }>>(
    `/admin/subscription-plans/${id}`,
  );

  return response.data;
}

export function getSubscriptionPlansErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to process subscription plans request.";
}