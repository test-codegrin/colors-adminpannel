import type { GetUsersParams, UpdateUserPayload, User } from "@/types/user.types";

import api from "@/lib/axios";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface UserByIdResponse {
  success: boolean;
  user: User;
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

interface UsersListResponse {
  success: boolean;
  total: number;
  totalUsers: number;
  currentPage: number;
  totalPages: number;
  pagination: {
    total: number;
    page: number;
    limit: number;
    total_pages: number;
    totalPages?: number;
  };
  users: User[];
}

export async function getUsers(
  pageOrParams: number | GetUsersParams,
  limit?: number,
): Promise<PaginatedApiResponse<User>> {
  const request =
    typeof pageOrParams === "number"
      ? { page: pageOrParams, limit: limit ?? 50 }
      : pageOrParams;

  const params: Record<string, number | string> = {
    page: request.page,
    limit: request.limit,
  };

  if (request.search?.trim()) params.search = request.search.trim();
  if (request.is_paid !== undefined) params.is_paid = request.is_paid;
  if (request.status) params.status = request.status;
  if (request.start_date) params.start_date = request.start_date;
  if (request.end_date) params.end_date = request.end_date;

  const response = await api.get<UsersListResponse>("/admin/users", {
    params,
    signal: request.signal,
  });

  return {
    success: response.data.success,
    message: "",
    data: response.data.users,
    pagination: response.data.pagination,
  };
}

export async function getUserById(userId: number): Promise<ApiResponse<User>> {
  const response = await api.get<UserByIdResponse>(`/admin/users/${userId}`);

  return {
    success: response.data.success,
    data: response.data.user,
    message: response.data.message,
  };
}

export async function deleteUserById(
  userId: number,
): Promise<ApiResponse<{ user_id: number }>> {
  const response = await api.delete<ApiResponse<{ user_id: number }>>(
    `/admin/users/${userId}`,
  );

  return response.data;
}

export async function updateUserById(
  userId: number,
  payload: UpdateUserPayload,
): Promise<ApiResponse<User>> {
  const response = await api.patch<ApiResponse<User>>(
    `/admin/users/${userId}`,
    payload,
  );

  return response.data;
}

export function getUsersErrorMessage(error: unknown): string {
  console.error(error);
  return "Failed to load users.";
}

export function isUsersRequestCancelled(error: unknown): boolean {
  return Boolean(
    typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ERR_CANCELED",
  );
}
