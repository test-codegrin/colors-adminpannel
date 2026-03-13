import api from "@/lib/axios";
import type { UpdateUserPayload, User, UsersApiResponse } from "@/types/user.types";

interface UserByIdApiResponse {
  success?: boolean;
  user?: User;
}

interface DeleteUserApiResponse {
  success: boolean;
  message: string;
  user_id: number;
}

interface UpdateUserApiResponse {
  success: boolean;
  message: string;
  user: User;
}

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
  const response = await api.get<User | UserByIdApiResponse>(
    `/admin/users/${userId}`,
  );

  const data = response.data;

  if (
    typeof data === "object" &&
    data !== null &&
    "user" in data &&
    typeof (data as UserByIdApiResponse).user === "object" &&
    (data as UserByIdApiResponse).user !== null
  ) {
    return (data as UserByIdApiResponse).user as User;
  }

  return data as User;
}

export async function deleteUserById(
  userId: number,
): Promise<DeleteUserApiResponse> {
  const response = await api.delete<DeleteUserApiResponse>(`/admin/users/${userId}`);

  return response.data;
}

export async function updateUserById(
  userId: number,
  payload: UpdateUserPayload,
): Promise<UpdateUserApiResponse> {
  const response = await api.patch<UpdateUserApiResponse>(`/admin/users/${userId}`, payload);

  return response.data;
}

export function getUsersErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load users.";
  }

  return "Failed to load users.";
}


