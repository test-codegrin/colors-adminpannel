import api from "@/lib/axios";
import type {
  ContactMessagesApiResponse,
  ContactMessage,
} from "@/types/contactMessages.types";

/* Get all messages */
export async function getContactMessages(
  page: number,
  limit: number
): Promise<ContactMessagesApiResponse> {
  const response = await api.get<ContactMessagesApiResponse>(
    `/contact/contact-messages`,
    {
      params: { page, limit },
    }
  );

  return response.data;
}

/* Get message by ID */
export async function getContactMessageById(
  id: number
): Promise<ContactMessage> {
  const response = await api.get<{ success: boolean; data: ContactMessage }>(
    `/contact/contact-messages/${id}`
  );

  return response.data.data;
}

/* Error handler */
export function getContactMessagesErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load contact messages.";
  }

  return "Failed to load contact messages.";
}