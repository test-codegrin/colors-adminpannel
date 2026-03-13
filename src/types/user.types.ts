import type { PaginationPayload } from "./pagination.types";

export interface User {
  user_id?: number | string;
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  is_paid?: boolean;
  picture?: string;
  google_id?: string | null;
  created_at?: string;
  [key: string]: unknown;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  mobile?: string;
  picture?: string;
  is_paid?: boolean;
  password?: string;
}

export interface UsersApiResponse {
  users: User[];
  total?: number;
  totalPages?: number;
  pagination?: PaginationPayload;
}

export interface UsersApiRawResponse {
  users?: User[];
  data?:
    | User[]
    | {
        users?: User[];
        total?: number;
        totalPages?: number;
      };
  total?: number;
  totalPages?: number;
  message?: string;
}
