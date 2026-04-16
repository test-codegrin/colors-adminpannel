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

export async function getContactMessages(
  page: number,
  limit: number,
): Promise<PaginatedApiResponse<ContactMessage>> {
  const response = await api.get<PaginatedApiResponse<ContactMessage>>(
    "/contact/contact-messages",
    { params: { page, limit } },
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
