import type {
  ContactMessagesApiResponse,
  ContactMessage,
} from "@/types/contactMessages.types";

import api from "@/lib/axios";

interface DeleteContactMessageApiResponse {
  success: boolean;
  message: string;
  contact_message_id: number;
}

/* Get all messages */
export async function getContactMessages(
  page: number,
  limit: number,
): Promise<ContactMessagesApiResponse> {
  const response = await api.get<ContactMessagesApiResponse>(
    `/contact/contact-messages`,
    {
      params: { page, limit },
    },
  );

  return response.data;
}

/* Get message by ID */
export async function getContactMessageById(
  id: number,
): Promise<ContactMessage> {
  const response = await api.get<{ success: boolean; data: ContactMessage }>(
    `/contact/contact-messages/${id}`,
  );

  return response.data.data;
}

/* Delete message by ID */
export async function deleteContactMessageById(
  id: number,
): Promise<DeleteContactMessageApiResponse> {
  const response = await api.delete<DeleteContactMessageApiResponse>(
    `/contact/contact-messages/${id}`,
  );

  return response.data;
}

/* Error handler */
export function getContactMessagesErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load contact messages.";
  }

  return "Failed to load contact messages.";
}
