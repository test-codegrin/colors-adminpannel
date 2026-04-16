import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SupportUser {
  name: string;
  email: string;
  mobile: string;
}

export interface SupportThread {
  threadId: number;
  status: number;
  createdAt: string;
  user: SupportUser;
  lastMessage: string;
  lastSenderType: "admin" | "user";
  unreadUserMessages: number;
}

export interface SupportMessage {
  senderType: "admin" | "user";
  message: string;
  createdAt: string;
}

export interface ThreadDetail {
  status: number;
  user: SupportUser;
  messages: SupportMessage[];
}

interface PaginatedThreadsResponse {
  success: boolean;
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: SupportThread[];
}

interface ThreadDetailResponse {
  success: boolean;
  data: ThreadDetail;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function getSupportThreads(
  page = 1,
  perPage = 20,
): Promise<PaginatedThreadsResponse> {
  const response = await api.get<PaginatedThreadsResponse>(
    "/admin/support-messages/threads",
    { params: { page, per_page: perPage } },
  );
  return response.data;
}

/** GET /admin/support-messages/threads/:threadId/messages */
export async function getThreadDetail(
  threadId: number,
): Promise<ThreadDetailResponse> {
  const response = await api.get<ThreadDetailResponse>(
    `/admin/support-messages/threads/${threadId}/messages`,
  );
  console.log(response.data);
  return response.data;
}

/** POST /admin/support-messages/threads/:threadId/reply */
export async function replyToThread(
  threadId: number,
  message: string,
): Promise<ApiResponse<SupportMessage>> {
  const response = await api.post<ApiResponse<SupportMessage>>(
    `/admin/support-messages/threads/${threadId}/reply`,
    { message },
  );
  return response.data;
}

/** PATCH /admin/support-messages/threads/:threadId/close */
export async function closeThread(
  threadId: number,
): Promise<ApiResponse<{ threadId: number; status: number }>> {
  const response = await api.patch<ApiResponse<{ threadId: number; status: number }>>(
    `/admin/support-messages/threads/${threadId}/close`,
  );
  return response.data;
}

export function getSupportErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to load support data.";
}