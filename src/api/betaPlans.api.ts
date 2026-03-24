import type { BetaPlansApiResponse, BetaPlan } from "@/types/betaPlans.types";

import api from "@/lib/axios";

interface DeleteBetaPlanApiResponse {
  success: boolean;
  message: string;
}

/* Get all beta plans */
export async function getBetaPlans(): Promise<BetaPlansApiResponse> {
  const response = await api.get<BetaPlansApiResponse>(`/beta`);

  return response.data;
}

/* Get beta plan by ID — find from list */
export async function getBetaPlanById(id: number): Promise<BetaPlan> {
  const response = await api.get<BetaPlansApiResponse>(`/beta`);
  const found = response.data.data.find((item) => item.beta_claim_id === id);

  if (!found) throw new Error("Beta plan not found");

  return found;
}

/* Delete beta plan by ID */
export async function deleteBetaPlanById(
  id: number,
): Promise<DeleteBetaPlanApiResponse> {
  const response = await api.delete<DeleteBetaPlanApiResponse>(`/beta/${id}`);

  return response.data;
}

/* Error handler */
export function getBetaPlansErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const err = error as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };

    if (err.response?.status === 404)
      return "Beta plans endpoint not found. Please check the API configuration.";
    if (err.response?.data?.message) return err.response.data.message;
    if (err.message) return err.message;
  }

  return "Failed to load beta plans.";
}
