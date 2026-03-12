export interface ContactMessage {
  contact_message_id: number;
  name: string;
  email: string;
  subject: string;
  description: string;
  created_at: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ContactMessagesApiResponse {
  success: boolean;
  data: ContactMessage[];
  pagination: Pagination;
}