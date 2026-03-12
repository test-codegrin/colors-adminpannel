import type { PaginationPayload } from "./pagination.types";

export interface User {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  mobile?: string;
  is_paid?: boolean;
  picture?: string;
  created_at?: string;
  [key: string]: unknown;
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
