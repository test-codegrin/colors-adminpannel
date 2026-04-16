import type { Payment } from "@/types/payment.types";

import api from "@/lib/axios";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedApiResponse<T> {
  success: boolean;
  count: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    totalPages?: number;
  };
  payments: T[];
}

export async function getAllPayments(
  page: number,
  limit: number,
): Promise<PaginatedApiResponse<Payment>> {
  const response = await api.get<PaginatedApiResponse<Payment>>(
    "/payments/all",
    { params: { page, limit } },
  );

  return response.data;
}

export async function getPaymentReceipt(
  paymentId: number,
): Promise<ApiResponse<{ receipt_url: string }>> {
  const response = await api.get<ApiResponse<{ receipt_url: string }>>(
    `/payments/${paymentId}/receipt`,
  );

  return response.data;
}

export function getPaymentsErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to load payments.";
}
