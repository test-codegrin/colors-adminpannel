export interface Admin {
  id?: string;
  name?: string;
  email: string;
  [key: string]: unknown;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  admin: Admin;
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
