import api from "@/lib/axios";
import type { LoginRequest, LoginResponse, OtpResponse } from "@/types/auth.types";

const FALLBACK_ERROR = "Login failed. Please try again.";

export async function loginAdmin(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/admin/auth/login", data);

  return response.data;
}

export async function sendAdminLoginOtp(email: string): Promise<OtpResponse> {
  const response = await api.post<OtpResponse>("/admin/auth/send-otp", { email });

  return response.data;
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
