import type { PaymentsApiResponse } from "@/types/payment.types";

import { getWithFallback } from "@/lib/requestFallback";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function getPaymentsEndpointCandidates(): string[] {
  return ["/payments/all", "/admin/payments", "/admin/payments/all"];
}

function extractPayments(raw: unknown): PaymentsApiResponse["payments"] {
  if (Array.isArray(raw)) {
    return raw as PaymentsApiResponse["payments"];
  }

  if (!isRecord(raw)) {
    return [];
  }

  if (Array.isArray(raw.payments)) {
    return raw.payments as PaymentsApiResponse["payments"];
  }

  if (Array.isArray(raw.data)) {
    return raw.data as PaymentsApiResponse["payments"];
  }

  if (isRecord(raw.data)) {
    if (Array.isArray(raw.data.payments)) {
      return raw.data.payments as PaymentsApiResponse["payments"];
    }

    if (Array.isArray(raw.data.items)) {
      return raw.data.items as PaymentsApiResponse["payments"];
    }
  }

  return [];
}

function extractPagination(raw: unknown): Record<string, unknown> | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }

  if (isRecord(raw.pagination)) {
    return raw.pagination;
  }

  if (isRecord(raw.data) && isRecord(raw.data.pagination)) {
    return raw.data.pagination;
  }

  return undefined;
}

function normalizePaymentsResponse(
  raw: unknown,
  requestedPage: number,
  requestedLimit: number,
): PaymentsApiResponse {
  const payments = extractPayments(raw);
  const pagination = extractPagination(raw);
  const total = toNonNegativeInteger(
    isRecord(raw)
      ? raw.total ??
          (isRecord(raw.data) ? raw.data.total : undefined) ??
          pagination?.total
      : undefined,
    payments.length,
  );
  const limit = toPositiveInteger(pagination?.limit, requestedLimit);
  const totalPages = toPositiveInteger(
    pagination?.total_pages ??
      pagination?.totalPages ??
      (isRecord(raw)
        ? raw.totalPages ??
          raw.total_pages ??
          (isRecord(raw.data)
            ? raw.data.totalPages ?? raw.data.total_pages
            : undefined)
        : undefined),
    Math.max(Math.ceil(Math.max(total, payments.length) / limit), 1),
  );
  const page = toPositiveInteger(
    pagination?.page ??
      (isRecord(raw)
        ? raw.page ??
          raw.currentPage ??
          raw.current_page ??
          (isRecord(raw.data)
            ? raw.data.page ?? raw.data.currentPage ?? raw.data.current_page
            : undefined)
        : undefined),
    requestedPage,
  );

  return {
    payments,
    total,
    totalPages,
    pagination: {
      total,
      page,
      limit,
      total_pages: totalPages,
      totalPages,
    },
  };
}

function extractReceiptUrl(raw: unknown): string {
  if (!isRecord(raw)) {
    return "";
  }

  if (typeof raw.receipt_url === "string") {
    return raw.receipt_url;
  }

  if (isRecord(raw.data) && typeof raw.data.receipt_url === "string") {
    return raw.data.receipt_url;
  }

  return "";
}

export async function getAllPayments(
  page: number,
  limit: number,
): Promise<PaymentsApiResponse> {
  const response = await getWithFallback<unknown>(getPaymentsEndpointCandidates(), {
    params: { page, limit },
  });

  return normalizePaymentsResponse(response.data, page, limit);
}

export function getPaymentsErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load payments.";
  }

  return "Failed to load payments.";
}

export async function getPaymentReceipt(
  paymentId: number,
): Promise<{ receipt_url: string }> {
  const response = await getWithFallback<{ receipt_url?: string }>([
    `/payments/${paymentId}/receipt`,
    `/admin/payments/${paymentId}/receipt`,
  ]);

  return {
    receipt_url: extractReceiptUrl(response.data),
  };
}
