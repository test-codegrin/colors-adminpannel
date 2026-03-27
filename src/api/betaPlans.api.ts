import type { BetaPlansApiResponse, BetaPlan } from "@/types/betaPlans.types";

import { AxiosError } from "axios";

import { deleteWithFallback, getWithFallback } from "@/lib/requestFallback";

interface DeleteBetaPlanApiResponse {
  success: boolean;
  message: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBetaPlan(value: unknown): value is BetaPlan {
  return isRecord(value) && typeof value.beta_claim_id === "number";
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function getBetaEndpointCandidates(id?: number): string[] {
  const suffix = typeof id === "number" ? `/${id}` : "";

  return [
    `/beta${suffix}`,
    `/admin/beta${suffix}`,
    `/admin/beta-plans${suffix}`,
  ];
}

function extractBetaPlans(raw: unknown): BetaPlan[] {
  if (Array.isArray(raw)) {
    return raw as BetaPlan[];
  }

  if (!isRecord(raw)) {
    return [];
  }

  if (Array.isArray(raw.data)) {
    return raw.data as BetaPlan[];
  }

  if (Array.isArray(raw.betaPlans)) {
    return raw.betaPlans as BetaPlan[];
  }

  if (Array.isArray(raw.plans)) {
    return raw.plans as BetaPlan[];
  }

  if (isRecord(raw.data)) {
    if (Array.isArray(raw.data.betaPlans)) {
      return raw.data.betaPlans as BetaPlan[];
    }

    if (Array.isArray(raw.data.plans)) {
      return raw.data.plans as BetaPlan[];
    }

    if (Array.isArray(raw.data.items)) {
      return raw.data.items as BetaPlan[];
    }
  }

  return [];
}

function extractSingleBetaPlan(raw: unknown): BetaPlan | null {
  if (!isRecord(raw)) {
    return null;
  }

  if (isRecord(raw.data)) {
    if (isBetaPlan(raw.data.betaPlan)) {
      return raw.data.betaPlan;
    }

    if (isBetaPlan(raw.data.plan)) {
      return raw.data.plan;
    }

    if (isBetaPlan(raw.data)) {
      return raw.data;
    }
  }

  if (isBetaPlan(raw.betaPlan)) {
    return raw.betaPlan;
  }

  if (isBetaPlan(raw.plan)) {
    return raw.plan;
  }

  if (isBetaPlan(raw)) {
    return raw;
  }

  return null;
}

export async function getBetaPlans(): Promise<BetaPlansApiResponse> {
  const response = await getWithFallback<unknown>(getBetaEndpointCandidates());
  const data = extractBetaPlans(response.data);

  return {
    success: !isRecord(response.data) || response.data.success !== false,
    count: toNonNegativeInteger(
      isRecord(response.data)
        ? response.data.count ??
            (isRecord(response.data.data) ? response.data.data.count : undefined)
        : undefined,
      data.length,
    ),
    data,
  };
}

export async function getBetaPlanById(id: number): Promise<BetaPlan> {
  try {
    const response = await getWithFallback<unknown>(getBetaEndpointCandidates(id));
    const directMatch = extractSingleBetaPlan(response.data);

    if (directMatch) {
      return directMatch;
    }
  } catch (error) {
    if (!(error instanceof AxiosError) || error.response?.status !== 404) {
      throw error;
    }
  }

  const response = await getWithFallback<unknown>(getBetaEndpointCandidates());
  const found = extractBetaPlans(response.data).find(
    (item) => item.beta_claim_id === id,
  );

  if (!found) {
    throw new Error("Beta plan not found");
  }

  return found;
}

export async function deleteBetaPlanById(
  id: number,
): Promise<DeleteBetaPlanApiResponse> {
  const response = await deleteWithFallback<DeleteBetaPlanApiResponse>(
    getBetaEndpointCandidates(id),
  );

  return response.data;
}

export function getBetaPlansErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const err = error as {
      response?: { status?: number; data?: { message?: string } };
      message?: string;
    };

    if (err.response?.status === 404) {
      return "Beta plans endpoint not found. Please check the API configuration.";
    }

    if (err.response?.data?.message) {
      return err.response.data.message;
    }

    if (err.message) {
      return err.message;
    }
  }

  return "Failed to load beta plans.";
}
