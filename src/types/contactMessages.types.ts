import type { PaginationPayload } from "./pagination.types";

export interface ContactMessage {
  contact_message_id: number;
  name: string;
  email: string;
  subject: string;
  description: string;
  created_at: string;
}

export interface ContactMessagesApiResponse {
  success: boolean;
  data: ContactMessage[];
  pagination: PaginationPayload;
}
