import type {
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from "@/types/subscriptionPlan.types";

import api from "@/lib/axios";

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

export async function getSubscriptionPlans(
  page?: number,
  limit?: number,
): Promise<SubscriptionPlansListResponse<SubscriptionPlan>> {
  const response = await api.get<SubscriptionPlansListResponse<SubscriptionPlan>>(
    "/admin/subscription-plans",
    { params: { page, limit } },
  );

  return response.data;
}

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
