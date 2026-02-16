import api from "@/lib/axios";
import type {
  LoginApiRawResponse,
  LoginRequest,
  LoginResponse,
} from "@/types/auth.types";

const FALLBACK_ERROR = "Login failed. Please try again.";

function normalizeLoginResponse(
  payload: LoginApiRawResponse,
  email: string,
): LoginResponse {
  const token =
    payload.token ??
    payload.accessToken ??
    payload.data?.token ??
    payload.data?.accessToken;
  const admin =
    payload.admin ??
    payload.user ??
    payload.data?.admin ??
    payload.data?.user ?? { email };

  if (!token) {
    throw new Error("Authentication token not found in response");
  }

  return { token, admin };
}

export async function loginAdmin(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginApiRawResponse>("/admin/auth/login", data);

  return normalizeLoginResponse(response.data, data.email);
}

export function getLoginErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null && "response" in error) {
    const err = error as { response?: { data?: { message?: string } } };

    return err.response?.data?.message ?? FALLBACK_ERROR;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return FALLBACK_ERROR;
}
