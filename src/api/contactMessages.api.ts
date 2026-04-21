import type { ContactMessage } from "@/types/contactMessages.types";

import api from "@/lib/axios";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    totalPages?: number;
  };
}

export interface GetContactMessagesParams {
  page: number;
  limit: number;
  search?: string;
  signal?: AbortSignal;
}

export async function getContactMessages(
  pageOrParams: number | GetContactMessagesParams,
  limit?: number,
): Promise<PaginatedApiResponse<ContactMessage>> {
  const request: GetContactMessagesParams =
    typeof pageOrParams === "number"
      ? { page: pageOrParams, limit: limit ?? 10 }
      : pageOrParams;

  const params: Record<string, number | string> = {
    page: request.page,
    limit: request.limit,
  };

  if (request.search?.trim()) {
    params.search = request.search.trim();
  }

  const response = await api.get<PaginatedApiResponse<ContactMessage>>(
    "/contact/contact-messages",
    { params, signal: request.signal },
  );

  return response.data;
}

export async function getContactMessageById(
  id: number,
): Promise<ApiResponse<ContactMessage>> {
  const response = await api.get<ApiResponse<ContactMessage>>(
    `/contact/contact-messages/${id}`,
  );

  return response.data;
}

export async function deleteContactMessageById(
  id: number,
): Promise<ApiResponse<{ contact_message_id: number }>> {
  const response = await api.delete<ApiResponse<{ contact_message_id: number }>>(
    `/contact/contact-messages/${id}`,
  );

  return response.data;
}

export function getContactMessagesErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to load contact messages.";
}

export function isContactMessagesRequestCancelled(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ERR_CANCELED",
  );
}