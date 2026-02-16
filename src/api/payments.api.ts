import api from "@/lib/axios";
import type {
  PaymentsApiRawResponse,
  PaymentsApiResponse,
} from "@/types/payment.types";

/* ---------------- Normalize ---------------- */

function normalizePaymentsResponse(
  payload: PaymentsApiRawResponse,
): PaymentsApiResponse {
  const paymentsValue =
    Array.isArray(payload)
      ? payload
      : payload.payments ??
        (Array.isArray(payload.data)
          ? payload.data
          : payload.data?.payments) ??
        [];

  return {
    payments: Array.isArray(paymentsValue) ? paymentsValue : [],
  };
}

/* ---------------- Get All Payments ---------------- */

export async function getAllPayments(page: number, limit: number): Promise<PaymentsApiResponse> {
  const response = await api.get<PaymentsApiRawResponse>(
    `/payments/all?page=${page}&limit=${limit}`,
  );

  return normalizePaymentsResponse(response.data);
}

/* ---------------- Error Handler ---------------- */

export function getPaymentsErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message ?? "Failed to load payments.";
  }

  return "Failed to load payments.";
}
