import type {
  SingleSubscriptionPlanApiResponse,
  SubscriptionPlan,
  SubscriptionPlanPayload,
  SubscriptionPlansApiResponse,
} from "@/types/subscriptionPlan.types";

import api from "@/lib/axios";

interface DeleteSubscriptionPlanApiResponse {
  success: boolean;
  message: string;
}

interface UpdateSubscriptionPlanApiResponse {
  success: boolean;
  message?: string;
  plan?: SubscriptionPlan;
}

interface CreateSubscriptionPlanApiResponse {
  success: boolean;
  message?: string;
  plan?: SubscriptionPlan;
}

function extractPlans(data: unknown): SubscriptionPlan[] {
  if (!data || typeof data !== "object") {
    return [];
  }

  const typed = data as {
    plans?: unknown;
    data?: unknown;
  };

  if (Array.isArray(typed.plans)) {
    return typed.plans as SubscriptionPlan[];
  }

  if (Array.isArray(typed.data)) {
    return typed.data as SubscriptionPlan[];
  }

  if (
    typed.data &&
    typeof typed.data === "object" &&
    "plans" in typed.data &&
    Array.isArray((typed.data as { plans?: unknown }).plans)
  ) {
    return (typed.data as { plans: SubscriptionPlan[] }).plans;
  }

  return [];
}

export async function getSubscriptionPlans(
  page?: number,
  limit?: number,
): Promise<SubscriptionPlansApiResponse> {
  const response = await api.get<SubscriptionPlansApiResponse>(
    "/admin/subscription-plans",
    {
      params: {
        page,
        limit,
      },
    },
  );

  const data = response.data;

  return {
    ...data,
    plans: extractPlans(data),
  };
}

export async function getSubscriptionPlanById(
  id: number,
): Promise<SubscriptionPlan> {
  const response = await api.get<
    SubscriptionPlan | SingleSubscriptionPlanApiResponse
  >(`/admin/subscription-plans/${id}`);
  const data = response.data;

  if (
    data &&
    typeof data === "object" &&
    "plan" in data &&
    typeof (data as SingleSubscriptionPlanApiResponse).plan === "object" &&
    (data as SingleSubscriptionPlanApiResponse).plan !== null
  ) {
    return (data as SingleSubscriptionPlanApiResponse).plan as SubscriptionPlan;
  }

  if (
    data &&
    typeof data === "object" &&
    "data" in data &&
    typeof (data as SingleSubscriptionPlanApiResponse).data === "object" &&
    (data as SingleSubscriptionPlanApiResponse).data !== null
  ) {
    return (data as SingleSubscriptionPlanApiResponse).data as SubscriptionPlan;
  }

  return data as SubscriptionPlan;
}

export async function createSubscriptionPlan(
  payload: SubscriptionPlanPayload,
): Promise<CreateSubscriptionPlanApiResponse> {
  const response = await api.post<CreateSubscriptionPlanApiResponse>(
    "/admin/subscription-plans",
    payload,
  );

  return response.data;
}

export async function updateSubscriptionPlanById(
  id: number,
  payload: SubscriptionPlanPayload,
): Promise<UpdateSubscriptionPlanApiResponse> {
  const response = await api.put<UpdateSubscriptionPlanApiResponse>(
    `/admin/subscription-plans/${id}`,
    payload,
  );

  return response.data;
}

export async function deleteSubscriptionPlanById(
  id: number,
): Promise<DeleteSubscriptionPlanApiResponse> {
  const response = await api.delete<DeleteSubscriptionPlanApiResponse>(
    `/admin/subscription-plans/${id}`,
  );

  return response.data;
}

export function getSubscriptionPlansErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return (
      err.response?.data?.message ??
      "Failed to process subscription plans request."
    );
  }

  return "Failed to process subscription plans request.";
}
