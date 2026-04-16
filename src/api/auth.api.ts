import type {
  LoginRequest,
  LoginResponse,
  OtpResponse,
} from "@/types/auth.types";

import api from "@/lib/axios";

const FALLBACK_ERROR = "Login failed. Please try again.";

export async function loginAdmin(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/admin/auth/login", data);

  return response.data;
}

export async function sendAdminLoginOtp(email: string): Promise<OtpResponse> {
  const response = await api.post<OtpResponse>("/admin/auth/send-otp", {
    email,
  });

  return response.data;
}

export function getLoginErrorMessage(error: unknown): string {
  console.error(error);
  return FALLBACK_ERROR;
}
