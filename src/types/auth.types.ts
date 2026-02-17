export interface Admin {
  id?: string;
  name?: string;
  email: string;
  [key: string]: unknown;
}

export interface LoginRequest {
  email: string;
  password?: string;
  otp?: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
}

export interface OtpResponse {
  success?: boolean;
  message: string;
}

export interface LoginApiRawResponse {
  token?: string;
  accessToken?: string;
  admin?: Admin;
  user?: Admin;
  data?: {
    token?: string;
    accessToken?: string;
    admin?: Admin;
    user?: Admin;
  };
  message?: string;
}

export interface AuthContextValue {
  admin: Admin | null;
  token: string;
  isAuthenticated: boolean;
  login: (payload: LoginResponse) => void;
  logout: () => void;
}


/* ================= USER DETAILS VIEW ================= */

export interface UserDetails {
  user_id: number;
  name: string;
  email: string;
  mobile: string;
  google_id: string | null;
  picture: string | null;
  is_paid: "0" | "1";
  created_at: string;
}

export interface UserDetailsApiResponse {
  success: boolean;
  user: UserDetails;
}
