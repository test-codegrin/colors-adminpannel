import type {
  GetUsersParams,
  UpdateUserPayload,
  User,
  UsersApiResponse,
  UsersApiRawPagination,
  UsersApiRawResponse,
} from "@/types/user.types";

import api from "@/lib/axios";

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

function normalizePublicAssetPath(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.startsWith("/public/") ? trimmed.slice("/public".length) : trimmed;
}

function normalizeUser(user: User): User {
  return {
    ...user,
    picture: normalizePublicAssetPath(user.picture),
  };
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function toNonNegativeInteger(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "string" && value.trim() !== "" ? Number(value) : value;

  if (typeof parsed === "number" && Number.isFinite(parsed) && parsed >= 0) {
    return Math.floor(parsed);
  }

  return fallback;
}

function getNestedUsersPayload(data: UsersApiRawResponse) {
  if (
    typeof data.data === "object" &&
    data.data !== null &&
    !Array.isArray(data.data)
  ) {
    return data.data;
  }

  return null;
}

function normalizeUsersResponse(
  data: UsersApiRawResponse,
  requestedPage: number,
  requestedLimit: number,
): UsersApiResponse {
  const nestedPayload = getNestedUsersPayload(data);
  const pagination: UsersApiRawPagination | undefined =
    nestedPayload?.pagination ?? data.pagination;

  const users = Array.isArray(data.users)
    ? data.users
    : Array.isArray(data.data)
      ? data.data
      : Array.isArray(nestedPayload?.users)
        ? nestedPayload.users
        : [];

  const total = toNonNegativeInteger(
    data.total ??
      data.totalUsers ??
      nestedPayload?.total ??
      nestedPayload?.totalUsers ??
      pagination?.total,
    users.length,
  );
  const limit = toPositiveInteger(pagination?.limit, requestedLimit);
  const currentPage = toPositiveInteger(
    data.currentPage ??
      data.current_page ??
      data.page ??
      nestedPayload?.currentPage ??
      nestedPayload?.current_page ??
      nestedPayload?.page ??
      pagination?.page,
    requestedPage,
  );
  const totalPages = toPositiveInteger(
    data.totalPages ??
      data.total_pages ??
      nestedPayload?.totalPages ??
      nestedPayload?.total_pages ??
      pagination?.totalPages ??
      pagination?.total_pages,
    Math.max(Math.ceil(total / limit), 1),
  );

  return {
    users: users.map((user) => normalizeUser(user)),
    total,
    currentPage,
    totalPages,
    pagination: {
      total,
      page: currentPage,
      limit,
      total_pages: totalPages,
      totalPages,
    },
  };
}

export async function getUsers(
  pageOrParams: number | GetUsersParams,
  limit?: number,
): Promise<UsersApiResponse> {
  const request =
    typeof pageOrParams === "number"
      ? {
          page: pageOrParams,
          limit: limit ?? 50,
        }
      : pageOrParams;

  const queryParams: Record<string, number | string> = {
    page: request.page,
    limit: request.limit,
  };

  if (request.search?.trim()) {
    queryParams.search = request.search.trim();
  }

  if (typeof request.is_paid === "number") {
    queryParams.is_paid = request.is_paid;
  }

  if (request.status) {
    queryParams.status = request.status;
  }

  if (request.start_date) {
    queryParams.start_date = request.start_date;
  }

  if (request.end_date) {
    queryParams.end_date = request.end_date;
  }

  const response = await api.get<UsersApiRawResponse>("/admin/users", {
    params: queryParams,
    signal: request.signal,
  });

  // console.log("Raw API response:", response.data);

  return normalizeUsersResponse(response.data, request.page, request.limit);
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
    return normalizeUser((data as UserByIdApiResponse).user as User);
  }

  return normalizeUser(data as User);
}

export async function deleteUserById(
  userId: number,
): Promise<DeleteUserApiResponse> {
  const response = await api.delete<DeleteUserApiResponse>(
    `/admin/users/${userId}`,
  );

  return response.data;
}

export async function updateUserById(
  userId: number,
  payload: UpdateUserPayload,
): Promise<UpdateUserApiResponse> {
  const response = await api.patch<UpdateUserApiResponse>(
    `/admin/users/${userId}`,
    payload,
  );

  return {
    ...response.data,
    user: normalizeUser(response.data.user),
  };
}

export function getUsersErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? "Failed to load users.";
  }

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
