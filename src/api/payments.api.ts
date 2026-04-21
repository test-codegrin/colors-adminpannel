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

export interface GetPaymentParams {
  page: number;
  limit: number;
  search?: string;
  signal?: AbortSignal;
}

export async function getAllPayments(
  pageOrParams: number | GetPaymentParams,
  limit?: number,
): Promise<PaginatedApiResponse<Payment>> {
  const request: GetPaymentParams =
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

  const response = await api.get<PaginatedApiResponse<Payment>>(
    "/payments/all",
    {
      params,
      signal: request.signal,
    },
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
