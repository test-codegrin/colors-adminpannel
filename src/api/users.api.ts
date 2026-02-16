import api from "@/lib/axios";
import type {
  User,
  UsersApiRawResponse,
  UsersApiResponse,
} from "@/types/user.types";

function normalizeUsersResponse(payload: UsersApiRawResponse): UsersApiResponse {
  const usersValue =
    payload.users ??
    (Array.isArray(payload.data) ? payload.data : payload.data?.users) ??
    [];
  const users: User[] = Array.isArray(usersValue) ? usersValue : [];

  const totalPages =
    payload.totalPages ??
    (Array.isArray(payload.data) ? undefined : payload.data?.totalPages);
  const total =
    payload.total ?? (Array.isArray(payload.data) ? undefined : payload.data?.total);

  return { users, total, totalPages };
}

export async function getUsers(
  page: number,
  limit: number,
): Promise<UsersApiResponse> {
  const response = await api.get<UsersApiRawResponse>(
    `/admin/users?page=${page}&limit=${limit}`,
  );

  return normalizeUsersResponse(response.data);
}

export function getUsersErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load users. Please try again.";
  }

  return "Failed to load users. Please try again.";
}
