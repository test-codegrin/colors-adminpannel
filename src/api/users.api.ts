import api from "@/lib/axios";
import type { User, UsersApiResponse } from "@/types/user.types";

export async function getUsers(
  page: number,
  limit: number,
): Promise<UsersApiResponse> {
  const response = await api.get<UsersApiResponse>(
    `/admin/users?page=${page}&limit=${limit}`,
  );

  return response.data;
}

export async function getUserById(userId: number): Promise<User> {
  const response = await api.get<User>(`/admin/users/${userId}`);

  return response.data;
}

export function getUsersErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load users.";
  }

  return "Failed to load users.";
}


