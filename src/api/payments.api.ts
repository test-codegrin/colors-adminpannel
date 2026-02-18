import api from "@/lib/axios";
import type { PaymentsApiResponse } from "@/types/payment.types";


export async function getAllPayments(
  page: number,
  limit: number,
): Promise<PaymentsApiResponse> {
  const response = await api.get<PaymentsApiResponse>(
    `/payments/all?page=${page}&limit=${limit}`,
  );

  return response.data;
}

export function getPaymentsErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };
    return err.response?.data?.message ?? "Failed to load payments.";
  }

  return "Failed to load payments.";
}



// NEW: Get receipt URL for a payment
export async function getPaymentReceipt(
  paymentId: number
): Promise<{ receipt_url: string }> {
  const response = await api.get<{ receipt_url: string }>(
    `/payments/${paymentId}/receipt`
  );

  return response.data;
}